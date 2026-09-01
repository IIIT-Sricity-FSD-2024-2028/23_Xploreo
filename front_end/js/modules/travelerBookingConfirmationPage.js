import {
    formatBookingCurrency,
    formatBookingDate,
    getSelectedTravelerPackage,
    getTravelerBookingConfirmation,
    getTravelerBookingDraft
} from "../traveler/dashboard.js";
import { travelerData } from "../api/legacyData.js";

function buildPlanConfirmationFromId(planId) {
    try {
        // Try to find in travelerData.itineraries
        const basePlan = (travelerData.itineraries || []).find(p => p.id === planId || String(p.bookingId) === planId);

        // Also check tours localStorage for a confirmed record
        const allTours = JSON.parse(localStorage.getItem("tours") || "[]");
        const tourRecord = allTours.find(t => String(t.planId) === planId || String(t.bookingId) === planId || String(t.id) === planId);

        const plan = tourRecord || basePlan;
        if (!plan) return null;

        let days = plan.days;
        let nights = plan.nights;
        if (!days && plan.durationLabel) {
            const parts = plan.durationLabel.match(/(\d+)\s*Days?,\s*(\d+)\s*Nights?/i);
            if (parts) {
                days = Number(parts[1]);
                nights = Number(parts[2]);
            }
        }
        days = days || 7;
        nights = nights || (days - 1);

        const startDate = plan.startDate || plan.dateRange?.split(" - ")[0] || plan.dateTime?.split(" | ")[0] || new Date().toISOString().slice(0, 10);

        return {
            bookingId: plan.bookingId || plan.id || planId,
            confirmedAt: new Date().toISOString(),
            travelerCount: 2,
            totalPrice: plan.payments?.total || plan.amount || 0,
            packageData: {
                title: plan.title,
                destination: plan.location || plan.destination || "",
                departureDate: startDate,
                days,
                nights,
                pricePerPerson: Math.round((plan.payments?.total || plan.amount || 0) / 2),
                withFlight: true,
                mealsLine: "Breakfast included",
                perk: "Flexible itinerary customization"
            },
            assignedGuide: plan.assignedGuide || null
        };
    } catch (e) {
        return null;
    }
}

const CONFIRMED_BOOKING_KEY = "traveler_confirmed_booking";
const CONFIRMED_BOOKING_SESSION_KEY = "traveler_confirmed_booking_session";
const MY_TRIPS_FOCUS_KEY = "traveler_mytrips_focus";
const TRAVELER_HOME_PAGE = "./traveller_dashboard.html";
const PACKAGE_SEARCH_PAGE = "./traveller_package-search.html";

function reconcileBookingWithAssignment(booking, assignment) {
    if (!booking || !assignment) return;
    booking.backendStatus = assignment.status;
    booking.assignmentId = assignment.id;
    
    if (booking.assignedGuide) {
        if (assignment.status !== 'cancelled') {
            const oldGuidePrice = booking.assignedGuide.price || 0;
            const newGuidePrice = assignment.guidePricePerPerson || 0;
            booking.assignedGuide.name = assignment.guideName || booking.assignedGuide.name;
            booking.assignedGuide.price = newGuidePrice;
            
            const priceDiff = newGuidePrice - oldGuidePrice;
            if (priceDiff !== 0) {
                if (booking.packageData) {
                    booking.packageData.pricePerPerson = (booking.packageData.pricePerPerson || 0) + priceDiff;
                }
                booking.totalPrice = (booking.totalPrice || 0) + (priceDiff * (booking.travelerCount || 1));
            }
        }
    } else if (assignment.guideName && assignment.status !== 'cancelled' && assignment.status !== 'rejected_by_guide') {
        const newGuidePrice = assignment.guidePricePerPerson || 0;
        booking.assignedGuide = { name: assignment.guideName, price: newGuidePrice };
        if (booking.packageData) {
            booking.packageData.pricePerPerson = (booking.packageData.pricePerPerson || 0) + newGuidePrice;
        }
        booking.totalPrice = (booking.totalPrice || 0) + (newGuidePrice * (booking.travelerCount || 1));
    }
}

export async function renderTravelerBookingConfirmationPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let assignments = [];
    try {
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
        if (currentUser && currentUser.id) {
            const { fetchGuideAssignmentsByTraveller } = await import("../api/services.js");
            assignments = await fetchGuideAssignmentsByTraveller(currentUser.id);
        }
    } catch (e) {
        console.warn("Failed to fetch backend assignments", e);
    }

    // If coming from plan detail page via ?plan= param, show plan confirmation
    const urlPlanId = new URLSearchParams(window.location.search).get("plan");
    if (urlPlanId) {
        const planConfirmation = buildPlanConfirmationFromId(urlPlanId);
        if (planConfirmation) {
            const assignment = assignments.find(a => String(a.planId) === String(urlPlanId) || String(a.bookingId) === String(urlPlanId));
            if (assignment) {
                reconcileBookingWithAssignment(planConfirmation, assignment);
            }

            container.innerHTML = renderPackageConfirmation(planConfirmation);
            bindPackageConfirmationEvents(planConfirmation);
            return;
        }
    }

    const packageBooking = getTravelerBookingConfirmation() || getTravelerBookingDraft();
    if (packageBooking) {
        const assignment = assignments.find(a => String(a.planId) === String(packageBooking.bookingId) || String(a.bookingId) === String(packageBooking.bookingId));
        if (assignment) {
            reconcileBookingWithAssignment(packageBooking, assignment);
        }
        container.innerHTML = renderPackageConfirmation(packageBooking);
        bindPackageConfirmationEvents(packageBooking);
        return;
    }

    const booking = getConfirmedBooking();
    if (!booking) {
        container.innerHTML = `
            <main class="booking-confirmation-page">
                <div class="flight-detail-empty">
                    <h1>No booking found</h1>
                    <p>Complete a booking from the flight detail page first.</p>
                    <a class="flight-detail-back-link" href="./traveller_flight-search.html">Back to flight search</a>
                </div>
            </main>
        `;
        return;
    }

    container.innerHTML = `
        <main class="booking-confirmation-page">
            <section class="booking-confirmed-card">
                <div class="booking-confirmed-icon">✓</div>
                <h1>Booking Confirmed!</h1>
                <p>Your trip has been successfully booked</p>
                <div class="booking-meta-row">
                    <span>Booking ID: <strong>${booking.bookingId}</strong></span>
                    <span>Booked on: <strong>${formatBookedOn(booking.bookedOn)}</strong></span>
                </div>
            </section>

            <section class="booking-confirmed-layout">
                <div class="booking-confirmed-main">
                    <article class="booking-summary-card">
                        <h2>Booking Summary</h2>
                        <div class="booking-route-row">
                            <div>
                                <span>Flight Route</span>
                                <strong>${booking.fromLabel}</strong>
                                <small>${formatTravelDate(booking.departureDate)}</small>
                                <em>${booking.departureTime}</em>
                            </div>
                            <div class="booking-route-plane">✈</div>
                            <div class="align-right">
                                <span>&nbsp;</span>
                                <strong>${booking.toLabel}</strong>
                                <small>${formatArrivalDate(booking.departureDate, booking.duration)}</small>
                                <em>${booking.arrivalTime}</em>
                            </div>
                        </div>
                        <div class="booking-summary-divider"></div>
                        <div class="booking-summary-grid">
                            <div>
                                <span>Airline</span>
                                <strong>${booking.airline} (${booking.flightNumber})</strong>
                            </div>
                            <div>
                                <span>Duration</span>
                                <strong>${booking.duration}</strong>
                            </div>
                            <div>
                                <span>Passengers</span>
                                <strong>${booking.passengers}</strong>
                            </div>
                            <div>
                                <span>Class</span>
                                <strong>${booking.classType}</strong>
                            </div>
                        </div>
                    </article>
                </div>

                <aside class="booking-confirmed-side">
                    <article class="added-to-trips-card">
                        <div class="added-to-trips-head">
                            <div class="booking-confirmed-small-icon">✓</div>
                            <h2>Added to My Trips</h2>
                        </div>
                        <p>This booking is now available in your My Trips dashboard where you can manage all your upcoming adventures.</p>
                        <div class="mini-trip-card">
                            <div class="mini-trip-icon">✈</div>
                            <div>
                                <span>Flight</span>
                                <strong>${getRouteShortLabel(booking)}</strong>
                                <small>${formatTravelDate(booking.departureDate)}</small>
                            </div>
                        </div>
                        <button class="confirmation-primary-btn" id="view-my-trips-btn">View My Trips →</button>
                        <button class="confirmation-secondary-btn" id="continue-exploring-btn">Continue Exploring</button>
                    </article>

                    <article class="whats-next-card">
                        <h3>What's Next?</h3>
                        <ul>
                            ${booking.whatsNext.map(item => `<li>${item}</li>`).join("")}
                        </ul>
                    </article>
                </aside>
            </section>
        </main>
    `;

    bindConfirmationEvents();
}

function renderPackageConfirmation(booking) {
    const { packageData, travelerCount, bookingId, confirmedAt } = booking;
    const displayTotal = (packageData.pricePerPerson * travelerCount) + 14;
    
    const startDate = packageData.departureDate ? formatBookingDate(packageData.departureDate) : "Flexible dates";
    const endDate = packageData.departureDate
        ? formatBookingDate(addDays(packageData.departureDate, Math.max(1, Number(packageData.nights) || 1)))
        : "Flexible dates";

    const guideStatus = booking.backendStatus || 'pending_guide_confirm';
    let guideStatusHtml = '';
    if (guideStatus === 'confirmed') {
        guideStatusHtml = `<span style="background-color: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; margin-left: auto;">Confirmed</span>`;
    } else if (guideStatus === 'pending_guide_confirm') {
        guideStatusHtml = `<span style="background-color: #fef9c3; color: #854d0e; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; margin-left: auto;">Pending Guide</span>`;
    } else if (guideStatus === 'rejected_by_guide' || guideStatus === 'cancelled') {
        guideStatusHtml = `<span style="background-color: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; margin-left: auto;">Cancelled</span>`;
    }

    return `
        <main class="traveler-confirmation-page">
            <section class="traveler-confirmed-hero">
                <div class="traveler-confirmed-icon">${checkIcon()}</div>
                <h1>Booking Confirmed!</h1>
                <p>Your trip has been successfully booked</p>
                <div class="traveler-confirmed-meta">
                    <span>Booking ID: <strong>${escapeHtml(String(bookingId || ""))}</strong></span>
                    <span>Booked on: <strong>${escapeHtml(formatBookingDate(confirmedAt))}</strong></span>
                </div>
            </section>

            <section class="traveler-confirmation-layout">
                <div class="traveler-confirmation-main">
                    <article class="traveler-confirmation-card">
                        <div class="traveler-section-title">
                            <span class="traveler-section-icon">${pinIcon()}</span>
                            <h2>Booking Summary</h2>
                        </div>

                        <div class="traveler-booking-title-block">
                            <h3>${escapeHtml(packageData.title)}</h3>
                            <p>${pinIcon()} ${escapeHtml(getLocationLabel(packageData.destination))}</p>
                        </div>

                        <div class="traveler-date-strip">
                            <div>
                                <span>Start Date</span>
                                <strong>${escapeHtml(startDate)}</strong>
                            </div>
                            <div class="traveler-date-arrow">${arrowRightIcon()}</div>
                            <div class="traveler-date-end">
                                <span>End Date</span>
                                <strong>${escapeHtml(endDate)}</strong>
                            </div>
                        </div>

                        <div class="traveler-summary-grid">
                            <div>
                                <span>Duration</span>
                                <strong>${packageData.days} Days, ${packageData.nights} Nights</strong>
                            </div>
                            <div>
                                <span>Travelers</span>
                                <strong>${travelerCount} ${travelerCount === 1 ? "Adult" : "Adults"}</strong>
                            </div>
                            <div class="traveler-summary-grid-wide">
                                <span>Package Includes</span>
                                <strong>${escapeHtml(buildIncludesLine(packageData))}</strong>
                            </div>
                        </div>
                        </div>
                    </article>

                    ${booking.assignedGuide ? `
                    <article class="traveler-confirmation-card" style="margin-top: 24px;">
                        <div class="traveler-section-title" style="display: flex; align-items: center;">
                            <span class="traveler-section-icon">👨‍🌾</span>
                            <h2>Guide Selected</h2>
                            ${guideStatusHtml}
                        </div>
                        <div class="traveler-booking-title-block" style="padding-top: 10px; border-bottom: none;">
                            <p style="font-size: 15px; color: #1e293b; margin: 0; line-height: 1.5;">You have successfully booked a local expert guide for your trip.</p>
                            <div style="margin-top: 16px; display: flex; gap: 24px; align-items: center; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                <div>
                                    <span style="font-size: 13px; color: #64748b; display: block; margin-bottom: 4px;">Guide Name</span>
                                    <strong style="font-size: 16px; color: #0f172a;">${escapeHtml(booking.assignedGuide.name || 'Local Expert')}</strong>
                                </div>
                                <div>
                                    <span style="font-size: 13px; color: #64748b; display: block; margin-bottom: 4px;">Guide Fee (per traveler)</span>
                                    <strong style="font-size: 16px; color: #2563eb;">${formatBookingCurrency(booking.assignedGuide.price)}</strong>
                                </div>
                            </div>
                            ${guideStatus === 'confirmed' ? `
                            <div style="margin-top: 16px;">
                                <button id="leave-review-btn"
                                  data-guide-id="${booking.assignedGuide.id || booking.assignedGuide.guideId || ''}"
                                  data-guide-name="${escapeHtml(booking.assignedGuide.name || 'Local Expert')}"
                                  style="background:#f59e0b;color:#fff;border:none;border-radius:9px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px;">
                                  ⭐ Leave a Review
                                </button>
                            </div>` : ''}
                        </div>
                    </article>
                    ` : ''}

                    ${(booking.backendStatus === 'rejected_by_guide' || booking.backendStatus === 'cancelled') ? `
                    <article class="traveler-confirmation-card" style="margin-top: 24px; border-color: #fecaca; background: #fff5f5;">
                        <div style="font-size: 0.95rem; color: #dc2626;">
                            <div style="margin-bottom: 12px; font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 8px;">❌ Guide ${booking.backendStatus === 'cancelled' ? 'Cancelled' : 'Rejected'}</div>
                            <p style="margin-bottom: 16px; line-height: 1.5; color: #991b1b;">The guide you requested is unavailable for these dates. Please select another guide or proceed without a guide (you will be refunded the guide fee).</p>
                            <div style="display: flex; gap: 12px;">
                                <button class="traveler-primary-button" style="padding: 10px 20px; font-size: 14px;" id="package-rebook-guide-btn" data-rebook-guide="${booking.assignmentId || booking.bookingId}">Rebook Guide</button>
                                <button class="traveler-secondary-button" style="padding: 10px 20px; font-size: 14px; color: #dc2626; border-color: #dc2626;" id="package-cancel-guide-btn" data-cancel-guide="${booking.assignmentId || booking.bookingId}">No Guide (Refund)</button>
                            </div>
                        </div>
                    </article>
                    ` : ''}
                </div>

                <!-- Leave a Review Modal -->
                <div id="review-modal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:3000;align-items:center;justify-content:center;backdrop-filter:blur(2px);">
                  <div style="background:#fff;border-radius:18px;padding:32px;width:460px;max-width:95vw;box-shadow:0 24px 60px rgba(0,0,0,0.2);display:flex;flex-direction:column;gap:16px;">
                    <h3 style="margin:0;font-size:18px;font-weight:700;color:#1e293b;">⭐ Review your Guide</h3>
                    <p id="review-guide-label" style="margin:0;font-size:13px;color:#64748b;"></p>
                    <div>
                      <label style="font-size:14px;font-weight:500;color:#374151;display:block;margin-bottom:8px;">Rating</label>
                      <div id="review-stars" style="display:flex;gap:6px;font-size:32px;cursor:pointer;">
                        <span data-val="1" style="color:#d1d5db;">★</span>
                        <span data-val="2" style="color:#d1d5db;">★</span>
                        <span data-val="3" style="color:#d1d5db;">★</span>
                        <span data-val="4" style="color:#d1d5db;">★</span>
                        <span data-val="5" style="color:#d1d5db;">★</span>
                      </div>
                    </div>
                    <div>
                      <label style="font-size:14px;font-weight:500;color:#374151;display:block;margin-bottom:8px;">Your Comment</label>
                      <textarea id="review-comment" rows="4" placeholder="Share your experience with this guide…" style="width:100%;box-sizing:border-box;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;resize:vertical;outline:none;"></textarea>
                    </div>
                    <p id="review-modal-error" style="color:#dc2626;font-size:13px;margin:0;min-height:18px;"></p>
                    <div style="display:flex;gap:10px;justify-content:flex-end;">
                      <button id="review-cancel-btn" style="padding:9px 18px;border:1.5px solid #e2e8f0;border-radius:9px;background:#f1f5f9;color:#64748b;font-size:14px;font-weight:600;cursor:pointer;">Cancel</button>
                      <button id="review-submit-btn" style="padding:9px 18px;border:none;border-radius:9px;background:#f59e0b;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Submit Review</button>
                    </div>
                  </div>
                </div>
                <aside class="traveler-confirmation-sidebar">
                    <article class="traveler-side-panel traveler-side-panel-accent">
                        <div class="traveler-side-header">
                            <span class="traveler-side-check">${checkIcon()}</span>
                            <h3>Added to My Trips</h3>
                        </div>
                        <p>This booking is now available in your My Trips dashboard where you can manage all your upcoming adventures.</p>

                        <div class="traveler-mini-trip-card">
                            <div class="traveler-mini-trip-icon">${pinIcon()}</div>
                            <div>
                                <span>Holiday Package</span>
                                <strong>${escapeHtml(packageData.title)}</strong>
                                <p>${escapeHtml(startDate)}</p>
                            </div>
                        </div>

                        <button class="traveler-primary-button traveler-confirm-action" id="package-view-my-trips-btn">View My Trips</button>
                        <button class="traveler-secondary-button traveler-confirm-action" id="package-continue-exploring-btn">Continue Exploring</button>
                    </article>

                    <article class="traveler-side-panel">
                        <h3>Final Summary</h3>
                        <div class="traveler-side-stat">
                            <span>Traveler count</span>
                            <strong>${travelerCount}</strong>
                        </div>
                        <div class="traveler-side-stat">
                            <span>Price per traveler</span>
                            <strong>${formatBookingCurrency(packageData.pricePerPerson)}</strong>
                        </div>
                        <div class="traveler-side-stat">
                            <span>Platform Fee</span>
                            <strong>₹14</strong>
                        </div>
                        <div class="traveler-side-stat traveler-side-stat-total">
                            <span>Total price</span>
                            <strong>${formatBookingCurrency(displayTotal)}</strong>
                        </div>
                        <div class="traveler-perk-pill">${escapeHtml(packageData.perk)}</div>
                    </article>

                    <article class="traveler-side-panel">
                        <h3>What's Next?</h3>
                        <ul class="traveler-next-list">
                            <li>${checkLineIcon()} Confirmation email sent to your inbox</li>
                            <li>${checkLineIcon()} Booking details available in My Trips</li>
                            <li>${checkLineIcon()} Traveler details linked to this itinerary</li>
                        </ul>
                    </article>
                </aside>
            </section>
        </main>
    `;
}

function bindConfirmationEvents() {
    document.getElementById("view-my-trips-btn")?.addEventListener("click", () => {
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(MY_TRIPS_FOCUS_KEY, "Upcoming");
        }
        window.location.href = "./traveller_mytrips.html";
    });

    document.getElementById("continue-exploring-btn")?.addEventListener("click", () => {
        window.location.assign(TRAVELER_HOME_PAGE);
    });
}

function bindPackageConfirmationEvents(booking) {
    document.getElementById("package-view-my-trips-btn")?.addEventListener("click", () => {
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(MY_TRIPS_FOCUS_KEY, "Upcoming");
        }
        window.location.href = "./traveller_mytrips.html";
    });

    document.getElementById("package-continue-exploring-btn")?.addEventListener("click", () => {
        window.location.assign(PACKAGE_SEARCH_PAGE);
    });

    document.getElementById("package-cancel-guide-btn")?.addEventListener("click", async (e) => {
        if (!confirm("Are you sure you want to proceed without a guide? You will receive a partial refund for the guide fee.")) return;
        const btn = e.currentTarget;
        const bookingId = btn.getAttribute("data-cancel-guide");
        btn.disabled = true;
        btn.textContent = "Cancelling...";
        try {
            const { cancelGuideAssignment } = await import("../api/services.js");
            const mHtml = `<div id="tb-msg-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; font-family: 'Inter', sans-serif;">
              <div style="background: white; border-radius: 8px; width: 320px; padding: 24px; text-align: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                <div style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">Success</div>
                <div style="font-size: 14px; color: #4b5563; margin-bottom: 24px;">Guide cancelled successfully. Refund is being processed.</div>
                <button onclick="document.getElementById('tb-msg-modal').remove()" style="background: #2563eb; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-weight: 500; cursor: pointer; width: 100%;">OK</button>
              </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', mHtml);
            renderBookingSummary(plan);
        } catch (err) {
            console.error("Cancel guide error:", err);
            const eHtml = `<div id="tb-msg-modal-err" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; font-family: 'Inter', sans-serif;">
              <div style="background: white; border-radius: 8px; width: 320px; padding: 24px; text-align: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                <div style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">Error</div>
                <div style="font-size: 14px; color: #4b5563; margin-bottom: 24px;">Failed to cancel guide. Please try again.</div>
                <button onclick="document.getElementById('tb-msg-modal-err').remove()" style="background: #dc2626; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-weight: 500; cursor: pointer; width: 100%;">Close</button>
              </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', eHtml);
        }
        btn.disabled = false;
        btn.textContent = "No Guide (Refund)";
    });

    document.getElementById("package-rebook-guide-btn")?.addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        const bookingId = btn.getAttribute("data-rebook-guide");
        try {
            const plan = { id: booking?.packageData?.id || bookingId };
            const { showGuideSelectionPopup } = await import("./travelerBookingDetailsPage.js");
            const startDate = booking?.packageData?.departureDate || new Date().toISOString().slice(0, 10);
            
            showGuideSelectionPopup(plan, startDate, startDate, async (newGuide) => {
                if (newGuide) {
                    try {
                        const { changeGuideOnAssignment } = await import("../api/services.js");
                        await changeGuideOnAssignment(bookingId, {
                            newGuideId: newGuide.id,
                            newGuidePricePerPerson: newGuide.price
                        });
                        alert("Successfully rebooked with new guide!");
                        window.location.reload();
                    } catch (err) {
                        console.error(err);
                        alert(err.message || "Failed to rebook guide");
                    }
                }
            }, true, booking.travelerCount || 1);
        } catch (error) {
            console.error(error);
            alert("Failed to load guide selection.");
        }
    });

    // ── Leave a Review ──────────────────────────────────────
    const reviewBtn = document.getElementById("leave-review-btn");
    const reviewModal = document.getElementById("review-modal");
    const reviewCancelBtn = document.getElementById("review-cancel-btn");
    const reviewSubmitBtn = document.getElementById("review-submit-btn");
    const reviewStarsEl = document.getElementById("review-stars");
    const reviewCommentEl = document.getElementById("review-comment");
    const reviewError = document.getElementById("review-modal-error");
    const reviewGuideLabel = document.getElementById("review-guide-label");
    let selectedRating = 0;

    function setStars(val) {
        selectedRating = val;
        reviewStarsEl?.querySelectorAll("span").forEach((s) => {
            s.style.color = Number(s.dataset.val) <= val ? "#f59e0b" : "#d1d5db";
        });
    }

    reviewBtn?.addEventListener("click", () => {
        const guideName = reviewBtn.getAttribute("data-guide-name") || "your Guide";
        if (reviewGuideLabel) reviewGuideLabel.textContent = `Reviewing: ${guideName}`;
        selectedRating = 0;
        setStars(0);
        if (reviewCommentEl) reviewCommentEl.value = "";
        if (reviewError) reviewError.textContent = "";
        if (reviewModal) { reviewModal.style.display = "flex"; }
    });

    reviewStarsEl?.addEventListener("click", (e) => {
        const star = e.target.closest("span[data-val]");
        if (star) setStars(Number(star.dataset.val));
    });

    reviewCancelBtn?.addEventListener("click", () => {
        if (reviewModal) reviewModal.style.display = "none";
    });

    reviewSubmitBtn?.addEventListener("click", async () => {
        if (!selectedRating) {
            if (reviewError) reviewError.textContent = "Please select a star rating.";
            return;
        }
        const comment = reviewCommentEl?.value?.trim() || "";
        const guideId = reviewBtn?.getAttribute("data-guide-id") || "";
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
        reviewSubmitBtn.disabled = true;
        reviewSubmitBtn.textContent = "Submitting…";
        if (reviewError) reviewError.textContent = "";
        try {
            const { apiPost } = await import("../api/http.js");
            await apiPost("/reviews", {
                userId: currentUser?.id || currentUser?.userId,
                targetType: "guide",
                targetId: Number(guideId) || guideId,
                rating: selectedRating,
                comment
            });
            if (reviewModal) reviewModal.style.display = "none";
            // Show success toast
            const toast = document.createElement("div");
            toast.textContent = "✅ Review submitted! Thank you.";
            Object.assign(toast.style, { position:"fixed", bottom:"28px", right:"28px", background:"#16a34a", color:"#fff", padding:"14px 22px", borderRadius:"12px", fontWeight:"600", fontSize:"14px", zIndex:"9999", boxShadow:"0 8px 24px rgba(0,0,0,0.15)" });
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3500);
        } catch (err) {
            if (reviewError) reviewError.textContent = err?.message || "Failed to submit review. Try again.";
        } finally {
            reviewSubmitBtn.disabled = false;
            reviewSubmitBtn.textContent = "Submit Review";
        }
    });
}

function getConfirmedBooking() {
    if (typeof sessionStorage !== "undefined") {
        try {
            const sessionBooking = JSON.parse(sessionStorage.getItem(CONFIRMED_BOOKING_SESSION_KEY) || "null");
            if (sessionBooking) return sessionBooking;
        } catch (error) {
            console.warn("Unable to read confirmed booking from session storage", error);
        }
    }

    if (typeof localStorage === "undefined") return null;

    try {
        return JSON.parse(localStorage.getItem(CONFIRMED_BOOKING_KEY) || "null");
    } catch (error) {
        return null;
    }
}

function formatBookedOn(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

function formatTravelDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

function formatArrivalDate(dateString, duration) {
    const baseDate = new Date(dateString);
    const durationMatch = duration.match(/(\d+)h\s*(\d+)m/);
    const extraMinutes = durationMatch ? (Number(durationMatch[1]) * 60) + Number(durationMatch[2]) : 0;
    baseDate.setMinutes(baseDate.getMinutes() + extraMinutes);
    return baseDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

function getRouteShortLabel(booking) {
    const from = booking.fromLabel.split(" ")[0];
    const to = booking.toLabel.split(" ")[0];
    return `${from} → ${to}`;
}

function buildIncludesLine(packageData) {
    const items = [
        packageData.withFlight ? "Flights" : "Land Package",
        "Hotels",
        "Activities",
        packageData.mealsLine.toLowerCase().includes("breakfast") ? "Meals" : "Transfers"
    ];
    return items.join(", ");
}

function getLocationLabel(destination) {
    const map = {
        Goa: "Goa, Indonesia",
        Maldives: "Maldives",
        Mumbai: "Mumbai, UAE",
        Thailand: "Phuket & Krabi, Thailand",
        Switzerland: "Swiss Alps, Switzerland",
        Goa: "Goa, India",
        Singapore: "Singapore",
        Vietnam: "Hanoi & Halong Bay, Vietnam"
    };
    return map[destination] || destination;
}

function addDays(dateValue, days) {
    const date = new Date(dateValue);
    date.setDate(date.getDate() + days);
    return date.toISOString();
}

function pinIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
}

function checkIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.5 2.5L16.5 8.5"></path></svg>`;
}

function checkLineIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 4 4L19 6"></path></svg>`;
}

function arrowRightIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"></path><path d="m13 5 7 7-7 7"></path></svg>`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
