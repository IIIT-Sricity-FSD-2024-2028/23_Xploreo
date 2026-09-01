import { travelerData } from "../api/legacyData.js";
import { fetchAvailableGuidesForPlan, createGuideAssignment, changeGuideOnAssignment, cancelGuideAssignment } from "../api/services.js";
import { getCurrentUser } from "../api/session.js";


const SELECTED_PLAN_KEY = "traveler_selected_plan";
const SELECTED_FLIGHT_KEY = "traveler_selected_flight";
const PLAN_SOURCE_KEY = "traveler_plan_source";
const FLIGHT_DETAIL_PAGE = "./traveller_flight-detail.html";
const DEFAULT_PLAN_IMAGE = "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=1200";

export function renderTravelerPlanDetailPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const selectedPlan = getSelectedPlan();
    if (!selectedPlan) {
        const backMeta = getBackLinkMeta();
        container.innerHTML = `
            <main class="plan-detail-page">
                <div class="plan-detail-shell">
                    <div class="plan-detail-empty">
                        <h1>No plan selected</h1>
                        <p>Choose an itinerary from the traveler dashboard to view its full details.</p>
                        <a class="plan-detail-back" href="${backMeta.href}">${arrowLeftIcon()} ${backMeta.label}</a>
                    </div>
                </div>
            </main>
        `;
        return;
    }

    const state = {
        plan: selectedPlan,
        activeTab: "overview",
        activeDayIndex: 0
    };

    renderState(container, state);
}

function renderState(container, state) {
    const { plan } = state;

    const backMeta = getBackLinkMeta();

    container.innerHTML = `
        <main class="plan-detail-page">
            <div class="plan-detail-shell">
                <a class="plan-detail-back" href="${backMeta.href}">${arrowLeftIcon()} ${backMeta.label}</a>

                <section class="plan-detail-header">
                    <div class="plan-detail-hero">
                        <div class="plan-detail-title-block">
                            <h1>${escapeHtml(plan.title)}</h1>
                            <div class="plan-detail-meta">
                                <div class="plan-detail-meta-card">
                                    <div class="plan-detail-meta-icon">${mapPinIcon()}</div>
                                    <div>
                                        <span>Destination</span>
                                        <strong>${escapeHtml(plan.location)}</strong>
                                        <small>${escapeHtml(plan.tags.join(", "))}</small>
                                    </div>
                                </div>
                                <div class="plan-detail-meta-card">
                                    <div class="plan-detail-meta-icon">${calendarIcon()}</div>
                                    <div>
                                        <span>Travel Dates</span>
                                        <strong>${formatLongDate(plan.startDate)} - ${formatLongDate(plan.endDate)}</strong>
                                        <small>${plan.days} days curated itinerary</small>
                                    </div>
                                </div>
                                <div class="plan-detail-meta-card">
                                    <div class="plan-detail-meta-icon">${documentIcon()}</div>
                                    <div>
                                        <span>Booking ID</span>
                                        <strong>${escapeHtml(plan.bookingId)}</strong>
                                        <small>${plan.type === "flight" ? "Flight reservation" : "Holiday package"}</small>
                                    </div>
                                </div>
                                <div class="plan-detail-meta-card">
                                    <div class="plan-detail-meta-icon">${starIcon()}</div>
                                    <div>
                                        <span>Traveler Score</span>
                                        <strong>${escapeHtml(plan.rating)} / 5</strong>
                                        <small>${escapeHtml(plan.travelers)} travelers · ${escapeHtml(plan.reviews)} reviews</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="plan-detail-actions">
                            <span class="plan-detail-status">${escapeHtml(plan.status)}</span>
                            <div class="plan-detail-action-row">
                                <button class="plan-detail-cta-btn" id="plan-detail-confirm-btn">Confirm Booking</button>
                                <button class="plan-detail-ghost-btn" data-top-action="support">${chatIcon()} Contact Support</button>
                                <button class="plan-detail-danger-btn" data-top-action="cancel">${xIcon()} Cancel Trip</button>
                            </div>
                        </div>
                    </div>

                    <div class="plan-detail-tabs">
                        ${renderTabButton("overview", state.activeTab, mapPinIcon(), "Overview")}
                        ${renderTabButton("itinerary", state.activeTab, calendarIcon(), "Itinerary")}
                        ${renderTabButton("bookings", state.activeTab, documentIcon(), "Bookings")}
                        ${renderTabButton("payments", state.activeTab, cardIcon(), "Payments")}
                        ${renderTabButton("support", state.activeTab, helpIcon(), "Support")}
                    </div>
                </section>

                <section class="plan-detail-content">
                    ${renderPanel(plan, state)}
                </section>
            </div>
        </main>
    `;

    bindEvents(container, state);
}

function renderTabButton(id, activeTab, icon, label) {
    return `
        <button class="plan-detail-tab ${activeTab === id ? "active" : ""}" data-trip-tab="${id}">
            ${icon}
            <span>${label}</span>
        </button>
    `;
}

function renderPanel(plan, state) {
    if (state.activeTab === "itinerary") {
        return renderItineraryPanel(plan, state.activeDayIndex);
    }

    if (state.activeTab === "bookings") {
        return renderBookingsPanel(plan);
    }

    if (state.activeTab === "payments") {
        return renderPaymentsPanel(plan);
    }

    if (state.activeTab === "support") {
        return renderSupportPanel(plan);
    }

    return renderOverviewPanel(plan);
}

function renderOverviewPanel(plan) {
    return `
        <div class="plan-detail-panel">
            <div class="plan-detail-grid">
                ${plan.overviewSections.map((section) => `
                    <article class="plan-detail-card">
                        <div class="plan-detail-card-header">
                            <div class="plan-detail-card-title">
                                <div class="plan-detail-card-icon ${section.kind}">${iconForKind(section.kind)}</div>
                                <div>
                                    <h2>${escapeHtml(section.title)}</h2>
                                </div>
                            </div>
                            <span class="plan-detail-badge">${escapeHtml(section.status)}</span>
                        </div>

                        <div class="plan-detail-info-list">
                            ${section.items.map((item) => `
                                <div class="plan-detail-info-item">
                                    <div class="plan-detail-info-label">${escapeHtml(item.label)}</div>
                                    <div class="plan-detail-info-value">${escapeHtml(item.value)}</div>
                                    ${item.subvalue ? `<div class="plan-detail-info-subvalue">${escapeHtml(item.subvalue)}</div>` : ""}
                                </div>
                            `).join("")}
                        </div>

                        ${section.ctaLabel ? `
                            <div class="plan-detail-card-footer">
                                <button class="plan-detail-link-btn" data-card-action="${escapeHtml(section.ctaAction || "")}" data-card-kind="${section.kind}">
                                    ${escapeHtml(section.ctaLabel)}
                                </button>
                            </div>
                        ` : ""}
                    </article>
                `).join("")}
            </div>
        </div>
    `;
}

function renderItineraryPanel(plan, activeDayIndex) {
    const activeDay = plan.itineraryDays[activeDayIndex] || plan.itineraryDays[0];

    return `
        <div class="plan-detail-panel">
            <article class="plan-detail-itinerary-shell">
                <aside class="plan-detail-day-rail">
                    <h3>Select Day</h3>
                    ${plan.itineraryDays.map((day, index) => `
                        <button class="plan-detail-day-option ${index === activeDayIndex ? "active" : ""}" data-itinerary-day="${index}">
                            ${escapeHtml(day.label)}
                            <small>${formatLongDate(day.date)}</small>
                        </button>
                    `).join("")}
                </aside>

                <div class="plan-detail-day-panel">
                    <div class="plan-detail-day-panel-header">
                        <h2>${escapeHtml(activeDay.label)} - ${formatLongDate(activeDay.date)}</h2>
                        <p>${escapeHtml(activeDay.summary)}</p>
                    </div>

                    ${activeDay.items.map((item) => `
                        <article class="plan-detail-day-event">
                            <div class="plan-detail-day-event-time">${escapeHtml(item.time)}</div>
                            <div class="plan-detail-day-event-copy">
                                <strong>${escapeHtml(item.title)}</strong>
                                <span>${escapeHtml(item.subtitle)}</span>
                                ${item.details ? `<small>${escapeHtml(item.details)}</small>` : ""}
                            </div>
                            <span class="plan-detail-badge">${escapeHtml(item.status || "Confirmed")}</span>
                        </article>
                    `).join("")}

                    <button class="plan-detail-add-activity" data-day-action="add-activity">+ Add Activity to ${escapeHtml(activeDay.label)}</button>
                </div>
            </article>
        </div>
    `;
}

function renderBookingsPanel(plan) {
    return `
        <div class="plan-detail-panel">
            ${plan.bookingGroups.map((group) => `
                <article class="plan-detail-booking-group">
                    <div class="plan-detail-card-header">
                        <div class="plan-detail-card-title">
                            <div class="plan-detail-card-icon ${group.kind}">${iconForKind(group.kind)}</div>
                            <div>
                                <h2>${escapeHtml(group.title)}</h2>
                            </div>
                        </div>
                    </div>

                    <div class="plan-detail-booking-list">
                        ${group.entries.map((entry) => `
                            <div class="plan-detail-booking-item">
                                <div class="plan-detail-booking-copy">
                                    <strong>${escapeHtml(entry.title)}</strong>
                                    <span>${escapeHtml(entry.subtitle)}</span>
                                    <small>Booking Ref: ${escapeHtml(entry.reference)}</small>
                                    ${entry.meta ? `<small>${escapeHtml(entry.meta)}</small>` : ""}
                                </div>
                                <div class="plan-detail-booking-actions">
                                    <button class="plan-detail-cta-btn ${group.kind}" data-booking-action="${escapeHtml(entry.primaryAction || "voucher")}" data-booking-label="${escapeHtml(entry.title)}" data-booking-ref="${escapeHtml(entry.reference)}" data-booking-group="${escapeHtml(group.title)}">
                                        ${escapeHtml(entry.primaryLabel || "View Voucher")}
                                    </button>
                                    <button class="plan-detail-outline-btn" data-booking-action="download" data-booking-label="${escapeHtml(entry.title)}" data-booking-ref="${escapeHtml(entry.reference)}" data-booking-group="${escapeHtml(group.title)}">
                                        Download PDF
                                    </button>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                </article>
            `).join("")}
        </div>
    `;
}

function renderPaymentsPanel(plan) {
    return `
        <div class="plan-detail-panel">
            <article class="plan-detail-payment-card">
                <h2>Payment Summary</h2>
                <div class="plan-detail-payment-summary">
                    <div class="plan-detail-amount-card total">
                        <span>Total Amount</span>
                        <strong>${formatCurrency(plan.payments.total + 14)}</strong>
                    </div>
                    <div class="plan-detail-amount-card paid">
                        <span>Paid Amount</span>
                        <strong>${formatCurrency(plan.payments.paid + 14)}</strong>
                    </div>
                    <div class="plan-detail-amount-card pending">
                        <span>Pending Amount</span>
                        <strong>${formatCurrency(plan.payments.pending)}</strong>
                    </div>
                </div>

                <div class="plan-detail-breakdown">
                    ${plan.payments.breakdown.map((row) => `
                        <div class="plan-detail-breakdown-row ${row.emphasis ? "total" : ""}">
                            <span>${escapeHtml(row.label)}</span>
                            <strong>${formatCurrency(row.emphasis ? row.amount + 14 : row.amount)}</strong>
                        </div>
                    `).join("")}
                    <div class="plan-detail-breakdown-row">
                        <span style="color: #4B5563; font-weight: 500;">Platform Fee</span>
                        <strong style="color: #4B5563;">₹14</strong>
                    </div>
                </div>
                <div style="margin-top: 16px; padding: 12px; border-radius: 8px; background: #F3F4F6;">
                    <p style="font-size: 13px; color: #6B7280; text-align: center; margin: 0;">Note: If cancelled, Platform Fee and Taxes won't be repaid.</p>
                </div>
            </article>

            <article class="plan-detail-payment-card">
                <h2>Payment History</h2>
                <div class="plan-detail-payment-history">
                    ${plan.payments.history.map((item) => `
                        <div class="plan-detail-payment-history-item">
                            <div class="plan-detail-payment-history-copy">
                                <strong>${escapeHtml(item.title)}</strong>
                                <span>${formatLongDate(item.date)}</span>
                            </div>
                            <div class="plan-detail-payment-history-copy" style="text-align:right;">
                                <strong>${formatCurrency(item.amount)}</strong>
                                <span>${escapeHtml(item.status)}</span>
                            </div>
                        </div>
                    `).join("")}
                </div>

                <div class="plan-detail-card-footer">
                    <button class="plan-detail-outline-btn" data-payment-action="download-all">Download All Invoices</button>
                </div>
            </article>
        </div>
    `;
}

function renderSupportPanel(plan) {
    return `
        <div class="plan-detail-panel">
            <div class="plan-detail-support-grid">
                ${plan.support.cards.map((card) => `
                    <article class="plan-detail-support-card">
                        <div class="plan-detail-card-title">
                            <div class="plan-detail-card-icon support">${iconForSupport(card.icon)}</div>
                            <div class="plan-detail-support-copy">
                                <h2>${escapeHtml(card.title)}</h2>
                                <p>${escapeHtml(card.text)}</p>
                            </div>
                        </div>
                    </article>
                `).join("")}
            </div>

            <article class="plan-detail-section-card">
                <h2>Contact Information</h2>
                <div class="plan-detail-contact-list" style="margin-top: 24px;">
                    <div class="plan-detail-contact-item">
                        <div class="plan-detail-card-icon support">${phoneIcon()}</div>
                        <div>
                            <span>Phone Support</span>
                            <strong>${escapeHtml(plan.support.phone)}</strong>
                        </div>
                    </div>
                    <div class="plan-detail-contact-item">
                        <div class="plan-detail-card-icon support">${mailIcon()}</div>
                        <div>
                            <span>Email Support</span>
                            <strong>${escapeHtml(plan.support.email)}</strong>
                        </div>
                    </div>
                </div>
            </article>

            <article class="plan-detail-faq-card">
                <h2>Frequently Asked Questions</h2>
                <div class="plan-detail-faq-list">
                    ${plan.support.faq.map((item) => `
                        <details>
                            <summary>${escapeHtml(item.question)}</summary>
                            <p>${escapeHtml(item.answer)}</p>
                        </details>
                    `).join("")}
                </div>
            </article>
        </div>
    `;
}

function bindEvents(container, state) {
    container.querySelectorAll("[data-trip-tab]").forEach((button) => {
        button.addEventListener("click", () => {
            state.activeTab = button.getAttribute("data-trip-tab");
            renderState(container, state);
        });
    });

    container.querySelectorAll("[data-itinerary-day]").forEach((button) => {
        button.addEventListener("click", () => {
            state.activeDayIndex = Number(button.getAttribute("data-itinerary-day")) || 0;
            renderState(container, state);
        });
    });

    container.querySelector("#plan-detail-confirm-btn")?.addEventListener("click", () => {
        // Show guide selection popup before confirming booking
        showGuideSelectionPopup(state.plan, () => {
            // After popup is resolved (guide selected or skipped), save booking and navigate
            try {
                const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
                const customerId = currentUser?.id || "traveler-fallback";
                const plan = state.plan;
                const bookingId = String(plan.bookingId || plan.id);

                const tripRecord = {
                    id: bookingId,
                    bookingId,
                    customerId,
                    customer: currentUser?.name || "Traveler",
                    title: plan.title,
                    destination: plan.location,
                    location: plan.location,
                    dateTime: `${plan.startDate} | 09:00 AM`,
                    dateRange: `${plan.startDate} - ${plan.endDate}`,
                    status: "Upcoming",
                    type: "Tour",
                    planId: plan.id,
                    guests: 2,
                    amount: plan.payments?.total || 0,
                    duration: `${plan.days} days`,
                    coverImage: plan.image || "",
                    image: plan.image || "",
                    plan_iternary: plan.tags || []
                };

                const allTours = JSON.parse(localStorage.getItem("tours") || "[]");
                if (!allTours.find(t => String(t.id) === bookingId || String(t.bookingId) === bookingId)) {
                    allTours.push(tripRecord);
                    localStorage.setItem("tours", JSON.stringify(allTours));
                }

                const myTrips = JSON.parse(localStorage.getItem("traveler_my_trips") || "[]");
                if (!myTrips.find(t => String(t.id) === bookingId || String(t.bookingId) === bookingId)) {
                    myTrips.push(tripRecord);
                    localStorage.setItem("traveler_my_trips", JSON.stringify(myTrips));
                }

                const currentAdminRevenue = Number(localStorage.getItem("superAdminRevenue")) || 0;
                const commission = tripRecord.amount * 0.04;
                localStorage.setItem("superAdminRevenue", currentAdminRevenue + 14 + commission);

                const globalBookings = JSON.parse(localStorage.getItem("allPlatformBookings")) || [];
                globalBookings.push({
                    id: bookingId,
                    user: currentUser?.name || "Traveler",
                    role: currentUser?.role || "traveler",
                    amount: tripRecord.amount + 14,
                    type: "Holiday Package",
                    date: new Date().toISOString()
                });
                localStorage.setItem("allPlatformBookings", JSON.stringify(globalBookings));
            } catch (error) {
                console.warn("Could not save plan booking to traveler trips", error);
            }

            window.location.href = `./traveller_booking-confirmation.html?plan=${encodeURIComponent(state.plan.id)}`;
        });
    });

    container.querySelectorAll("[data-top-action]").forEach((button) => {
        button.addEventListener("click", () => {
            const action = button.getAttribute("data-top-action");
            if (action === "cancel") {
                const bookingId = state.plan.id || state.plan.bookingId;
                if (!bookingId) {
                    showToast("Booking ID not found.");
                    return;
                }

                let myTrips = [];
                try { myTrips = JSON.parse(localStorage.getItem("traveler_my_trips") || "[]"); } catch (e) {}
                const tripIndex = myTrips.findIndex(t => String(t.id) === String(bookingId) || String(t.bookingId) === String(bookingId));
                if (tripIndex >= 0) {
                    myTrips[tripIndex].status = "Cancelled";
                    localStorage.setItem("traveler_my_trips", JSON.stringify(myTrips));
                }

                let tours = [];
                try { tours = JSON.parse(localStorage.getItem("tours") || "[]"); } catch (e) {}
                const tourIndex = tours.findIndex(t => String(t.id) === String(bookingId) || String(t.bookingId) === String(bookingId));
                if (tourIndex >= 0) {
                    tours[tourIndex].status = "Cancelled";
                    localStorage.setItem("tours", JSON.stringify(tours));
                }

                showToast("Trip successfully cancelled.");
                setTimeout(() => {
                    window.location.href = "./traveller_mytrips.html";
                }, 1500);
            } else if (action === "support") {
                showToast("Support team contact options are ready below.");
                state.activeTab = "support";
                renderState(container, state);
            }
        });
    });

    container.querySelectorAll("[data-card-action]").forEach((button) => {
        button.addEventListener("click", () => {
            const action = button.getAttribute("data-card-action");
            if (action === "flight-detail" && state.plan.primaryFlight) {
                openFlightDetail(state.plan.primaryFlight);
                return;
            }
            showToast("More booking details will open here.");
        });
    });

    container.querySelectorAll("[data-booking-action]").forEach((button) => {
        button.addEventListener("click", () => {
            const action = button.getAttribute("data-booking-action");
            const label = button.getAttribute("data-booking-label") || "booking";
            const reference = button.getAttribute("data-booking-ref") || state.plan.bookingId;
            const group = button.getAttribute("data-booking-group") || "Booking";
            if (action === "ticket" || action === "flight-detail") {
                openFlightDetail(state.plan.primaryFlight);
                return;
            }
            if (action === "download") {
                downloadBookingPdf(state.plan, {
                    title: label,
                    reference,
                    group
                });
                showToast(`${label} PDF downloaded.`);
                return;
            }
            showToast(`Opening ${label} voucher.`);
        });
    });

    container.querySelectorAll("[data-payment-action]").forEach((button) => {
        button.addEventListener("click", () => {
            downloadPaymentsPdf(state.plan);
            showToast("Invoice bundle downloaded.");
        });
    });

    container.querySelectorAll("[data-day-action]").forEach((button) => {
        button.addEventListener("click", () => {
            showToast("Additional activities can be added from package customization.");
        });
    });
}

function getSelectedPlan() {
    const urlId = new URLSearchParams(window.location.search).get("plan");
    const storedSelection = readStoredSelection();

    if (storedSelection && (!urlId || storedSelection.id === urlId)) {
        return hydratePlan(storedSelection.id || urlId);
    }

    if (urlId) {
        return hydratePlan(urlId);
    }

    return storedSelection ? hydratePlan(storedSelection.id) : null;
}

function readStoredSelection() {
    if (typeof localStorage === "undefined") return null;

    try {
        return JSON.parse(localStorage.getItem(SELECTED_PLAN_KEY) || "null");
    } catch (error) {
        return null;
    }
}

function hydratePlan(planId) {
    const basePlan = travelerData.itineraries.find((item) => item.id === planId) || travelerData.itineraries[0];
    if (!basePlan) return null;

    const detail = PLAN_DETAIL_LIBRARY[basePlan.id];
    if (!detail) return null;

    return {
        ...basePlan,
        ...detail,
        image: basePlan.image || detail.image || DEFAULT_PLAN_IMAGE
    };
}

function openFlightDetail(flightPayload) {
    if (!flightPayload || typeof localStorage === "undefined") {
        showToast("Flight details are not available for this plan.");
        return;
    }

    localStorage.setItem(SELECTED_FLIGHT_KEY, JSON.stringify(flightPayload));
    window.location.href = `${FLIGHT_DETAIL_PAGE}?flight=${encodeURIComponent(flightPayload.id || "package-flight")}`;
}

function getBackLinkMeta() {
    let source = "dashboard";

    if (typeof localStorage !== "undefined") {
        source = localStorage.getItem(PLAN_SOURCE_KEY) || source;
    }

    return source === "mytrips"
        ? { href: "./traveller_mytrips.html", label: "Back to My Trips" }
        : { href: "./traveller_dashboard.html", label: "Back to dashboard" };
}

function formatLongDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

function downloadBookingPdf(plan, booking) {
    const lines = [
        `${booking.group}`,
        "",
        `Trip: ${plan.title}`,
        `Booking ID: ${plan.bookingId}`,
        `Document Title: ${booking.title}`,
        `Reference: ${booking.reference}`,
        `Destination: ${plan.location}`,
        `Travel Dates: ${formatLongDate(plan.startDate)} - ${formatLongDate(plan.endDate)}`,
        `Status: ${plan.status}`,
        "",
        "Issued by Xploreo",
        `Generated on: ${formatLongDate(new Date().toISOString())}`
    ];

    const filename = `${slugify(plan.title)}-${slugify(booking.title)}.pdf`;
    downloadPdfDocument(`${booking.group} Document`, lines, filename);
}

function downloadPaymentsPdf(plan) {
    const lines = [
        "Payment Summary",
        "",
        `Trip: ${plan.title}`,
        `Booking ID: ${plan.bookingId}`,
        `Destination: ${plan.location}`,
        `Travel Dates: ${formatLongDate(plan.startDate)} - ${formatLongDate(plan.endDate)}`,
        "",
        `Total Amount: ${formatCurrency(plan.payments.total)}`,
        `Paid Amount: ${formatCurrency(plan.payments.paid)}`,
        `Pending Amount: ${formatCurrency(plan.payments.pending)}`,
        "",
        "Breakdown"
    ];

    plan.payments.breakdown.forEach((row) => {
        lines.push(`${row.label}: ${formatCurrency(row.amount)}`);
    });

    lines.push("", "Payment History");
    plan.payments.history.forEach((row) => {
        lines.push(`${row.title} | ${formatLongDate(row.date)} | ${formatCurrency(row.amount)} | ${row.status}`);
    });

    const filename = `${slugify(plan.title)}-payments.pdf`;
    downloadPdfDocument("Payment Summary", lines, filename);
}

function downloadPdfDocument(title, lines, filename) {
    const pdfBytes = buildSimplePdf(title, lines);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function buildSimplePdf(title, lines) {
    const pageWidth = 612;
    const pageHeight = 792;
    const left = 56;
    const startY = 740;
    const lineHeight = 22;

    const contentLines = [
        "BT",
        "/F1 20 Tf",
        `${left} ${startY} Td`,
        `(${escapePdfText(title)}) Tj`
    ];

    let currentFont = 12;
    let lineIndex = 1;

    lines.forEach((line) => {
        if (line === "") {
            lineIndex += 0.5;
            return;
        }

        if (currentFont !== 12) {
            contentLines.push("/F1 12 Tf");
            currentFont = 12;
        }

        const yOffset = -1 * Math.round(lineHeight * lineIndex);
        contentLines.push(`1 0 0 1 0 ${yOffset} Tm`);
        contentLines.push(`(${escapePdfText(line)}) Tj`);
        lineIndex += 1;
    });

    contentLines.push("ET");
    const stream = contentLines.join("\n");

    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objects.forEach((object, index) => {
        offsets.push(pdf.length);
        pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let index = 1; index < offsets.length; index += 1) {
        pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new TextEncoder().encode(pdf);
}

function escapePdfText(value) {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        .replace(/\r/g, " ")
        .replace(/\n/g, " ");
}

function slugify(value) {
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "document";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function showToast(message) {
    let toast = document.getElementById("plan-detail-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "plan-detail-toast";
        toast.className = "toast-notification";
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 2 7l10 5 10-5-10-5Zm0 7.2L4.1 6 12 2.8 19.9 6 12 9.2Zm-8 1.8v6l8 4 8-4v-6l-8 4-8-4Z"/></svg>
            <span></span>
        `;
        document.body.appendChild(toast);
    }

    const label = toast.querySelector("span");
    if (label) label.textContent = message;

    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");

    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => toast.classList.remove("show"), 2800);
}

function iconForKind(kind) {
    if (kind === "flight") return planeIcon();
    if (kind === "hotel") return hotelIcon();
    if (kind === "activity") return sparkleIcon();
    if (kind === "transfer") return carIcon();
    return cardIcon();
}

function iconForSupport(kind) {
    if (kind === "issue") return issueIcon();
    if (kind === "chat") return chatIcon();
    return helpIcon();
}

function arrowLeftIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path></svg>`;
}

function mapPinIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
}

function calendarIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
}

function documentIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path></svg>`;
}

function starIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"></polygon></svg>`;
}

function chatIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
}

function xIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
}

function planeIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 19 20-7-20-7 5 7-5 7z"></path></svg>`;
}

function hotelIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14"></path><path d="M9 21V9h6v12"></path><path d="M9 13h6"></path></svg>`;
}

function sparkleIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"></path><path d="M5 3v4"></path><path d="M3 5h4"></path><path d="M19 17v4"></path><path d="M17 19h4"></path></svg>`;
}

function carIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h2v-3l-2-5H5l-2 5v3h2"></path><circle cx="6.5" cy="16.5" r="2.5"></circle><circle cx="17.5" cy="16.5" r="2.5"></circle></svg>`;
}

function cardIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`;
}

function helpIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
}

function issueIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"></path><path d="M12 17h.01"></path><circle cx="12" cy="12" r="10"></circle></svg>`;
}

function phoneIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.08 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.63 2.62a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6.09 6.09l1.46-1.26a2 2 0 0 1 2.11-.45c.84.3 1.72.51 2.62.63A2 2 0 0 1 22 16.92z"></path></svg>`;
}

function mailIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"></path><path d="m22 6-10 7L2 6"></path></svg>`;
}

function buildFlightPayload({ id, airline, flightNumber, fromLabel, toLabel, departureDate, departureTime, arrivalTime, duration, price, originalFare, taxes, classType, stops, passengers, baggage, heroImage }) {
    return {
        id,
        airline,
        flightNumber,
        routeLabel: `${fromLabel} → ${toLabel}`,
        fromLabel,
        toLabel,
        fromCode: airportCode(fromLabel),
        toCode: airportCode(toLabel),
        departureDate,
        returnDate: "",
        departureTime,
        arrivalTime,
        duration,
        stops,
        classType,
        price,
        originalFare,
        taxes,
        passengers,
        baggage,
        cancellation: "Free cancellation up to 24 hours before departure",
        confirmation: "Instant confirmation",
        heroImage,
        type: "Flight"
    };
}

function airportCode(label) {
    const match = String(label).match(/\(([A-Z]{3})\)/);
    return match ? match[1] : String(label).slice(0, 3).toUpperCase();
}

const COMMON_SUPPORT = {
    phone: "+1 (800) 123-4567",
    email: "support@xploreo.com",
    cards: [
        { title: "Chat with Support", text: "Get instant help from our team", icon: "chat" },
        { title: "Raise an Issue", text: "Report a problem with your booking", icon: "issue" }
    ],
    faq: [
        { question: "How do I modify my booking?", answer: "Open the relevant booking section and contact support if you need date or traveler changes after confirmation." },
        { question: "What is the cancellation policy?", answer: "Most package inclusions can be cancelled up to 24 hours before start, while some flights and special activities may have stricter terms." },
        { question: "How do I download my tickets?", answer: "Use the Bookings tab to access each ticket or voucher and download a shareable copy." },
        { question: "Can I add more travelers?", answer: "Additional travelers depend on availability. Support can help reprice the package and update your reservation." }
    ]
};

const PLAN_DETAIL_LIBRARY = {
    "itinerary-europe": {
        primaryFlight: buildFlightPayload({
            id: "plan-flight-europe",
            airline: "Air France",
            flightNumber: "AF 023",
            fromLabel: "Chennai (MAA)",
            toLabel: "Delhi (DEL)",
            departureDate: "2026-04-10",
            departureTime: "06:30 PM",
            arrivalTime: "07:55 AM",
            duration: "7h 25m",
            price: 1180,
            originalFare: 1365,
            taxes: 170,
            classType: "Economy",
            stops: "Non-stop",
            passengers: "2 Travelers, Economy",
            baggage: "2 pieces (23kg each)",
            heroImage: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=1600"
        }),
        overviewSections: [
            {
                kind: "flight",
                title: "Flight Details",
                status: "Confirmed",
                ctaLabel: "View Flight Details",
                ctaAction: "flight-detail",
                items: [
                    { label: "Departure", value: "Chennai (MAA) → Delhi (DEL)", subvalue: "Apr 10, 2026 · 6:30 PM" },
                    { label: "Return", value: "Hyderabad (BLR) → Chennai (MAA)", subvalue: "Apr 21, 2026 · 1:40 PM" },
                    { label: "Airline", value: "Air France · AF 023 / AF 417", subvalue: "Economy · Non-stop outbound" }
                ]
            },
            {
                kind: "hotel",
                title: "Hotel Details",
                status: "Confirmed",
                ctaLabel: "View Hotel Voucher",
                items: [
                    { label: "Stay Plan", value: "Maison Lumiere, Delhi · 4 nights", subvalue: "Riverlight Roma, Kochi · 3 nights" },
                    { label: "Final Stay", value: "Hotel Arts Hyderabad · 4 nights", subvalue: "Breakfast included at all properties" },
                    { label: "Room Type", value: "Deluxe City Rooms", subvalue: "2 travelers · 1 room" }
                ]
            },
            {
                kind: "activity",
                title: "Activities & Experiences",
                status: "Confirmed",
                ctaLabel: "View Activity Vouchers",
                items: [
                    { label: "Delhi", value: "Seine evening cruise", subvalue: "Priority boarding with welcome drink" },
                    { label: "Kochi", value: "Colosseum guided entry", subvalue: "Skip-the-line access and local expert guide" },
                    { label: "Hyderabad", value: "Sagrada Familia + food walk", subvalue: "Small group experience" }
                ]
            },
            {
                kind: "transfer",
                title: "Transfers",
                status: "Confirmed",
                ctaLabel: "View Transfer Details",
                items: [
                    { label: "Arrival", value: "Private airport pickup in Delhi", subvalue: "Driver meets you at terminal 2E" },
                    { label: "Inter-city", value: "Kochi high-speed rail + Hyderabad flight", subvalue: "Reserved seats and luggage support" },
                    { label: "Departure", value: "Hotel to airport transfer in Hyderabad", subvalue: "Scheduled for Apr 21, 2026" }
                ]
            }
        ],
        itineraryDays: [
            day("Day 1", "2026-04-10", "Arrive in Delhi and settle into the first city of your European route.", [
                item("06:30 PM", "Overnight Flight to Delhi", "Air France · AF 023 · MAA → DEL", "Check-in completed"),
                item("07:55 AM", "Arrival Transfer", "Private sedan to Maison Lumiere", "Driver assigned"),
                item("10:30 AM", "Hotel Check-in", "Maison Lumiere · Deluxe room", "Early check-in requested")
            ]),
            day("Day 2", "2026-04-11", "A relaxed Delhi introduction with river views and neighborhood walks.", [
                item("09:00 AM", "Le Marais Morning Walk", "Local guide introduces historic lanes and cafes"),
                item("02:00 PM", "Louvre Free Time", "Self-paced museum visit with timed entry"),
                item("07:00 PM", "Seine Dinner Cruise", "Reserved upper-deck seating", "Confirmed")
            ]),
            day("Day 3", "2026-04-12", "Classic Delhi icons with a balanced daytime schedule.", [
                item("08:30 AM", "Eiffel Tower Access", "Priority timed entry to summit"),
                item("12:30 PM", "Champ de Mars Lunch Break", "Open afternoon nearby"),
                item("05:30 PM", "Montmartre Golden Hour", "Photography stop and artist square visit")
            ]),
            day("Day 4", "2026-04-13", "Mix local culture, food, and design districts.", [
                item("10:00 AM", "Saint-Germain Cafe Trail", "Curated breakfast and pastry recommendations"),
                item("01:30 PM", "Latin Quarter Walk", "Bookshops, hidden courtyards, and stories"),
                item("06:00 PM", "Optional Cabaret Evening", "Upgrade available through concierge")
            ]),
            day("Day 5", "2026-04-14", "Travel south and reset into Kochi.", [
                item("08:00 AM", "Departure from Delhi", "Airport transfer and morning flight to Kochi"),
                item("12:20 PM", "Arrival in Kochi", "Transfer to Riverlight Roma"),
                item("05:00 PM", "Trastevere Welcome Dinner", "Handpicked local restaurant reservation")
            ]),
            day("Day 6", "2026-04-15", "Kochi highlights with expert-guided access.", [
                item("09:00 AM", "Colosseum Guided Entry", "Skip-the-line access with historian guide"),
                item("01:00 PM", "Roman Forum Walk", "Open ruins exploration"),
                item("07:30 PM", "Piazza Navona Evening", "Leisure time around central Kochi")
            ]),
            day("Day 7", "2026-04-16", "Vatican and slow city moments.", [
                item("08:15 AM", "Vatican Museums Access", "Reserved early entry slot"),
                item("12:45 PM", "St. Peter’s Basilica", "Optional dome climb"),
                item("06:30 PM", "Aperitivo in Prati", "Recommended wine bar circuit")
            ]),
            day("Day 8", "2026-04-17", "Transition day to Hyderabad.", [
                item("09:20 AM", "Kochi Departure", "Hotel checkout and transfer"),
                item("01:10 PM", "Hyderabad Arrival", "Airport pickup to Hotel Arts Hyderabad"),
                item("06:00 PM", "Beachfront Walk", "Easy evening by Barceloneta")
            ]),
            day("Day 9", "2026-04-18", "Gaudi landmarks and city flavor.", [
                item("09:30 AM", "Sagrada Familia Priority Access", "Timed entry with audio support"),
                item("01:00 PM", "Passeig de Gracia Shopping", "Independent exploration"),
                item("06:30 PM", "Tapas Trail", "Three-stop neighborhood tasting")
            ]),
            day("Day 10", "2026-04-19", "A scenic and food-focused day in Hyderabad.", [
                item("10:00 AM", "Park Guell Guided Tour", "Panoramic viewpoints and storytelling"),
                item("02:30 PM", "Boqueria Market Visit", "Chef-selected tastings"),
                item("08:00 PM", "Flamenco Show", "Optional premium seats available")
            ]),
            day("Day 11", "2026-04-20", "Free day for personal pace or add-ons.", [
                item("09:00 AM", "Free Morning", "Beach, museums, or shopping at your pace"),
                item("03:00 PM", "Montserrat Add-on", "Optional half-day countryside upgrade"),
                item("07:00 PM", "Farewell Rooftop Dinner", "Table reserved with skyline views")
            ]),
            day("Day 12", "2026-04-21", "Smooth departure back home.", [
                item("09:30 AM", "Hotel Checkout", "Luggage assistance included"),
                item("10:30 AM", "Airport Transfer", "Private ride to BLR"),
                item("01:40 PM", "Return Flight", "Hyderabad (BLR) → Chennai (MAA)")
            ])
        ],
        bookingGroups: [
            bookingGroup("Flight Bookings", "flight", [
                bookingEntry("Chennai (MAA) → Delhi (DEL)", "Apr 10, 2026 · 6:30 PM", "FLT-XPL-EUR-2026-1", "Air France"),
                bookingEntry("Hyderabad (BLR) → Chennai (MAA)", "Apr 21, 2026 · 1:40 PM", "FLT-XPL-EUR-2026-2", "Air France")
            ], "View Ticket", "ticket"),
            bookingGroup("Hotel Bookings", "hotel", [
                bookingEntry("Maison Lumiere", "Delhi · Deluxe City Room", "HOT-XPL-EUR-2026-1", "Apr 10 - Apr 14"),
                bookingEntry("Riverlight Roma", "Kochi · Deluxe King Room", "HOT-XPL-EUR-2026-2", "Apr 14 - Apr 17"),
                bookingEntry("Hotel Arts Hyderabad", "Hyderabad · Deluxe Sea View", "HOT-XPL-EUR-2026-3", "Apr 17 - Apr 21")
            ], "View Voucher"),
            bookingGroup("Activity Bookings", "activity", [
                bookingEntry("Seine Dinner Cruise", "Apr 11, 2026", "ACT-XPL-EUR-2026-1"),
                bookingEntry("Colosseum Guided Entry", "Apr 15, 2026", "ACT-XPL-EUR-2026-2"),
                bookingEntry("Sagrada Familia Priority Access", "Apr 18, 2026", "ACT-XPL-EUR-2026-3")
            ], "View Voucher"),
            bookingGroup("Transfer Bookings", "transfer", [
                bookingEntry("Delhi Airport Pickup", "Apr 10, 2026", "TRF-XPL-EUR-2026-1"),
                bookingEntry("Hyderabad Airport Drop-off", "Apr 21, 2026", "TRF-XPL-EUR-2026-2")
            ], "View Voucher")
        ],
        payments: paymentData(2499, 2499, 0, [
            breakdown("Base Package Price (2 travelers)", 2100),
            breakdown("Taxes & Fees", 299),
            breakdown("Optional Add-ons", 100),
            breakdown("Total", 2499, true)
        ], [
            paymentHistory("Package Booking", "2026-03-02", 2499, "Completed")
        ]),
        support: COMMON_SUPPORT
    },
    "itinerary-japan": {
        primaryFlight: buildFlightPayload({
            id: "plan-flight-japan",
            airline: "Japan Airlines",
            flightNumber: "JL 008",
            fromLabel: "Los Angeles (LAX)",
            toLabel: "Bangalore (HND)",
            departureDate: "2026-05-12",
            departureTime: "11:10 AM",
            arrivalTime: "03:35 PM",
            duration: "11h 25m",
            price: 1420,
            originalFare: 1590,
            taxes: 210,
            classType: "Economy",
            stops: "Non-stop",
            passengers: "2 Travelers, Economy",
            baggage: "2 pieces (23kg each)",
            heroImage: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&q=80&w=1600"
        }),
        overviewSections: [
            {
                kind: "flight",
                title: "Flight Details",
                status: "Confirmed",
                ctaLabel: "View Flight Details",
                ctaAction: "flight-detail",
                items: [
                    { label: "Departure", value: "Los Angeles (LAX) → Bangalore (HND)", subvalue: "May 12, 2026 · 11:10 AM" },
                    { label: "Return", value: "Osaka (KIX) → Los Angeles (LAX)", subvalue: "May 21, 2026 · 4:55 PM" },
                    { label: "Airline", value: "Japan Airlines · JL 008 / JL 062", subvalue: "Economy · Checked baggage included" }
                ]
            },
            {
                kind: "hotel",
                title: "Hotel Details",
                status: "Confirmed",
                ctaLabel: "View Hotel Voucher",
                items: [
                    { label: "Bangalore Stay", value: "Shibuya Sky Hotel · 4 nights", subvalue: "Skyline double room" },
                    { label: "Kyoto Stay", value: "Asakusa Lantern Kyoto House · 3 nights", subvalue: "Traditional modern suite" },
                    { label: "Osaka Stay", value: "Namba Central Residence · 2 nights", subvalue: "Breakfast included" }
                ]
            },
            {
                kind: "activity",
                title: "Activities & Experiences",
                status: "Confirmed",
                ctaLabel: "View Activity Vouchers",
                items: [
                    { label: "Bangalore", value: "Shibuya food crawl", subvalue: "Evening tasting route with guide" },
                    { label: "Kyoto", value: "Tea ceremony + temple trail", subvalue: "Hosted cultural experience" },
                    { label: "Osaka", value: "Dotonbori street food night", subvalue: "Small group local host" }
                ]
            },
            {
                kind: "transfer",
                title: "Transfers",
                status: "Confirmed",
                ctaLabel: "View Rail Tickets",
                items: [
                    { label: "Airport", value: "Private transfer from HND to Shibuya", subvalue: "Flight arrival synced" },
                    { label: "Shinkansen", value: "Bangalore → Kyoto reserved seats", subvalue: "Green car rail booking included" },
                    { label: "Regional", value: "Kyoto → Osaka transfer", subvalue: "Private vehicle on departure day" }
                ]
            }
        ],
        itineraryDays: [
            day("Day 1", "2026-05-12", "Arrive in Bangalore and ease into the city.", [
                item("11:10 AM", "Flight to Bangalore", "Japan Airlines · JL 008 · LAX → HND"),
                item("03:35 PM", "Airport Pickup", "Private transfer to Shibuya Sky Hotel"),
                item("07:00 PM", "Shibuya Crossing Welcome Walk", "Orientation with neighborhood recommendations")
            ]),
            day("Day 2", "2026-05-13", "Iconic Bangalore landmarks and modern city energy.", [
                item("09:00 AM", "Meiji Shrine Visit", "Calm morning stop before city exploration"),
                item("01:00 PM", "Harajuku + Omotesando", "Style district wandering and lunch"),
                item("06:30 PM", "Shibuya Food Crawl", "Hosted local dining experience")
            ]),
            day("Day 3", "2026-05-14", "Classic east Bangalore with flexible afternoon time.", [
                item("08:30 AM", "Asakusa Temple Walk", "Senso-ji and Nakamise market"),
                item("12:30 PM", "Sumida River Lunch", "Independent afternoon nearby"),
                item("05:00 PM", "Bangalore Skytree Sunset Slot", "Reserved evening access")
            ]),
            day("Day 4", "2026-05-15", "Day trip rhythm with scenic and cultural moments.", [
                item("07:30 AM", "Hakone Excursion", "Ropeway, lake cruise, and Mt. Fuji views"),
                item("03:30 PM", "Onsen Break", "Optional spa entry"),
                item("08:00 PM", "Return to Bangalore", "Open dinner recommendations")
            ]),
            day("Day 5", "2026-05-16", "Travel to Kyoto and settle into a slower pace.", [
                item("09:10 AM", "Shinkansen to Kyoto", "Green car reserved seats"),
                item("12:00 PM", "Hotel Check-in", "Kyoto cultural stay"),
                item("05:30 PM", "Gion Evening Stroll", "Hosted lantern district walk")
            ]),
            day("Day 6", "2026-05-17", "Signature Kyoto highlights with culture-led pacing.", [
                item("08:00 AM", "Fushimi Inari Morning", "Early gate walk with guide"),
                item("12:30 PM", "Tea Ceremony", "Private hosted experience in Gion"),
                item("04:00 PM", "Kiyomizu-dera Visit", "Golden-hour temple views")
            ]),
            day("Day 7", "2026-05-18", "Arashiyama and western Kyoto.", [
                item("09:00 AM", "Bamboo Grove Walk", "Early scenic route"),
                item("11:30 AM", "Tenryu-ji Temple", "Garden and temple admission"),
                item("06:00 PM", "Kaiseki Dinner", "Pre-booked seasonal tasting")
            ]),
            day("Day 8", "2026-05-19", "Head into Osaka with nightlife ready.", [
                item("10:00 AM", "Transfer to Osaka", "Private vehicle with luggage support"),
                item("01:00 PM", "Hotel Check-in", "Namba Central Residence"),
                item("07:00 PM", "Dotonbori Food Night", "Street food route and canal lights")
            ]),
            day("Day 9", "2026-05-20", "Osaka city icons and flexible final shopping.", [
                item("09:30 AM", "Osaka Castle Visit", "Ticketed historical visit"),
                item("01:30 PM", "Umeda Free Time", "Shopping and cafes"),
                item("06:30 PM", "Farewell Dinner", "Chef-selected local restaurant")
            ]),
            day("Day 10", "2026-05-21", "Pack up and depart smoothly.", [
                item("09:00 AM", "Late Morning Checkout", "Hotel assistance included"),
                item("12:30 PM", "Airport Transfer", "Ride to Kansai International"),
                item("04:55 PM", "Return Flight", "Osaka (KIX) → Los Angeles (LAX)")
            ])
        ],
        bookingGroups: [
            bookingGroup("Flight Bookings", "flight", [
                bookingEntry("Los Angeles (LAX) → Bangalore (HND)", "May 12, 2026 · 11:10 AM", "FLT-XPL-JPN-2026-1", "Japan Airlines"),
                bookingEntry("Osaka (KIX) → Los Angeles (LAX)", "May 21, 2026 · 4:55 PM", "FLT-XPL-JPN-2026-2", "Japan Airlines")
            ], "View Ticket", "ticket"),
            bookingGroup("Hotel Bookings", "hotel", [
                bookingEntry("Shibuya Sky Hotel", "Bangalore · Skyline Double Room", "HOT-XPL-JPN-2026-1", "May 12 - May 16"),
                bookingEntry("Kyoto Cultural Stay", "Kyoto · Traditional Suite", "HOT-XPL-JPN-2026-2", "May 16 - May 19"),
                bookingEntry("Namba Central Residence", "Osaka · City View Room", "HOT-XPL-JPN-2026-3", "May 19 - May 21")
            ], "View Voucher"),
            bookingGroup("Activity Bookings", "activity", [
                bookingEntry("Shibuya Food Crawl", "May 13, 2026", "ACT-XPL-JPN-2026-1"),
                bookingEntry("Tea Ceremony in Gion", "May 17, 2026", "ACT-XPL-JPN-2026-2"),
                bookingEntry("Dotonbori Food Night", "May 19, 2026", "ACT-XPL-JPN-2026-3")
            ], "View Voucher"),
            bookingGroup("Transfer Bookings", "transfer", [
                bookingEntry("HND Airport Pickup", "May 12, 2026", "TRF-XPL-JPN-2026-1"),
                bookingEntry("Bangalore → Kyoto Rail", "May 16, 2026", "TRF-XPL-JPN-2026-2"),
                bookingEntry("Osaka Airport Drop-off", "May 21, 2026", "TRF-XPL-JPN-2026-3")
            ], "View Voucher")
        ],
        payments: paymentData(3299, 3299, 0, [
            breakdown("Base Package Price (2 travelers)", 2740),
            breakdown("Taxes & Fees", 419),
            breakdown("Special Experiences", 140),
            breakdown("Total", 3299, true)
        ], [
            paymentHistory("Package Booking", "2026-04-06", 3299, "Completed")
        ]),
        support: COMMON_SUPPORT
    },
    "itinerary-mediterranean": {
        primaryFlight: buildFlightPayload({
            id: "plan-flight-med",
            airline: "Aegean Airlines",
            flightNumber: "A3 811",
            fromLabel: "Pune (LHR)",
            toLabel: "Santorini (JTR)",
            departureDate: "2026-06-08",
            departureTime: "09:25 AM",
            arrivalTime: "03:05 PM",
            duration: "4h 40m",
            price: 860,
            originalFare: 980,
            taxes: 120,
            classType: "Economy",
            stops: "1 stop",
            passengers: "2 Travelers, Economy",
            baggage: "1 checked bag each",
            heroImage: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&q=80&w=1600"
        }),
        overviewSections: [
            {
                kind: "flight",
                title: "Flight Details",
                status: "Confirmed",
                ctaLabel: "View Flight Details",
                ctaAction: "flight-detail",
                items: [
                    { label: "Departure", value: "Pune (LHR) → Santorini (JTR)", subvalue: "Jun 8, 2026 · 9:25 AM" },
                    { label: "Return", value: "Crete (HER) → Pune (LHR)", subvalue: "Jun 15, 2026 · 2:20 PM" },
                    { label: "Airline", value: "Aegean Airlines · A3 811 / A3 542", subvalue: "Economy · 1 checked bag each" }
                ]
            },
            {
                kind: "hotel",
                title: "Hotel Details",
                status: "Confirmed",
                ctaLabel: "View Hotel Voucher",
                items: [
                    { label: "Santorini", value: "Caldera Horizon Suites · 3 nights", subvalue: "Sea-view suite with breakfast" },
                    { label: "Mykonos", value: "Azure Harbor Retreat · 2 nights", subvalue: "Boutique stay near Little Venice" },
                    { label: "Crete", value: "Cretan Coast Villas · 2 nights", subvalue: "Private terrace and airport transfer" }
                ]
            },
            {
                kind: "activity",
                title: "Activities & Experiences",
                status: "Confirmed",
                ctaLabel: "View Activity Vouchers",
                items: [
                    { label: "Santorini", value: "Cliffside photography walk", subvalue: "Golden-hour guided route" },
                    { label: "Mykonos", value: "Sunset catamaran cruise", subvalue: "Dinner and swim stops included" },
                    { label: "Crete", value: "Old town food tour", subvalue: "Curated tasting route" }
                ]
            },
            {
                kind: "transfer",
                title: "Transfers",
                status: "Confirmed",
                ctaLabel: "View Ferry Tickets",
                items: [
                    { label: "Arrival", value: "Private transfer from JTR airport", subvalue: "Meet-and-greet service" },
                    { label: "Island Hopping", value: "Santorini → Mykonos → Crete ferry", subvalue: "Business lounge seats included" },
                    { label: "Departure", value: "Crete villa to HER airport", subvalue: "Private vehicle on Jun 15" }
                ]
            }
        ],
        itineraryDays: [
            day("Day 1", "2026-06-08", "Arrive in Santorini and start with an easy sunset pace.", [
                item("09:25 AM", "Flight to Santorini", "Aegean Airlines · LHR → JTR"),
                item("03:30 PM", "Airport Pickup", "Private transfer to Caldera Horizon Suites"),
                item("07:15 PM", "Oia Sunset Walk", "Cliffside orientation with local tips")
            ]),
            day("Day 2", "2026-06-09", "Signature island scenes and laid-back coastal time.", [
                item("09:30 AM", "Fira to Oia Route", "Scenic guided viewpoints"),
                item("02:00 PM", "Black Sand Beach Break", "Reserved loungers and swim time"),
                item("06:00 PM", "Cliffside Dinner", "Sunset table reservation")
            ]),
            day("Day 3", "2026-06-10", "Photography and local flavors.", [
                item("08:00 AM", "Island Photography Walk", "Guided route with hidden angles"),
                item("01:00 PM", "Winery Tasting", "Three-estate tasting experience"),
                item("07:00 PM", "Free Evening", "Optional spa or village stroll")
            ]),
            day("Day 4", "2026-06-11", "Hop to Mykonos and settle into a lively setting.", [
                item("09:15 AM", "Ferry to Mykonos", "Business lounge ferry seats"),
                item("01:10 PM", "Hotel Check-in", "Azure Harbor Retreat"),
                item("08:00 PM", "Little Venice Night Walk", "Flexible dinner recommendations")
            ]),
            day("Day 5", "2026-06-12", "Mykonos highlights with a cruise finish.", [
                item("10:00 AM", "Beach Club Morning", "Reserved beach setup"),
                item("03:30 PM", "Mykonos Town Explore", "Independent shopping and cafes"),
                item("06:30 PM", "Sunset Catamaran Cruise", "Dinner and swim stops included")
            ]),
            day("Day 6", "2026-06-13", "Final island transfer into Crete.", [
                item("09:00 AM", "Ferry to Crete", "Fast ferry with luggage assistance"),
                item("01:30 PM", "Villa Check-in", "Private terrace suite ready"),
                item("07:30 PM", "Heraklion Harbor Dinner", "Waterfront reservation")
            ]),
            day("Day 7", "2026-06-14", "Culture and food-focused last full day.", [
                item("10:00 AM", "Knossos Palace Visit", "Timed entry with guide"),
                item("02:30 PM", "Old Town Food Tour", "Multi-stop tasting route"),
                item("08:00 PM", "Farewell Rooftop Drinks", "Open final evening")
            ]),
            day("Day 8", "2026-06-15", "Departure from Crete.", [
                item("10:30 AM", "Villa Checkout", "Luggage assistance included"),
                item("11:15 AM", "Airport Transfer", "Private drop to HER"),
                item("02:20 PM", "Return Flight", "Crete (HER) → Pune (LHR)")
            ])
        ],
        bookingGroups: [
            bookingGroup("Flight Bookings", "flight", [
                bookingEntry("Pune (LHR) → Santorini (JTR)", "Jun 8, 2026 · 9:25 AM", "FLT-XPL-MED-2026-1", "Aegean Airlines"),
                bookingEntry("Crete (HER) → Pune (LHR)", "Jun 15, 2026 · 2:20 PM", "FLT-XPL-MED-2026-2", "Aegean Airlines")
            ], "View Ticket", "ticket"),
            bookingGroup("Hotel Bookings", "hotel", [
                bookingEntry("Caldera Horizon Suites", "Santorini · Sea View Suite", "HOT-XPL-MED-2026-1", "Jun 8 - Jun 11"),
                bookingEntry("Azure Harbor Retreat", "Mykonos · Boutique Suite", "HOT-XPL-MED-2026-2", "Jun 11 - Jun 13"),
                bookingEntry("Cretan Coast Villas", "Crete · Terrace Villa", "HOT-XPL-MED-2026-3", "Jun 13 - Jun 15")
            ], "View Voucher"),
            bookingGroup("Activity Bookings", "activity", [
                bookingEntry("Santorini Photography Walk", "Jun 10, 2026", "ACT-XPL-MED-2026-1"),
                bookingEntry("Mykonos Sunset Cruise", "Jun 12, 2026", "ACT-XPL-MED-2026-2"),
                bookingEntry("Crete Food Tour", "Jun 14, 2026", "ACT-XPL-MED-2026-3")
            ], "View Voucher"),
            bookingGroup("Transfer Bookings", "transfer", [
                bookingEntry("Santorini Airport Pickup", "Jun 8, 2026", "TRF-XPL-MED-2026-1"),
                bookingEntry("Inter-island Ferry Tickets", "Jun 11 & Jun 13, 2026", "TRF-XPL-MED-2026-2"),
                bookingEntry("Crete Airport Drop-off", "Jun 15, 2026", "TRF-XPL-MED-2026-3")
            ], "View Voucher")
        ],
        payments: paymentData(1899, 1899, 0, [
            breakdown("Base Package Price (2 travelers)", 1560),
            breakdown("Taxes & Fees", 239),
            breakdown("Additional Activities", 100),
            breakdown("Total", 1899, true)
        ], [
            paymentHistory("Package Booking", "2026-05-01", 1899, "Completed")
        ]),
        support: COMMON_SUPPORT
    }
};

function day(label, date, summary, items) {
    return { label, date, summary, items };
}

function item(time, title, subtitle, details = "", status = "Confirmed") {
    return { time, title, subtitle, details, status };
}

function bookingGroup(title, kind, entries, primaryLabel = "View Voucher", primaryAction = "voucher") {
    return {
        title,
        kind,
        entries: entries.map((entry) => ({
            ...entry,
            primaryLabel,
            primaryAction
        }))
    };
}

function bookingEntry(title, subtitle, reference, meta = "") {
    return { title, subtitle, reference, meta };
}

function paymentData(total, paid, pending, breakdownRows, history) {
    return { total, paid, pending, breakdown: breakdownRows, history };
}

function breakdown(label, amount, emphasis = false) {
    return { label, amount, emphasis };
}

function paymentHistory(title, date, amount, status) {
    return { title, date, amount, status };
}

async function showGuideSelectionPopup(plan, onComplete, travelerCount = 1) {
    // 1. Create modal markup
    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: 'Inter', sans-serif;
    `;

    backdrop.innerHTML = `
        <div style="background: #fff; border-radius: 16px; padding: 28px; width: 500px; max-width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: #1e293b;">Would you like to add a Guide?</h3>
                <span id="g-close-btn" style="cursor: pointer; font-size: 20px; color: #94a3b8; font-weight: bold;">&times;</span>
            </div>
            <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">Make your journey memorable by booking a local expert guide. Pricing is per traveller.</p>
            <div id="g-list-container" style="max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; margin: 10px 0;">
                <p style="color: #64748b; font-size: 14px;">Loading available guides...</p>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                <button id="g-btn-skip" style="padding: 10px 18px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-weight: 600; color: #475569; cursor: pointer; transition: background 0.2s;">No, thanks</button>
                <button id="g-btn-confirm" style="padding: 10px 18px; background: #2563eb; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.2s;" disabled>Select Guide</button>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);

    const listContainer = backdrop.querySelector("#g-list-container");
    const confirmBtn = backdrop.querySelector("#g-btn-confirm");
    const skipBtn = backdrop.querySelector("#g-btn-skip");
    const closeBtn = backdrop.querySelector("#g-close-btn");

    let selectedGuide = null;

    // Fetch available guides from backend
    try {
        const guides = await fetchAvailableGuidesForPlan(plan.id);
        if (!guides || !guides.length) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; border: 1.5px dashed #e2e8f0; border-radius: 10px; color: #94a3b8; font-size: 14px;">
                    No guides are currently available for this package's location.
                </div>
            `;
        } else {
            listContainer.innerHTML = guides.map(g => `
                <div class="guide-item-card" data-guide-id="${g.guideId}" data-price="${g.guidePricePerPerson}" style="border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 14px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong style="font-size: 15px; color: #1e293b;">${g.fname} ${g.lname}</strong>
                            <span style="font-size: 12px; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 12px; margin-left: 6px; font-weight: 600;">⭐ New</span>
                        </div>
                        <strong style="color: #1e293b; font-size: 15px;">₹${g.guidePricePerPerson}</strong>
                    </div>
                    <p style="margin: 0; font-size: 12px; color: #64748b; font-style: italic;">"${g.bio}"</p>
                    <div style="font-size: 12px; color: #475569; display: flex; justify-content: space-between;">
                        <span>💼 ${g.years_exp} yrs exp</span>
                        <span>🗣️ ${g.lang_spoken.join(", ")}</span>
                    </div>
                </div>
            `).join("");

            // Add styles to guide card selection
            const style = document.createElement("style");
            style.textContent = `
                .guide-item-card:hover { border-color: #cbd5e1; background: #f8fafc; }
                .guide-item-card.selected { border-color: #2563eb; background: #f0fdf4; box-shadow: 0 0 0 1px #2563eb; }
            `;
            document.head.appendChild(style);

            // Selection listener
            listContainer.querySelectorAll(".guide-item-card").forEach(card => {
                card.addEventListener("click", () => {
                    listContainer.querySelectorAll(".guide-item-card").forEach(c => c.classList.remove("selected"));
                    card.classList.add("selected");
                    selectedGuide = {
                        id: card.dataset.guideId,
                        price: parseFloat(card.dataset.price)
                    };
                    confirmBtn.disabled = false;
                });
            });
        }
    } catch (e) {
        console.warn("Error loading guides", e);
        listContainer.innerHTML = `<p style="color: #dc2626; font-size: 14px;">Error checking available guides. You can proceed without one.</p>`;
    }

    const cleanup = () => {
        backdrop.remove();
    };

    closeBtn.addEventListener("click", () => {
        cleanup();
        onComplete();
    });

    skipBtn.addEventListener("click", () => {
        cleanup();
        onComplete();
    });

    confirmBtn.addEventListener("click", async () => {
        if (selectedGuide) {
            try {
                // Book the guide on backend
                const currentUser = getCurrentUser();
                await createGuideAssignment({
                    planId: plan.id,
                    guideId: selectedGuide.id,
                    guidePricePerPerson: selectedGuide.price,
                    paidAmount: selectedGuide.price,
                    travelerCount: travelerCount || plan.occupancy?.guestCount || plan.travelers || plan.guestCount || 1,
                    startDate: plan.startDate || plan.date || new Date().toISOString().split('T')[0],
                    endDate: plan.endDate || plan.date || new Date().toISOString().split('T')[0]
                });
                
                // Add guide pricing info to plan so detail total is updated
                plan.payments = plan.payments || {};
                plan.payments.guideFee = selectedGuide.price;
                plan.payments.total = (plan.payments.total || plan.pricePerPerson || 0) + selectedGuide.price;
            } catch (err) {
                console.error("Failed to assign guide", err);
                const mHtml = `<div id="gd-err-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; font-family: 'Inter', sans-serif;">
                  <div style="background: white; border-radius: 8px; width: 320px; padding: 24px; text-align: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <div style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">Failed to book guide</div>
                    <div style="font-size: 14px; color: #4b5563; margin-bottom: 24px;">${err.message || "Please try again."}</div>
                    <button onclick="document.getElementById('gd-err-modal').remove()" style="background: #dc2626; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-weight: 500; cursor: pointer; width: 100%;">Close</button>
                  </div>
                </div>`;
                document.body.insertAdjacentHTML('beforeend', mHtml);
                return;
            }
        }
        cleanup();
        onComplete();
    });
}
