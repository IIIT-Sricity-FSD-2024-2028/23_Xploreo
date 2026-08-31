import {
    formatBookingCurrency,
    formatBookingDate,
    getSelectedTravelerPackage,
    getTravelerBookingConfirmation,
    getTravelerBookingDraft
} from "./dashboard.js";

document.addEventListener("DOMContentLoaded", () => {
    renderTravelerBookingConfirmationPage("traveler-booking-confirmation-app");
});

function renderTravelerBookingConfirmationPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const booking = getTravelerBookingConfirmation() || getTravelerBookingDraft();
    if (!booking) {
        container.innerHTML = renderEmptyState(getSelectedTravelerPackage());
        return;
    }

    const { packageData, travelers, travelerCount, totalPrice, bookingId, confirmedAt } = booking;
    const startDate = packageData.departureDate ? formatBookingDate(packageData.departureDate) : "Flexible dates";
    const endDate = packageData.departureDate
        ? formatBookingDate(addDays(packageData.departureDate, Math.max(1, Number(packageData.nights) || 1)))
        : "Flexible dates";

    container.innerHTML = `
        <main class="traveler-confirmation-page">
            <section class="traveler-confirmed-hero">
                <div class="traveler-confirmed-icon">${checkIcon()}</div>
                <h1>Booking Confirmed!</h1>
                <p>Your trip has been successfully booked.</p>
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

                    <article class="traveler-confirmation-card traveler-reference-card">
                        <div class="traveler-reference-top">
                            <div>
                                <p class="traveler-reference-label">Booking Reference</p>
                                <h2>${escapeHtml(String(bookingId || ""))}</h2>
                            </div>
                            <p class="traveler-reference-date">Confirmed ${escapeHtml(formatBookingDate(confirmedAt))}</p>
                        </div>

                        <div class="traveler-reference-layout">
                            <img src="${escapeHtml(packageData.image)}" alt="${escapeHtml(packageData.title)}" class="traveler-package-image">
                            <div class="traveler-reference-copy">
                                <p class="traveler-route-kicker">${escapeHtml(packageData.origin)} to ${escapeHtml(packageData.destination)}</p>
                                <h3>${escapeHtml(packageData.title)}</h3>
                                <p>${packageData.days} Days / ${packageData.nights} Nights · ${packageData.hotelCategory}★ stay</p>
                                <ul>
                                    <li>${escapeHtml(packageData.stayLine)}</li>
                                    <li>${escapeHtml(packageData.mealsLine)}</li>
                                    <li>${escapeHtml(packageData.transferLine)}</li>
                                    <li>${escapeHtml(packageData.activityLine)}</li>
                                </ul>
                            </div>
                        </div>

                        <div class="traveler-traveler-summary">
                            <h3>Traveler Summary</h3>
                            <p>Stored from the booking details page.</p>
                            <div class="traveler-traveler-grid">
                                ${travelers.map((traveler, index) => `
                                    <article class="traveler-card">
                                        <h4>Traveler ${index + 1}</h4>
                                        <p><strong>Name:</strong> ${escapeHtml(traveler.name)}</p>
                                        <p><strong>Age:</strong> ${escapeHtml(String(traveler.age))}</p>
                                        <p><strong>Gender:</strong> ${escapeHtml(traveler.gender)}</p>
                                    </article>
                                `).join("")}
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

                        <a class="traveler-primary-button traveler-button-link" href="./mytrips.html">View My Trips</a>
                        <a class="traveler-secondary-button traveler-button-link" href="./package-search.html">Continue Exploring</a>
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
                            <li>${checkLineIcon()} Confirmation saved for your trip</li>
                            <li>${checkLineIcon()} Booking details available in My Trips</li>
                            <li>${checkLineIcon()} Traveler details linked to this itinerary</li>
                        </ul>
                    </article>
                </aside>
            </section>
        </main>
    `;
}

function renderEmptyState(packageData) {
    return `
        <main class="traveler-confirmation-page">
            <section class="traveler-confirmation-card traveler-empty-card">
                <div class="traveler-confirmed-icon">${checkIcon()}</div>
                <h1>Traveler confirmation is empty</h1>
                <p>We could not find stored traveler details for ${escapeHtml(packageData.destination)} yet.</p>
                <a class="traveler-primary-button traveler-button-link" href="./booking-details.html">Go to booking details</a>
            </section>
        </main>
    `;
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
        Singapore: "Singapore"
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
