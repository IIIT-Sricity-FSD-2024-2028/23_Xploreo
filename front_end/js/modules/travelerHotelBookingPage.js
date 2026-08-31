import { getHotelDetailDataById } from "./travelerHotelDetailPage.js";
import { getTravelerProfile } from "../utils/travelerWorkspaceState.js";

const SEARCH_STORAGE_KEY = "traveler_dashboard_search_state";
const HOTEL_CONFIRMATION_PAGE = "./traveller_hotel-confirmation.html";

export async function renderTravelerHotelBookingPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const hotel = await getSelectedHotel();
    const searchValues = getSearchValues();
    const selectedRoom = getSelectedRoom(hotel);
    const guestProfile = buildGuestProfile(hotel, selectedRoom);
    const stayNights = getStayNights(searchValues.checkIn, searchValues.checkOut);
    const roomCount = Math.max(1, Number.parseInt(searchValues.rooms, 10) || 1);
    const guestCount = Math.max(1, Number.parseInt(searchValues.guestCount, 10) || 2);
    const roomSubtotal = selectedRoom.price * stayNights * roomCount;
    const taxTotal = hotel.taxes * roomCount;
    const totalAmount = roomSubtotal + taxTotal;

    container.innerHTML = `
        <main class="traveler-hotel-booking-page">
            <div class="traveler-hotel-booking-frame">
                <div class="traveler-booking-stepper">
                    <div class="traveler-booking-step completed">
                        <span class="traveler-booking-step-badge">${icon("check")}</span>
                        <span>Select Room</span>
                    </div>
                    <div class="traveler-booking-step-line active"></div>
                    <div class="traveler-booking-step active">
                        <span class="traveler-booking-step-badge">2</span>
                        <span>Guest Details</span>
                    </div>
                    <div class="traveler-booking-step-line"></div>
                    <div class="traveler-booking-step">
                        <span class="traveler-booking-step-badge">3</span>
                        <span>Confirmation</span>
                    </div>
                </div>

                <section class="traveler-hotel-booking-layout">
                    <div class="traveler-booking-sections">
                        <section class="traveler-booking-main-card">
                            <h2>Guest Details</h2>
                            <div class="traveler-booking-field-grid">
                                ${Array.from({ length: guestCount }).map((_, index) => `
                                    <div class="traveler-booking-field-group" style="width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; grid-column: 1 / -1; margin-bottom: 8px;">
                                        <div class="traveler-booking-field" style="grid-column: 1 / 2;">
                                            <label>Guest ${index + 1} First Name *</label>
                                            <div class="traveler-booking-input with-icon">${icon("user")}<input type="text" data-guest-first-name value="${index === 0 ? escapeHtml(guestProfile.firstName) : ''}" placeholder="Enter first name"></div>
                                        </div>
                                        <div class="traveler-booking-field" style="grid-column: 2 / 3;">
                                            <label>Guest ${index + 1} Last Name *</label>
                                            <div class="traveler-booking-input with-icon">${icon("user")}<input type="text" data-guest-last-name value="${index === 0 ? escapeHtml(guestProfile.lastName) : ''}" placeholder="Enter last name"></div>
                                        </div>
                                    </div>
                                `).join('')}
                                <div class="traveler-booking-field full">
                                    <label>Primary Email Address *</label>
                                    <div class="traveler-booking-input with-icon">${icon("mail")}<input type="email" value="${escapeHtml(guestProfile.email)}" placeholder="your.email@example.com"></div>
                                    <div class="traveler-booking-help">Booking confirmation will be sent to this email</div>
                                </div>
                                <div class="traveler-booking-field full">
                                    <label>Primary Phone Number *</label>
                                    <div class="traveler-booking-input with-icon">${icon("phone")}<input type="text" value="${escapeHtml(guestProfile.phone)}" placeholder="+1 (555) 000-0000"></div>
                                </div>
                                <div class="traveler-booking-field full">
                                    <label>Special Requests (Optional)</label>
                                    <textarea class="traveler-booking-textarea" placeholder="E.g., High floor room, early check-in, etc.">${escapeHtml(guestProfile.specialRequest)}</textarea>
                                    <div class="traveler-booking-help">Subject to availability</div>
                                </div>
                            </div>
                        </section>

                        <section class="traveler-booking-section-card">
                            <h2>Stay Details</h2>
                            <div class="traveler-booking-stay-grid">
                                <div class="traveler-booking-info-box">
                                    ${icon("calendar")}
                                    <div class="traveler-booking-info-copy">
                                        <span>Check-in</span>
                                        <strong>${formatLongDate(searchValues.checkIn)}</strong>
                                        <small>After 3:00 PM</small>
                                    </div>
                                </div>
                                <div class="traveler-booking-info-box">
                                    ${icon("calendar-blue")}
                                    <div class="traveler-booking-info-copy">
                                        <span>Check-out</span>
                                        <strong>${formatLongDate(searchValues.checkOut)}</strong>
                                        <small>Before 11:00 AM</small>
                                    </div>
                                </div>
                                <div class="traveler-booking-info-box" style="grid-column:1 / -1;">
                                    ${icon("guests-teal")}
                                    <div class="traveler-booking-info-copy">
                                        <span>Guests</span>
                                        <strong>${guestCount} Guest${guestCount === 1 ? "" : "s"} • ${roomCount} ${roomCount === 1 ? "Room" : "Rooms"}</strong>
                                        <small>${stayNights} ${stayNights === 1 ? "night" : "nights"}</small>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section class="traveler-booking-note">
                            ${icon("info")}
                            <div>
                                <strong>Payment at Hotel</strong>
                                <p>No payment required now. You'll pay directly at the hotel upon arrival. Your booking is guaranteed with these details.</p>
                            </div>
                        </section>
                    </div>

                    <aside class="traveler-booking-summary-card">
                        <h2>Booking Summary</h2>
                        <div class="traveler-booking-summary-title">${escapeHtml(hotel.title)}</div>
                        <div class="traveler-booking-summary-rating">
                            <span class="traveler-booking-summary-stars">${"★".repeat(hotel.stars)}</span>
                            <span class="traveler-booking-summary-score">${hotel.rating.toFixed(1)}</span>
                        </div>
                        <div class="traveler-booking-summary-location">${icon("location")}<span>${escapeHtml(hotel.area)}</span></div>

                        <div class="traveler-booking-summary-divider"></div>

                        <div class="traveler-booking-summary-grid">
                            <div style="grid-column:1 / -1;">
                                <span>Room Type</span>
                                <strong>${escapeHtml(selectedRoom.name)}</strong>
                            </div>
                            <div>
                                <span>Check-in</span>
                                <strong>${formatLongDate(searchValues.checkIn)}</strong>
                            </div>
                            <div>
                                <span>Check-out</span>
                                <strong>${formatLongDate(searchValues.checkOut)}</strong>
                            </div>
                            <div style="grid-column:1 / -1;">
                                <span>Guests</span>
                                <strong>${guestCount} Guest${guestCount === 1 ? "" : "s"} • ${roomCount} ${roomCount === 1 ? "Room" : "Rooms"} • ${stayNights} ${stayNights === 1 ? "night" : "nights"}</strong>
                            </div>
                        </div>

                        <div class="traveler-booking-summary-divider"></div>

                        <div class="traveler-booking-price-rows">
                            <div class="traveler-booking-price-row">
                                <span>₹${selectedRoom.price} × ${stayNights} ${stayNights === 1 ? "night" : "nights"} × ${roomCount} ${roomCount === 1 ? "room" : "rooms"}</span>
                                <strong>₹${roomSubtotal}</strong>
                            </div>
                            <div class="traveler-booking-price-row">
                                <span>Taxes & fees</span>
                                <strong>₹${taxTotal}</strong>
                            </div>
                            <div class="traveler-booking-total-row">
                                <span>Total Amount</span>
                                <strong>₹${totalAmount}</strong>
                            </div>
                        </div>

                        <button class="traveler-booking-confirm" type="button">${icon("lock")}Confirm Booking</button>

                        <ul class="traveler-booking-features">
                            <li>${icon("check")}No payment required now</li>
                            <li>${icon("check")}Free cancellation up to 24 hours</li>
                            <li>${icon("check")}Instant confirmation</li>
                        </ul>
                    </aside>
                </section>
            </div>
        </main>
    `;

    bindEvents();
}

function bindEvents() {
    document.querySelector(".traveler-booking-confirm")?.addEventListener("click", () => {
        const guestFirstNames = Array.from(document.querySelectorAll("[data-guest-first-name]")).map(el => el.value.trim());
        const guestLastNames = Array.from(document.querySelectorAll("[data-guest-last-name]")).map(el => el.value.trim());
        const email = document.querySelector('input[type="email"]')?.value.trim();
        const phone = document.querySelector('input[type="text"][placeholder="+1 (555) 000-0000"]')?.value.trim() || document.querySelector('input[type="tel"]')?.value.trim();

        // Validation logic
        const hasEmptyName = guestFirstNames.some(name => !name) || guestLastNames.some(name => !name);
        if (hasEmptyName) {
            alert("Please fill in all guest names before proceeding.");
            return;
        }

        const nameRegex = /^[a-zA-Z\s\-']+$/;
        const hasInvalidName = guestFirstNames.some(name => !nameRegex.test(name)) || guestLastNames.some(name => !nameRegex.test(name));
        if (hasInvalidName) {
            alert("Guest names must only contain letters, spaces, hyphens, and apostrophes.");
            return;
        }
        if (!email) {
            alert("Please provide a primary email address.");
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("Please provide a valid email address.");
            return;
        }

        if (!phone) {
            alert("Please provide a primary phone number.");
            return;
        }
        
        const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
        if (!phoneRegex.test(phone)) {
            alert("Please provide a valid phone number.");
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const hotelId = params.get("hotel") || "grand-luxury";
        const roomId = params.get("room");
        const guests = guestFirstNames.map((first, i) => ({ firstName: first, lastName: guestLastNames[i] }));
        localStorage.setItem("traveler_booking_guest_details", JSON.stringify(guests));

        const nextUrl = roomId
            ? `${HOTEL_CONFIRMATION_PAGE}?hotel=${encodeURIComponent(hotelId)}&room=${encodeURIComponent(roomId)}`
            : `${HOTEL_CONFIRMATION_PAGE}?hotel=${encodeURIComponent(hotelId)}`;
        window.location.assign(nextUrl);
    });
}

async function getSelectedHotel() {
    const params = new URLSearchParams(window.location.search);
    const hotelId = params.get("hotel");
    return await getHotelDetailDataById(hotelId);
}

function getSelectedRoom(hotel) {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("room");
    return hotel.rooms.find((room) => room.id === roomId) || hotel.rooms.find((room) => room.selected) || hotel.rooms[0];
}

function getSearchValues() {
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const fourDaysLater = new Date(today); fourDaysLater.setDate(today.getDate() + 4);
    const fallback = {
        checkIn: tomorrow.toISOString().slice(0, 10),
        checkOut: fourDaysLater.toISOString().slice(0, 10),
        rooms: "1",
        guestCount: "2"
    };

    if (typeof localStorage === "undefined") {
        return fallback;
    }

    try {
        const stored = JSON.parse(localStorage.getItem(SEARCH_STORAGE_KEY) || "{}");
        const values = stored.values?.hotels || {};
        return {
            checkIn: values.checkIn || fallback.checkIn,
            checkOut: values.checkOut || fallback.checkOut,
            rooms: values.rooms || fallback.rooms,
            guestCount: values.guestCount || fallback.guestCount
        };
    } catch (error) {
        return fallback;
    }
}


function formatLongDate(value) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

function getStayNights(checkIn, checkOut) {
    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
    return diff > 0 ? diff : 1;
}

function parseGuestCount(value) {
    const match = String(value || "").match(/(\d+)/);
    return match ? match[1] : "";
}

function buildGuestProfile(hotel, selectedRoom) {
    const currentTraveler = getCurrentTraveler();
    const nameParts = (currentTraveler.name || "Saanvi Kapoor").split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";
    
    return {
        firstName: firstName,
        lastName: lastName,
        email: currentTraveler.email || "saanvi.kapoor@example.com",
        phone: currentTraveler.phone || "+91 98111 22334",
        specialRequest: `High floor ${selectedRoom.name.toLowerCase()}, quiet side if available, and an early check-in request.`
    };
}

function hashValue(value) {
    return [...String(value || "")].reduce((total, char) => total + char.charCodeAt(0), 0);
}

function getCurrentTraveler() {
    if (typeof localStorage === "undefined") {
        return { id: "traveler-fallback", name: "Traveler", email: "", phone: "" };
    }

    try {
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
        if (!currentUser || !currentUser.role) {
            return { id: "traveler-fallback", name: "Traveler", email: "", phone: "" };
        }
        return currentUser;
    } catch (error) {
        return { id: "traveler-fallback", name: "Traveler", email: "", phone: "" };
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function icon(name) {
    const icons = {
        check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m8 12 2.5 2.5L16 9"></path></svg>`,
        user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
        mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></svg>`,
        phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.63 2.61a2 2 0 0 1-.45 2.11L8 9.7a16 16 0 0 0 6.3 6.3l1.26-1.29a2 2 0 0 1 2.11-.45c.83.3 1.71.51 2.61.63A2 2 0 0 1 22 16.92Z"></path></svg>`,
        calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="#15b9b1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"></rect><path d="M8 2v4M16 2v4M3 10h18"></path></svg>`,
        "calendar-blue": `<svg viewBox="0 0 24 24" fill="none" stroke="#2f62ea" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"></rect><path d="M8 2v4M16 2v4M3 10h18"></path></svg>`,
        "guests-teal": `<svg viewBox="0 0 24 24" fill="none" stroke="#0ebbb0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="10" cy="7" r="3"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 4.13a3 3 0 0 1 0 5.74"></path></svg>`,
        location: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z"></path><circle cx="12" cy="11" r="2.5"></circle></svg>`,
        lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>`,
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`,
        utensils: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 2.21 1.79 4 4 4V2"></path><path d="M7 2v20"></path><path d="M21 15V2a5 5 0 0 0-5 5v8"></path><path d="M16 15v7"></path></svg>`,
        clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>`,
        car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16H9m10 0h2v-3l-1.5-4.5A2 2 0 0 0 17.6 7H6.4a2 2 0 0 0-1.9 1.5L3 13v3h2"></path><circle cx="6.5" cy="16.5" r="2.5"></circle><circle cx="17.5" cy="16.5" r="2.5"></circle></svg>`,
        shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 5 3.5 8.5 7 9 3.5-.5 7-4 7-9V6l-7-3Z"></path><path d="m9.5 12 1.5 1.5L14.5 10"></path></svg>`,
        coffee: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 0 1 0 8h-1"></path><path d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z"></path><path d="M6 2v2M10 2v2M14 2v2"></path></svg>`
    };
    return icons[name] || icons.check;
}
