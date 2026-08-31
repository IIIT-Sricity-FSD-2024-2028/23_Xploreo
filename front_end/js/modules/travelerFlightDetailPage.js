const SELECTED_FLIGHT_KEY = "traveler_selected_flight";
const FLIGHT_WISHLIST_KEY = "traveler_flight_wishlist";
const SEARCH_STORAGE_KEY = "traveler_dashboard_search_state";
const CONFIRMED_BOOKING_KEY = "traveler_confirmed_booking";
const CONFIRMED_BOOKING_SESSION_KEY = "traveler_confirmed_booking_session";
const DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=1600";
import { travelerData } from "../api/legacyData.js";

export function renderTravelerFlightDetailPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const selectedFlight = getSelectedFlight();
    if (!selectedFlight) {
        container.innerHTML = `
            <main class="flight-detail-page">
                <div class="flight-detail-empty">
                    <h1>No flight selected</h1>
                    <p>Choose a flight from the search results page first.</p>
                    <a class="flight-detail-back-link" href="./traveller_flight-search.html">Back to flight search</a>
                </div>
            </main>
        `;
        return;
    }

    const status = new URLSearchParams(window.location.search).get("status")?.trim().toLowerCase() || "";
    const isBooked = status === "completed" || status === "upcoming";
    const totalAmount = selectedFlight.price + selectedFlight.taxes;
    const travelerForm = selectedFlight.travelerDetails || getTravelerFormDefaults();

    container.innerHTML = `
        <main class="flight-detail-page">
            <div class="flight-detail-frame">
                <section class="flight-detail-hero" style="background-image: linear-gradient(rgba(20, 29, 45, 0.52), rgba(20, 29, 45, 0.52)), url('${selectedFlight.heroImage || DEFAULT_HERO_IMAGE}')">
                    <div class="flight-detail-hero-content">
                        <span class="flight-detail-type-chip">${selectedFlight.type}</span>
                        <h1>${selectedFlight.routeLabel}</h1>
                    </div>
                    <div class="flight-detail-hero-actions">
                        <button class="flight-icon-btn" id="share-flight-btn" aria-label="Share flight">↗</button>
                    </div>
                </section>

                <section class="flight-detail-layout">
                    <div class="flight-detail-main">
                        <article class="flight-detail-card">
                            <h2>Flight Details</h2>
                            <div class="flight-summary-row">
                                <div class="flight-terminal-block">
                                    <strong>${selectedFlight.departureTime}</strong>
                                    <span>${selectedFlight.fromLabel}</span>
                                    <small>${formatLongDate(selectedFlight.departureDate)}</small>
                                </div>
                                <div class="flight-summary-center">
                                    <strong>${selectedFlight.duration}</strong>
                                    <div class="flight-route-line"><span class="flight-route-plane">✈</span></div>
                                    <span>${selectedFlight.stops}</span>
                                </div>
                                <div class="flight-terminal-block align-right">
                                    <strong>${selectedFlight.arrivalTime}</strong>
                                    <span>${selectedFlight.toLabel}</span>
                                    <small>${formatArrivalDate(selectedFlight.departureDate, selectedFlight.duration)}</small>
                                </div>
                            </div>
                            <div class="flight-detail-divider"></div>
                            <div class="flight-meta-grid">
                                <div>
                                    <span>Airline</span>
                                    <strong>${selectedFlight.airline}</strong>
                                    <small>${selectedFlight.flightNumber}</small>
                                </div>
                                <div>
                                    <span>Class</span>
                                    <strong>${selectedFlight.classType}</strong>
                                </div>
                                <div>
                                    <span>Baggage</span>
                                    <strong>${selectedFlight.baggage}</strong>
                                </div>
                            </div>
                        </article>

                        <article class="flight-detail-card fare-card">
                            <h2>Fare Details</h2>
                            <div class="fare-line-item">
                                <span>Base Fare</span>
                                <strong>₹${selectedFlight.price}</strong>
                            </div>
                            <div class="fare-line-item">
                                <span>Taxes & Fees</span>
                                <strong>₹${selectedFlight.taxes}</strong>
                            </div>
                            <div class="flight-detail-divider"></div>
                            <div class="fare-line-item total">
                                <span>Total Amount</span>
                                <strong>₹${totalAmount}</strong>
                            </div>
                        </article>
                    </div>

                    <aside class="flight-detail-side">
                        <article class="flight-price-card">
                            <div class="price-row">
                                <strong>₹${selectedFlight.price}</strong>
                                <span>per person</span>
                            </div>
                            <div class="price-save-row">
                                <span class="old-price">₹${selectedFlight.originalFare}</span>
                                <span class="save-amount">Save ₹${selectedFlight.originalFare - selectedFlight.price}</span>
                            </div>

                            <div class="passenger-box">
                                <span>Passengers</span>
                                <strong>${selectedFlight.passengers}</strong>
                            </div>

                            <div class="flight-traveler-form">
                                <h3>Traveler Details</h3>
                                ${isBooked ? `
                                <div class="flight-traveler-grid">
                                    <div class="flight-traveler-field">
                                        <span>Full Name</span>
                                        <div style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; color: #0f172a; font-weight: 500;">${escapeAttribute(travelerForm.fullName)}</div>
                                    </div>
                                    <div class="flight-traveler-field">
                                        <span>Email</span>
                                        <div style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; color: #0f172a; font-weight: 500;">${escapeAttribute(travelerForm.email)}</div>
                                    </div>
                                    <div class="flight-traveler-field">
                                        <span>Phone Number</span>
                                        <div style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; color: #0f172a; font-weight: 500;">${escapeAttribute(travelerForm.phone)}</div>
                                    </div>
                                    <div class="flight-traveler-field">
                                        <span>Gender</span>
                                        <div style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; color: #0f172a; font-weight: 500;">${escapeAttribute(travelerForm.gender)}</div>
                                    </div>
                                </div>
                                ` : `
                                <div class="flight-traveler-grid">
                                    <label class="flight-traveler-field">
                                        <span>Full Name</span>
                                        <input type="text" id="flight-traveler-name" placeholder="Enter traveler name" value="${escapeAttribute(travelerForm.fullName)}">
                                    </label>
                                    <label class="flight-traveler-field">
                                        <span>Email</span>
                                        <input type="email" id="flight-traveler-email" placeholder="Enter email" value="${escapeAttribute(travelerForm.email)}">
                                    </label>
                                    <label class="flight-traveler-field">
                                        <span>Phone Number</span>
                                        <input type="tel" id="flight-traveler-phone" placeholder="Enter phone number" value="${escapeAttribute(travelerForm.phone)}">
                                    </label>
                                    <label class="flight-traveler-field">
                                        <span>Gender</span>
                                        <select id="flight-traveler-gender">
                                            ${renderGenderOption("Male", travelerForm.gender)}
                                            ${renderGenderOption("Female", travelerForm.gender)}
                                            ${renderGenderOption("Other", travelerForm.gender)}
                                        </select>
                                    </label>
                                </div>
                                <p class="flight-traveler-error" id="flight-traveler-error"></p>
                                `}
                            </div>

                            ${isBooked ? "" : `<button class="book-now-btn" id="book-flight-btn">Book Now →</button>`}
                            <p class="flight-note">${selectedFlight.cancellation}</p>
                            <p class="flight-confirm">${selectedFlight.confirmation}</p>
                        </article>
                    </aside>
                </section>
            </div>
        </main>
    `;

    bindEvents(selectedFlight);
}

function bindEvents(selectedFlight) {
    document.getElementById("share-flight-btn")?.addEventListener("click", async () => {
        const shareLink = window.location.href;
        const copied = await copyText(shareLink);
        showFlightDetailToast(
            copied
                ? "Share link copied to clipboard"
                : `Copy this link: ${shareLink}`
        );
    });

    document.getElementById("book-flight-btn")?.addEventListener("click", () => {
        const travelerDetails = getTravelerFormValues();
        const validationError = validateTravelerForm(travelerDetails);

        if (validationError) {
            const errorNode = document.getElementById("flight-traveler-error");
            if (errorNode) errorNode.textContent = validationError;
            showFlightDetailToast("Please complete traveler details");
            return;
        }

        const errorNode = document.getElementById("flight-traveler-error");
        if (errorNode) errorNode.textContent = "";

        const bookingPayload = buildConfirmedBookingPayload(selectedFlight, travelerDetails);
        if (typeof localStorage !== "undefined") {
            localStorage.setItem(CONFIRMED_BOOKING_KEY, JSON.stringify(bookingPayload));
        }
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(CONFIRMED_BOOKING_SESSION_KEY, JSON.stringify(bookingPayload));
        }
        window.location.href = "./traveller_booking-confirmation.html";
    });
}

function getSelectedFlight() {
    const flightId = getFlightIdFromUrl();
    const storedFlight = getStoredSelectedFlight();

    if (storedFlight && (!flightId || storedFlight.id === flightId)) {
        return storedFlight;
    }

    if (flightId) {
        const fallback = buildFlightPayloadFromId(flightId);
        if (fallback && typeof localStorage !== "undefined") {
            localStorage.setItem(SELECTED_FLIGHT_KEY, JSON.stringify(fallback));
        }
        return fallback;
    }

    return storedFlight;
}

function getStoredSelectedFlight() {
    if (typeof localStorage === "undefined") {
        return null;
    }

    try {
        return JSON.parse(localStorage.getItem(SELECTED_FLIGHT_KEY) || "null");
    } catch (error) {
        console.warn("Unable to read selected flight", error);
        return null;
    }
}

function buildFlightPayloadFromId(flightId) {
    const flight = travelerData.searchCatalog.flights.find(item => item.id === flightId);
    if (!flight) {
        return null;
    }

    const searchState = getStoredSearchState();
    const searchValues = searchState.values?.flights || {};
    const passengers = parsePassengerSummary(searchValues.travellers || "1 Traveller, Economy");
    const baseFare = getNumericPrice(flight.price);
    const taxes = Math.round(baseFare * 0.12);
    const originalFare = baseFare + 150;

    return {
        id: flight.id,
        airline: flight.airline,
        flightNumber: flight.flightNumber || flight.id.toUpperCase(),
        routeLabel: `${searchValues.from || flight.origin} → ${searchValues.to || flight.destination}`,
        fromLabel: searchValues.from || flight.origin,
        toLabel: searchValues.to || flight.destination,
        fromCode: getAirportCode(searchValues.from || flight.origin),
        toCode: getAirportCode(searchValues.to || flight.destination),
        departureDate: searchValues.departure || flight.departure,
        returnDate: searchValues.returnDate || "",
        departureTime: getDisplayTime(flight, "departure"),
        arrivalTime: getDisplayTime(flight, "arrival"),
        duration: flight.duration,
        stops: flight.stops,
        classType: flight.classType,
        price: baseFare,
        originalFare,
        taxes,
        passengers,
        baggage: "2 pieces (23kg each)",
        cancellation: "Free cancellation up to 24 hours before departure",
        confirmation: "Instant confirmation",
        heroImage: DEFAULT_HERO_IMAGE,
        type: "Flight"
    };
}

function getStoredSearchState() {
    if (typeof localStorage === "undefined") {
        return {};
    }

    try {
        return JSON.parse(localStorage.getItem(SEARCH_STORAGE_KEY) || "{}");
    } catch (error) {
        return {};
    }
}

function getFlightIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("flight");
}

function getFlightWishlist() {
    if (typeof localStorage === "undefined") {
        return [];
    }

    try {
        return JSON.parse(localStorage.getItem(FLIGHT_WISHLIST_KEY) || "[]");
    } catch (error) {
        return [];
    }
}

async function copyText(value) {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch (error) {
        console.warn("Clipboard API unavailable", error);
    }

    try {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        return copied;
    } catch (error) {
        console.warn("execCommand copy failed", error);
        return false;
    }
}

function formatLongDate(dateString) {
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

function showFlightDetailToast(message) {
    let toast = document.getElementById("wishlist-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "wishlist-toast";
        toast.className = "toast-notification";
        toast.innerHTML = `<span id="toast-message"></span>`;
        document.body.appendChild(toast);
    }

    document.getElementById("toast-message").textContent = message;
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");

    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove("show");
    }, 2400);
}

function getNumericPrice(price) {
    return Number(String(price).replace(/[^\d]/g, ""));
}

function parsePassengerSummary(summary) {
    const countMatch = String(summary).match(/(\d+)/);
    const count = countMatch ? Number(countMatch[1]) : 1;
    return `${count} ${count === 1 ? "Adult" : "Adults"}`;
}

function getAirportCode(value) {
    const match = String(value).match(/\(([A-Z]{3})\)/);
    if (match) return match[1];
    return String(value).slice(0, 3).toUpperCase();
}

function getDurationMinutes(duration) {
    const match = duration.match(/(\d+)h\s*(\d+)m/);
    if (!match) return 9999;
    return Number(match[1]) * 60 + Number(match[2]);
}

function getDisplayTime(flight, type) {
    return type === "departure" ? flight.departureTime : flight.arrivalTime;
}

function buildConfirmedBookingPayload(selectedFlight, travelerDetails) {
    const bookedOn = new Date();
    const bookingId = Number(`${bookedOn.getFullYear()}${String(Math.floor(Math.random() * 9000) + 1000)}`);

    return {
        ...selectedFlight,
        bookingId,
        bookedOn: bookedOn.toISOString(),
        totalAmount: selectedFlight.price + selectedFlight.taxes,
        travelerDetails: travelerDetails || null,
        whatsNext: [
            "Confirmation email sent to your inbox",
            "Booking details saved in My Trips",
            "Download tickets 24 hours before departure"
        ]
    };
}

function getTravelerFormDefaults() {
    if (typeof localStorage === "undefined") {
        return { fullName: "", email: "", phone: "", gender: "Male" };
    }

    try {
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
        return {
            fullName: currentUser?.name || currentUser?.fullName || "",
            email: currentUser?.email || "",
            phone: currentUser?.phone || "",
            gender: currentUser?.gender || "Male"
        };
    } catch (error) {
        return { fullName: "", email: "", phone: "", gender: "Male" };
    }
}

function renderGenderOption(value, selectedValue) {
    return `<option value="${value}" ${value === selectedValue ? "selected" : ""}>${value}</option>`;
}

function getTravelerFormValues() {
    return {
        fullName: String(document.getElementById("flight-traveler-name")?.value || "").trim(),
        email: String(document.getElementById("flight-traveler-email")?.value || "").trim(),
        phone: String(document.getElementById("flight-traveler-phone")?.value || "").trim(),
        gender: String(document.getElementById("flight-traveler-gender")?.value || "").trim()
    };
}

function validateTravelerForm(details) {
    if (!details.fullName) return "Enter the traveler full name.";
    if (!details.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) return "Enter a valid email address.";
    const phoneDigits = details.phone.replace(/[^\d]/g, "");
    if (!details.phone || phoneDigits.length < 8 || /^0+$/.test(phoneDigits)) return "Enter a valid phone number.";
    if (!details.gender) return "Select a gender.";
    return "";
}

function escapeAttribute(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
