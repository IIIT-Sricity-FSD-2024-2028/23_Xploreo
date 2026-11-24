import {
    formatBookingCurrency,
    formatBookingDate,
    getSelectedTravelerPackage,
    getTravelerBookingConfirmation,
    getTravelerBookingDraft
} from "../traveler/dashboard.js";
import { apiGetAndSync } from "../utils/api.js";

const travelerData = (() => { try { return JSON.parse(localStorage.getItem("travelerData") || "{}"); } catch { return {}; } })();

async function buildPlanConfirmationFromId(planId) {
    try {
        // Try to find in travelerData.itineraries
        const basePlan = (travelerData.itineraries || []).find(p => p.id === planId || String(p.bookingId) === planId);

        // Fetch trips from backend (also syncs cache)
        const allTours = await apiGetAndSync("/trips", "tours", []);
        const tourRecord = (Array.isArray(allTours) ? allTours : []).find(t => String(t.planId) === planId || String(t.bookingId) === planId || String(t.id) === planId);

        const plan = basePlan || tourRecord;
        if (!plan) return null;

        const startDate = plan.startDate || plan.dateTime?.split(" | ")[0] || new Date().toISOString().slice(0, 10);
        const days = plan.days || 7;
        const nights = plan.nights || (days - 1);

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
            }
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

export function renderTravelerBookingConfirmationPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // If coming from plan detail page via ?plan= param, show plan confirmation
    const urlPlanId = new URLSearchParams(window.location.search).get("plan");
    if (urlPlanId) {
        const planConfirmation = buildPlanConfirmationFromId(urlPlanId);
        if (planConfirmation) {
            container.innerHTML = renderPackageConfirmation(planConfirmation);
            bindPackageConfirmationEvents();
            return;
        }
    }

    const packageBooking = getTravelerBookingConfirmation() || getTravelerBookingDraft();
    if (packageBooking) {
        container.innerHTML = renderPackageConfirmation(packageBooking);
        bindPackageConfirmationEvents();
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
    const { packageData, travelerCount, totalPrice, bookingId, confirmedAt } = booking;
    const startDate = packageData.departureDate ? formatBookingDate(packageData.departureDate) : "Flexible dates";
    const endDate = packageData.departureDate
        ? formatBookingDate(addDays(packageData.departureDate, Math.max(1, Number(packageData.nights) || 1)))
        : "Flexible dates";

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
                    </article>
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
                        <div class="traveler-side-stat traveler-side-stat-total">
                            <span>Total price</span>
                            <strong>${formatBookingCurrency(totalPrice)}</strong>
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

function bindPackageConfirmationEvents() {
    document.getElementById("package-view-my-trips-btn")?.addEventListener("click", () => {
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(MY_TRIPS_FOCUS_KEY, "Upcoming");
        }
        window.location.href = "./traveller_mytrips.html";
    });

    document.getElementById("package-continue-exploring-btn")?.addEventListener("click", () => {
        window.location.assign(PACKAGE_SEARCH_PAGE);
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
        Bali: "Bali, Indonesia",
        Maldives: "Maldives",
        Dubai: "Dubai, UAE",
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
