const EXPERIENCE_CONFIRMATION_KEY = "traveler_experience_booking_confirmation";

export function renderTravelerExperienceConfirmationPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const booking = getExperienceConfirmation();
    if (!booking) {
        container.innerHTML = `
            <main class="traveler-experience-confirmation-page">
                <section class="traveler-experience-confirmation-shell traveler-experience-confirmation-empty">
                    <h1>No experience confirmation found</h1>
                    <p>Please complete the experience booking flow first.</p>
                    <a href="./traveller_experience-search.html">Go to experiences</a>
                </section>
            </main>
        `;
        return;
    }

    container.innerHTML = `
        <main class="traveler-experience-confirmation-page">
            <section class="traveler-experience-confirmation-shell traveler-experience-confirmed-hero">
                <div class="traveler-experience-confirmed-icon">${checkIcon()}</div>
                <h1>Experience Booking Confirmed!</h1>
                <p>Your activity has been reserved successfully.</p>
                <div class="traveler-experience-confirmed-meta">
                    <span>Booking ID: <strong>${booking.bookingId}</strong></span>
                    <span>Booked on: <strong>${formatDate(booking.confirmedAt)}</strong></span>
                </div>
            </section>

            <section class="traveler-experience-confirmation-layout">
                <div class="traveler-experience-confirmation-main">
                    <article class="traveler-experience-confirmation-shell traveler-experience-confirmation-card">
                        <h2>Booking Summary</h2>
                        <div class="traveler-experience-confirmation-title">
                            <img src="${escapeHtml(booking.experience.image)}" alt="${escapeHtml(booking.experience.title)}">
                            <div>
                                <h3>${escapeHtml(booking.experience.title)}</h3>
                                <p>${locationIcon()} ${escapeHtml(booking.experience.location || booking.experience.destination)}</p>
                                <p>${clockIcon()} ${escapeHtml(booking.experience.durationLabel)}</p>
                            </div>
                        </div>
                        <div class="traveler-experience-confirmation-grid">
                            <div><span>Option</span><strong>${escapeHtml(booking.option.title)}</strong><p>${escapeHtml(booking.option.time)}</p></div>
                            <div><span>Date</span><strong>${escapeHtml(formatDate(booking.selectedDate))}</strong></div>
                            <div><span>Travelers</span><strong>${booking.adults} ${booking.adults === 1 ? "Adult" : "Adults"}</strong></div>
                            <div><span>Platform Fee</span><strong>₹14</strong></div>
                            <div><span>Total</span><strong>${formatCurrency(booking.totalPrice)}</strong></div>
                        </div>
                    </article>

                    <article class="traveler-experience-confirmation-shell traveler-experience-confirmation-card">
                        <h2>Traveler Details</h2>
                        <div class="traveler-experience-contact-card">
                            <h3>${escapeHtml(booking.leadTraveler.firstName)} ${escapeHtml(booking.leadTraveler.lastName)}</h3>
                            <p>${mailIcon()} ${escapeHtml(booking.leadTraveler.email)}</p>
                            <p>${phoneIcon()} ${escapeHtml(booking.leadTraveler.phone)}</p>
                            ${booking.leadTraveler.requests ? `<p>${infoCircleIcon()} ${escapeHtml(booking.leadTraveler.requests)}</p>` : ""}
                        </div>
                        <div class="traveler-experience-traveler-grid">
                            ${booking.travelers.map((traveler, index) => `
                                <article class="traveler-experience-traveler-card">
                                    <h4>Traveler ${index + 1}</h4>
                                    <p><strong>Name:</strong> ${escapeHtml(traveler.name)}</p>
                                    <p><strong>Age:</strong> ${escapeHtml(traveler.age)}</p>
                                    <p><strong>Gender:</strong> ${escapeHtml(traveler.gender)}</p>
                                </article>
                            `).join("")}
                        </div>
                    </article>
                </div>

                <aside class="traveler-experience-confirmation-sidebar">
                    <article class="traveler-experience-confirmation-shell traveler-experience-side-panel">
                        <h3>What's Next?</h3>
                        <ul>
                            <li>${checkCircleIcon()} Instant confirmation saved</li>
                            <li>${checkCircleIcon()} Show this booking at the activity location</li>
                            <li>${checkCircleIcon()} Free cancellation available within policy window</li>
                        </ul>
                        <a class="traveler-experience-primary-link" href="./traveller_mytrips.html">View My Trips</a>
                        <a class="traveler-experience-secondary-link" href="./traveller_experience-search.html">Continue Exploring</a>
                    </article>
                </aside>
            </section>
        </main>
    `;
}

function getExperienceConfirmation() {
    if (typeof localStorage === "undefined") return null;
    try {
        return JSON.parse(localStorage.getItem(EXPERIENCE_CONFIRMATION_KEY) || "null");
    } catch (error) {
        return null;
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function checkIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"></circle><path d="m8.5 12 2.2 2.2 4.8-4.8"></path></svg>`;
}

function checkCircleIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="m8.5 12 2.2 2.2 4.8-4.8"></path></svg>`;
}

function locationIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
}

function clockIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
}

function mailIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"></path><path d="m4 7 8 6 8-6"></path></svg>`;
}

function phoneIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.78 19.78 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.78 19.78 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.34 2.74a2 2 0 0 1-.57 1.72L7.1 9.9a16 16 0 0 0 7 7l1.72-1.78a2 2 0 0 1 1.72-.57l2.74.34A2 2 0 0 1 22 16.92z"></path></svg>`;
}

function infoCircleIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
