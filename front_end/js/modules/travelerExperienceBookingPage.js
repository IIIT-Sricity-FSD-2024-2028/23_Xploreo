import { createExperienceBooking } from "../api/services.js";
import { createRazorpayOrder, verifyRazorpayPayment, openRazorpayCheckout } from "../api/payments.js";

const SELECTED_EXPERIENCE_KEY = "traveler_selected_experience";
const EXPERIENCE_BOOKING_DRAFT_KEY = "traveler_experience_booking_draft";
const EXPERIENCE_CONFIRMATION_KEY = "traveler_experience_booking_confirmation";

export function renderTravelerExperienceBookingPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const draft = getExperienceBookingDraft();
    if (!draft) {
        container.innerHTML = `
            <main class="traveler-experience-booking-page">
                <section class="traveler-experience-booking-shell traveler-experience-booking-empty">
                    <h1>No experience booking selected</h1>
                    <p>Please choose an experience option before entering traveler details.</p>
                    <a href="./traveller_experience-search.html">Go to experiences</a>
                </section>
            </main>
        `;
        return;
    }

    const state = {
        draft,
        leadTraveler: draft.leadTraveler || {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            requests: ""
        },
        travelers: Array.isArray(draft.travelers) && draft.travelers.length
            ? draft.travelers
            : Array.from({ length: draft.adults }, (_, index) => ({
                id: `experience-traveler-${index + 1}`,
                name: "",
                age: "",
                gender: ""
            }))
    };

    function render() {
        const PLATFORM_FEE = 14;
        const baseTotal = Number(state.draft.totalPrice) || 0;
        const total = baseTotal + PLATFORM_FEE;

        container.innerHTML = `
            <main class="traveler-experience-booking-page">
                <div class="traveler-experience-booking-shell">
                    <section class="traveler-experience-stepper">
                        <div class="traveler-experience-step done"><span>${checkIcon()}</span><label>Select Activity</label></div>
                        <div class="traveler-experience-step-line active"></div>
                        <div class="traveler-experience-step active"><span>2</span><label>Traveler Details</label></div>
                        <div class="traveler-experience-step-line"></div>
                        <div class="traveler-experience-step"><span>3</span><label>Confirmation</label></div>
                    </section>

                    <section class="traveler-experience-booking-layout">
                        <div class="traveler-experience-booking-main">
                            <article class="traveler-experience-booking-card">
                                <h2>Selected Activity</h2>
                                <div class="traveler-experience-selected-card">
                                    <div class="traveler-experience-selected-icon">${renderExperienceIcon(state.draft.experience.category)}</div>
                                    <div>
                                        <h3>${escapeHtml(state.draft.experience.title)}</h3>
                                        <div class="traveler-experience-selected-rating">
                                            <strong>${starIcon()} ${Number(state.draft.experience.rating).toFixed(1)}</strong>
                                            <span>(${state.draft.experience.reviews} reviews)</span>
                                        </div>
                                        <p>${locationIcon()} ${escapeHtml(state.draft.experience.location || state.draft.experience.destination)}</p>
                                        <p>${clockIcon()} ${escapeHtml(state.draft.experience.durationLabel)}</p>
                                    </div>
                                </div>
                                <div class="traveler-experience-selected-grid">
                                    <div>
                                        <span>Selected Option</span>
                                        <strong>${escapeHtml(state.draft.option.title)}</strong>
                                        <p>${escapeHtml(state.draft.option.time)}</p>
                                    </div>
                                    <div>
                                        <span>Date & Travelers</span>
                                        <strong>${escapeHtml(formatBookingDate(state.draft.selectedDate))}</strong>
                                        <p>${state.draft.adults} ${state.draft.adults === 1 ? "Adult" : "Adults"}</p>
                                    </div>
                                </div>
                                <a class="traveler-experience-change-link" href="./traveller_experience-detail.html">Change Selection</a>
                            </article>

                            <article class="traveler-experience-booking-card">
                                <h2>Traveler Details</h2>
                                <form id="traveler-experience-booking-form" class="traveler-experience-booking-form">
                                    <div class="traveler-experience-form-grid">
                                        ${renderInput("firstName", "First Name *", "Enter first name", state.leadTraveler.firstName)}
                                        ${renderInput("lastName", "Last Name *", "Enter last name", state.leadTraveler.lastName)}
                                    </div>

                                    ${renderInput("email", "Email Address *", "your.email@example.com", state.leadTraveler.email, "email")}
                                    <p class="traveler-experience-field-note">Booking confirmation will be sent to this email</p>

                                    ${renderInput("phone", "Phone Number *", "+1 (555) 000-0000", state.leadTraveler.phone, "tel")}
                                    <p class="traveler-experience-field-note">For pickup coordination and updates</p>

                                    ${renderTextarea("requests", "Special Requests (Optional)", "E.g., dietary requirements, accessibility needs, etc.", state.leadTraveler.requests)}
                                    <p class="traveler-experience-field-note">We'll do our best to accommodate your requests</p>

                                    <div class="traveler-experience-traveler-block">
                                        <h3>Travelers</h3>
                                        <div class="traveler-experience-traveler-grid">
                                            ${state.travelers.map((traveler, index) => `
                                                <article class="traveler-experience-traveler-card">
                                                    <h4>Traveler ${index + 1}</h4>
                                                    <label>
                                                        <span>Name</span>
                                                        <input type="text" data-traveler-field="name" data-traveler-index="${index}" value="${escapeHtml(traveler.name)}" placeholder="Traveler name">
                                                    </label>
                                                    <label>
                                                        <span>Age</span>
                                                        <input type="number" min="1" max="120" data-traveler-field="age" data-traveler-index="${index}" value="${escapeHtml(traveler.age)}" placeholder="Age">
                                                    </label>
                                                    <label>
                                                        <span>Gender</span>
                                                        <select data-traveler-field="gender" data-traveler-index="${index}">
                                                            <option value="">Select gender</option>
                                                            <option value="Male" ${traveler.gender === "Male" ? "selected" : ""}>Male</option>
                                                            <option value="Female" ${traveler.gender === "Female" ? "selected" : ""}>Female</option>
                                                            <option value="Other" ${traveler.gender === "Other" ? "selected" : ""}>Other</option>
                                                        </select>
                                                    </label>
                                                </article>
                                            `).join("")}
                                        </div>
                                    </div>

                                    <div class="traveler-experience-payment-info">
                                        ${infoCircleIcon()}
                                        <div>
                                            <strong>Secure Online Payment</strong>
                                            <p>Pay securely online with Razorpay (Test Mode). Your activity reservation is instantly confirmed upon payment.</p>
                                        </div>
                                    </div>
                                </form>
                            </article>
                        </div>

                        <aside class="traveler-experience-booking-summary">
                            <h2>Booking Summary</h2>
                            <h3>${escapeHtml(state.draft.experience.title)}</h3>
                            <div class="traveler-experience-summary-rating">
                                <strong>${starIcon()} ${Number(state.draft.experience.rating).toFixed(1)}</strong>
                                <span>(${state.draft.experience.reviews} reviews)</span>
                            </div>
                            <p>${locationIcon()} ${escapeHtml(state.draft.experience.location || state.draft.experience.destination)}</p>

                            <div class="traveler-experience-summary-group">
                                <span>Option</span>
                                <strong>${escapeHtml(state.draft.option.title)}</strong>
                                <p>${escapeHtml(state.draft.option.time)}</p>
                            </div>
                            <div class="traveler-experience-summary-group">
                                <span>Date</span>
                                <strong>${escapeHtml(formatBookingDate(state.draft.selectedDate))}</strong>
                            </div>
                            <div class="traveler-experience-summary-group">
                                <span>Travelers</span>
                                <strong>${state.draft.adults} ${state.draft.adults === 1 ? "Adult" : "Adults"}</strong>
                            </div>
                            <div class="traveler-experience-summary-group">
                                <span>Duration</span>
                                <strong>${escapeHtml(state.draft.experience.durationLabel)}</strong>
                            </div>

                            <div class="traveler-experience-summary-group">
                                <span>Price Details</span>
                                <div class="traveler-experience-price-line">
                                    <strong>${formatCurrency(state.draft.option.price)} × ${state.draft.adults} ${state.draft.adults === 1 ? "adult" : "adults"}</strong>
                                    <span>${formatCurrency(baseTotal)}</span>
                                </div>
                                <div class="traveler-experience-price-line">
                                    <strong style="color: #4B5563;">Platform Fee</strong>
                                    <span style="color: #4B5563;">₹14</span>
                                </div>
                            </div>

                            <div class="traveler-experience-total-row">
                                <span>Total Amount</span>
                                <strong>${formatCurrency(total)}</strong>
                            </div>

                            <button type="button" class="traveler-experience-confirm-btn" id="traveler-experience-confirm-btn">
                                ${lockIcon()}
                                <span>Pay ${formatCurrency(total)} & Confirm</span>
                            </button>

                            <ul class="traveler-experience-summary-list">
                                <li>${checkCircleIcon()} Secure payment via Razorpay Test Mode</li>
                                <li>${checkCircleIcon()} Free cancellation up to 24 hours</li>
                                <li>${checkCircleIcon()} Instant confirmation</li>
                            </ul>
                        </aside>
                    </section>
                </div>
            </main>
        `;

        bindEvents();
    }

    function bindEvents() {
        container.querySelectorAll("[data-lead-field]").forEach((input) => {
            input.addEventListener("input", () => {
                state.leadTraveler[input.dataset.leadField] = input.value;
            });
        });

        container.querySelectorAll("[data-traveler-field]").forEach((input) => {
            input.addEventListener("input", () => {
                const index = Number(input.dataset.travelerIndex);
                const field = input.dataset.travelerField;
                state.travelers[index][field] = input.value;
            });

            input.addEventListener("change", () => {
                const index = Number(input.dataset.travelerIndex);
                const field = input.dataset.travelerField;
                state.travelers[index][field] = input.value;
            });
        });

        const confirmBtn = container.querySelector("#traveler-experience-confirm-btn");
        const PLATFORM_FEE = 14;
        const baseTotal = Number(state.draft.totalPrice) || 0;
        const total = baseTotal + PLATFORM_FEE;

        const resetButton = () => {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.dataset.paymentInProgress = "";
                const span = confirmBtn.querySelector("span");
                if (span) {
                    span.textContent = `Pay ${formatCurrency(total)} & Confirm`;
                }
            }
        };

        confirmBtn?.addEventListener("click", async () => {
            const errors = validateBooking(state);
            if (errors.length) {
                showToast(errors[0]);
                return;
            }

            if (!total || total <= 0) {
                showToast("Invalid booking total. Please check options.");
                return;
            }

            if (confirmBtn.dataset.paymentInProgress === "true") return;
            confirmBtn.dataset.paymentInProgress = "true";
            confirmBtn.disabled = true;
            const span = confirmBtn.querySelector("span");
            if (span) span.textContent = "Creating order…";

            const payload = {
                experienceId: state.draft.experience.id,
                guestName: `${state.leadTraveler.firstName} ${state.leadTraveler.lastName}`,
                email: state.leadTraveler.email,
                phone: state.leadTraveler.phone,
                date: state.draft.selectedDate,
                slotId: state.draft.selectedSlot?.id,
                time: state.draft.selectedSlot?.time || state.draft.option.time,
                participants: state.draft.adults
            };

            let orderData;
            try {
                orderData = await createRazorpayOrder(total, {
                    bookingType: "EXPERIENCE",
                    bookingId: String(state.draft.experience.id),
                    notes: {
                        experienceId: String(state.draft.experience.id),
                        date: String(state.draft.selectedDate || ""),
                        option: String(state.draft.option?.title || "")
                    }
                });
            } catch (err) {
                showToast(err?.message || "Failed to create payment order. Please try again.");
                resetButton();
                return;
            }

            resetButton();

            // Open Razorpay Checkout modal
            openRazorpayCheckout(
                orderData,
                `${state.draft.experience.title} — ${state.draft.option.title}`,

                // ✅ Payment succeeded in modal — verify server-side before creating booking
                async (paymentResponse) => {
                    if (confirmBtn) {
                        confirmBtn.disabled = true;
                        const s = confirmBtn.querySelector("span");
                        if (s) s.textContent = "Verifying payment…";
                    }

                    try {
                        await verifyRazorpayPayment({
                            razorpay_order_id: paymentResponse.razorpay_order_id,
                            razorpay_payment_id: paymentResponse.razorpay_payment_id,
                            razorpay_signature: paymentResponse.razorpay_signature
                        });

                        const currentAdminRevenue = Number(localStorage.getItem("superAdminRevenue")) || 0;
                        const commission = total * 0.04;
                        localStorage.setItem("superAdminRevenue", currentAdminRevenue + 14 + commission);

                        const globalBookings = JSON.parse(localStorage.getItem("allPlatformBookings")) || [];
                        const currentUser = JSON.parse(localStorage.getItem("currentUser")) || { name: "Guest", role: "traveler" };
                        globalBookings.push({
                            id: paymentResponse.razorpay_order_id || "BKG-" + Math.floor(Math.random()*10000),
                            user: currentUser.name,
                            role: currentUser.role,
                            amount: total,
                            type: "Experience",
                            date: new Date().toISOString()
                        });
                        localStorage.setItem("allPlatformBookings", JSON.stringify(globalBookings));

                        // Server signature verification passed — create the backend booking record
                        try {
                            const response = await createExperienceBooking(payload);
                            const confirmation = {
                                bookingId: response?.id || createIntegerBookingReference(),
                                confirmedAt: new Date().toISOString(),
                                paymentId: paymentResponse.razorpay_payment_id,
                                orderId: paymentResponse.razorpay_order_id,
                                paymentStatus: "PAID",
                                ...state.draft,
                                totalPrice: total,
                                leadTraveler: { ...state.leadTraveler },
                                travelers: state.travelers.map((traveler) => ({ ...traveler }))
                            };

                            try {
                                localStorage.removeItem(EXPERIENCE_BOOKING_DRAFT_KEY);
                            } catch(e) {}

                            persistExperienceConfirmation(confirmation);
                            window.location.href = "./traveller_experience-confirmation.html";

                        } catch (bookingErr) {
                            console.error("Backend booking creation error:", bookingErr);
                            // Even if booking API had issues, since payment succeeded, save local confirmation and redirect
                            const confirmation = {
                                bookingId: createIntegerBookingReference(),
                                confirmedAt: new Date().toISOString(),
                                paymentId: paymentResponse.razorpay_payment_id,
                                orderId: paymentResponse.razorpay_order_id,
                                paymentStatus: "PAID",
                                ...state.draft,
                                totalPrice: total,
                                leadTraveler: { ...state.leadTraveler },
                                travelers: state.travelers.map((traveler) => ({ ...traveler }))
                            };
                            persistExperienceConfirmation(confirmation);
                            window.location.href = "./traveller_experience-confirmation.html";
                        }

                    } catch (verifyErr) {
                        showToast(verifyErr?.message || "Payment verification failed. Please try again.");
                        resetButton();
                    }
                },

                // ❌ Payment failed or cancelled
                (errorMessage) => {
                    showToast(errorMessage || "Payment was cancelled.");
                    resetButton();
                }
            );
        });
    }

    render();
}


function getExperienceBookingDraft() {
    if (typeof localStorage === "undefined") return null;
    try {
        return JSON.parse(localStorage.getItem(EXPERIENCE_BOOKING_DRAFT_KEY) || "null");
    } catch (error) {
        return null;
    }
}

function persistExperienceBookingDraft(draft) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(EXPERIENCE_BOOKING_DRAFT_KEY, JSON.stringify(draft));
}

function persistExperienceConfirmation(record) {
    if (typeof localStorage === "undefined") return;
    
    // Strip heavy fields from the experience to avoid QuotaExceededError
    if (record && record.experience) {
        delete record.experience.gallery;
        delete record.experience.description;
        delete record.experience.highlights;
        delete record.experience.expectations;
        if (record.experience.image && record.experience.image.length > 50000) {
            record.experience.image = ""; // Drop image if it is a massive base64 string
        }
    }

    try {
        localStorage.setItem(EXPERIENCE_CONFIRMATION_KEY, JSON.stringify(record));
    } catch (e) {
        console.warn("Storage full. Attempting to clear space...");
        try { localStorage.removeItem("traveler_selected_experience"); } catch(err){}
        try { localStorage.removeItem(EXPERIENCE_CONFIRMATION_KEY); localStorage.setItem(EXPERIENCE_CONFIRMATION_KEY, JSON.stringify(record)); } catch(err) { console.error("Still failed to save confirmation"); }
    }
}

function validateBooking(state) {
    if (!state.leadTraveler.firstName.trim()) return ["Enter the first name"];
    if (!state.leadTraveler.lastName.trim()) return ["Enter the last name"];
    if (!state.leadTraveler.email.trim()) return ["Enter the email address"];
    if (!state.leadTraveler.phone.trim()) return ["Enter the phone number"];
    const phoneDigits = state.leadTraveler.phone.replace(/\D/g, "");
    if (/^0+$/.test(phoneDigits) || phoneDigits.length < 7 || phoneDigits.length > 15) {
        return ["Enter a valid phone number (7-15 digits)"];
    }

    for (let index = 0; index < state.travelers.length; index += 1) {
        const traveler = state.travelers[index];
        if (!traveler.name.trim()) return [`Enter the name for traveler ${index + 1}`];
        if (!traveler.age) return [`Enter the age for traveler ${index + 1}`];
        if (!traveler.gender) return [`Select the gender for traveler ${index + 1}`];
    }

    return [];
}

function createIntegerBookingReference() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 900000) + 100000;
    return Number(`${year}${random}`);
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

function formatBookingDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function renderInput(field, label, placeholder, value, type = "text") {
    return `
        <label class="traveler-experience-field">
            <span>${label}</span>
            <div class="traveler-experience-input-wrap">
                ${type === "email" ? mailIcon() : type === "tel" ? phoneIcon() : userIcon()}
                <input type="${type}" data-lead-field="${field}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">
            </div>
        </label>
    `;
}

function renderTextarea(field, label, placeholder, value) {
    return `
        <label class="traveler-experience-field">
            <span>${label}</span>
            <textarea data-lead-field="${field}" rows="5" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>
        </label>
    `;
}

function renderExperienceIcon(category) {
    return category?.includes("Water") ? wavesIcon() :
        category === "Cruises" ? sparkleIcon() :
        category === "Attraction Tickets" ? ticketIcon() :
        category === "Culture" ? compassIcon() :
        sunriseIcon();
}

function showToast(message) {
    const existing = document.querySelector(".traveler-experience-toast");
    existing?.remove();

    const toast = document.createElement("div");
    toast.className = "traveler-experience-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("visible"));
    window.setTimeout(() => {
        toast.classList.remove("visible");
        window.setTimeout(() => toast.remove(), 180);
    }, 1800);
}

function checkIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"></circle><path d="m8.5 12 2.2 2.2 4.8-4.8"></path></svg>`;
}

function checkCircleIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="m8.5 12 2.2 2.2 4.8-4.8"></path></svg>`;
}

function starIcon() {
    return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.5 2.93 5.93 6.55.95-4.74 4.62 1.12 6.53L12 17.47l-5.86 3.06 1.12-6.53-4.74-4.62 6.55-.95L12 2.5z"></path></svg>`;
}

function locationIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
}

function clockIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
}

function sunriseIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="2" x2="12" y2="9"></line><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line><line x1="1" y1="18" x2="23" y2="18"></line><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line></svg>`;
}

function compassIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`;
}

function wavesIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 9c1.5 1 3 1 4.5 0S9.5 8 11 9s3 1 4.5 0S18.5 8 20 9s2.5 1 2.5 1"></path><path d="M2 15c1.5 1 3 1 4.5 0S9.5 14 11 15s3 1 4.5 0 3-1 4.5 0 2.5 1 2.5 1"></path></svg>`;
}

function sparkleIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"></path></svg>`;
}

function ticketIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V8z"></path><path d="M13 6v12"></path></svg>`;
}

function infoCircleIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`;
}

function lockIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
}

function userIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
}

function mailIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"></path><path d="m4 7 8 6 8-6"></path></svg>`;
}

function phoneIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.78 19.78 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.78 19.78 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.34 2.74a2 2 0 0 1-.57 1.72L7.1 9.9a16 16 0 0 0 7 7l1.72-1.78a2 2 0 0 1 1.72-.57l2.74.34A2 2 0 0 1 22 16.92z"></path></svg>`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
