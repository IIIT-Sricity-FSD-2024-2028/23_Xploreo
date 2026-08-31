import { getHotelDetailDataById } from "./travelerHotelDetailPage.js";

const SEARCH_STORAGE_KEY = "traveler_dashboard_search_state";
const MY_TRIPS_PAGE = "./traveller_mytrips.html";
const EXPLORE_PAGE = "./traveller_dashboard.html";

export async function renderTravelerHotelConfirmationPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const hotel = await getSelectedHotel();
    const searchValues = getSearchValues();
    const selectedRoom = getSelectedRoom(hotel);
    const locationLabel = getLocationLabel(hotel);
    const stayNights = getDurationNights(searchValues.checkIn, searchValues.checkOut);
    const roomCount = Number.parseInt(searchValues.rooms, 10) || 1;
    const guestCount = Number.parseInt(searchValues.guestCount, 10) || Number.parseInt(hotel.adults, 10) || 1;
    const roomSubtotal = selectedRoom.price * stayNights * roomCount;
    const taxTotal = Number(hotel.taxes || 0) * roomCount;
    const totalAmount = roomSubtotal + taxTotal;
    const bookingId = `XPL-HTL-${new Date(searchValues.checkIn + "T00:00:00").getFullYear()}-${String(Math.abs(hashCode(hotel.id))).slice(0, 4)}-${Date.now().toString().slice(-4)}`;

    const currentTraveler = getCurrentTraveler();

    // Sync with global Hotel Provider data
    const allHotelBookings = JSON.parse(localStorage.getItem("hotelBookings") || "[]");
    if (!allHotelBookings.find(b => b.id === bookingId)) {
        const hotelRecord = {
            id: bookingId,
            hotelId: hotel.id,
            hotel: hotel.title,
            customer: currentTraveler.name,
            customerId: currentTraveler.id,
            checkIn: searchValues.checkIn,
            checkOut: searchValues.checkOut,
            room: selectedRoom.name,
            guests: guestCount,
            rooms: roomCount,
            amount: totalAmount,
            status: "Upcoming"
        };
        allHotelBookings.push(hotelRecord);
        localStorage.setItem("hotelBookings", JSON.stringify(allHotelBookings));
    }

    addHotelBookingToTravelerTrips({
        id: bookingId,
        hotelId: hotel.id,
        title: hotel.title,
        customerId: currentTraveler.id,
        customer: currentTraveler.name,
        email: currentTraveler.email || "",
        phone: currentTraveler.phone || currentTraveler.phno || "",
        destination: hotel.title,
        location: hotel.area || hotel.city || hotel.title,
        dateTime: `${searchValues.checkIn} | 03:00 PM`,
        status: "Upcoming",
        guests: guestCount,
        amount: totalAmount,
        duration: `${stayNights} nights`,
        coverImage: hotel.image || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800"
    });

    // PUSH BOOKING TO BACKEND SO IT APPEARS FOR THE HOTEL PARTNER
    try {
        const getApiBaseUrl = () => (window.__XPLOREO_API_BASE__ || localStorage.getItem("xploreo_api_base_url") || "http://localhost:3000/api").replace(/\/$/, "");
        
        await fetch(`${getApiBaseUrl()}/bookings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-user-id": currentTraveler.id || "traveler-fallback",
                "x-user-role": "TRAVELLER"
            },
            body: JSON.stringify({
                id: bookingId,
                hotelId: hotel.id,
                guestName: currentTraveler.name || "Guest",
                email: currentTraveler.email || "guest@example.com",
                phone: currentTraveler.phone || currentTraveler.phno || "0000000000",
                checkIn: searchValues.checkIn,
                checkOut: searchValues.checkOut,
                guests: guestCount,
                roomType: selectedRoom.name,
                notes: "Booked via Traveller App",
                totalAmount: totalAmount,
                rooms: roomCount,
                guestNames: JSON.parse(localStorage.getItem("traveler_booking_guest_details") || "[]").map(g => (g.firstName + " " + g.lastName).trim())
            })
        });
    } catch (err) {
        console.error("Failed to sync booking to backend:", err);
    }

    container.innerHTML = `
        <main class="traveler-hotel-confirmation-page">
            <div class="traveler-hotel-confirmation-frame">
                <section class="traveler-hotel-confirmation-hero">
                    <div class="traveler-hotel-confirmation-icon">${icon("confirm")}</div>
                    <h1>Booking Confirmed!</h1>
                    <p>Your trip has been successfully booked</p>
                    <div class="traveler-hotel-confirmation-meta">
                        <span>Booking ID: <strong>${bookingId}</strong></span>
                        <span class="traveler-hotel-confirmation-meta-divider"></span>
                        <span>Booked on: <strong>${formatLongDate(searchValues.checkIn)}</strong></span>
                    </div>
                </section>

                <section class="traveler-hotel-confirmation-layout">
                    <section class="traveler-hotel-confirmation-card">
                        <div class="traveler-hotel-confirmation-heading">
                            ${icon("building")}
                            <h2>Booking Summary</h2>
                        </div>

                        <div class="traveler-hotel-confirmation-property">
                            <strong>${escapeHtml(hotel.title)}</strong>
                            <div class="traveler-hotel-confirmation-location">${icon("location")}<span>${escapeHtml(locationLabel)}</span></div>
                        </div>

                        <div class="traveler-hotel-confirmation-datebar">
                            <div class="traveler-hotel-confirmation-dateblock">
                                <span>Check-in</span>
                                <strong>${formatLongDate(searchValues.checkIn)}</strong>
                            </div>
                            <div class="traveler-hotel-confirmation-arrow">${icon("arrow")}</div>
                            <div class="traveler-hotel-confirmation-dateblock align-right">
                                <span>Check-out</span>
                                <strong>${formatLongDate(searchValues.checkOut)}</strong>
                            </div>
                        </div>

                        <div class="traveler-hotel-confirmation-divider"></div>

                        <div class="traveler-hotel-confirmation-grid">
                            <div>
                                <span>Guests</span>
                                <strong>${guestCount} Guest${guestCount === 1 ? "" : "s"}</strong>
                            </div>
                            <div>
                                <span>Rooms</span>
                                <strong>${roomCount} Room${roomCount === 1 ? "" : "s"}</strong>
                            </div>
                            <div>
                                <span>Room Type</span>
                                <strong>${escapeHtml(selectedRoom.name)}</strong>
                            </div>
                            <div>
                                <span>Duration</span>
                                <strong>${stayNights} Night${stayNights === 1 ? "" : "s"}</strong>
                            </div>
                        </div>
                    </section>

                    <aside class="traveler-hotel-confirmation-side">
                        <section class="traveler-hotel-confirmation-panel">
                            <span class="traveler-hotel-confirmation-panel-arrow" aria-hidden="true">${icon("panel-arrow")}</span>
                            <div class="traveler-hotel-confirmation-panel-top">
                                <span class="traveler-hotel-confirmation-panel-icon">${icon("confirm")}</span>
                                <div>
                                    <h2>Added to My Trips</h2>
                                    <p>This booking is now available in your My Trips dashboard where you can manage all your upcoming adventures.</p>
                                </div>
                            </div>

                            <div class="traveler-hotel-confirmation-mini">
                                <span class="traveler-hotel-confirmation-mini-icon">${icon("building-white")}</span>
                                <div class="traveler-hotel-confirmation-mini-copy">
                                    <span>Hotel</span>
                                    <strong>${escapeHtml(hotel.title)}</strong>
                                    <small>${formatLongDate(searchValues.checkIn)}</small>
                                </div>
                            </div>

                            <button class="traveler-hotel-confirmation-primary" type="button">View My Trips ${icon("arrow-right")}</button>
                            <button class="traveler-hotel-confirmation-secondary" type="button">Continue Exploring</button>
                        </section>

                        <section class="traveler-hotel-confirmation-next">
                            <h2>What's Next?</h2>
                            <ul>
                                <li>${icon("check")}Confirmation email sent to your inbox</li>
                                <li>${icon("check")}Booking details saved in My Trips</li>
                                <li>${icon("check")}Download tickets 24 hours before departure</li>
                            </ul>
                        </section>
                    </aside>
                </section>
            </div>
        </main>
    `;

    bindEvents();
}

function bindEvents() {
    document.querySelector(".traveler-hotel-confirmation-primary")?.addEventListener("click", () => {
        window.location.assign(MY_TRIPS_PAGE);
    });

    document.querySelector(".traveler-hotel-confirmation-secondary")?.addEventListener("click", () => {
        window.location.assign(EXPLORE_PAGE);
    });
}

async function getSelectedHotel() {
    const params = new URLSearchParams(window.location.search);
    return await getHotelDetailDataById(params.get("hotel"));
}

function getSelectedRoom(hotel) {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("room");
    return hotel.rooms.find((room) => room.id === roomId) || hotel.rooms.find((room) => room.selected) || hotel.rooms[0];
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

function addHotelBookingToTravelerTrips(hotelBooking) {
    if (typeof localStorage === "undefined") return;

    try {
        const tourRecord = {
            id: hotelBooking.id,
            bookingId: hotelBooking.id,
            customerId: hotelBooking.customerId,
            customer: hotelBooking.customer,
            email: hotelBooking.email,
            phone: hotelBooking.phone,
            destination: hotelBooking.destination,
            location: hotelBooking.location,
            currentloction: null,
            dateTime: hotelBooking.dateTime,
            dateRange: hotelBooking.dateTime,
            status: hotelBooking.status,
            guests: hotelBooking.guests,
            amount: hotelBooking.amount,
            duration: hotelBooking.duration,
            hotelId: hotelBooking.hotelId,
            title: hotelBooking.title,
            coverImage: hotelBooking.coverImage,
            image: hotelBooking.coverImage,
            plan_iternary: [hotelBooking.room || "Hotel stay"],
            type: "Hotel"
        };

        const allTours = JSON.parse(localStorage.getItem("tours") || "[]");
        if (!allTours.find((item) => String(item.id) === String(hotelBooking.id))) {
            allTours.push(tourRecord);
            localStorage.setItem("tours", JSON.stringify(allTours));
        }

        const myTrips = JSON.parse(localStorage.getItem("traveler_my_trips") || "[]");
        if (!myTrips.find((item) => String(item.id) === String(hotelBooking.id) || String(item.bookingId) === String(hotelBooking.id))) {
            myTrips.push(tourRecord);
            localStorage.setItem("traveler_my_trips", JSON.stringify(myTrips));
        }
    } catch (error) {
        console.warn("Could not save hotel booking to traveler tours", error);
    }
}

function getLocationLabel(hotel) {
    if (hotel.location) return hotel.location;
    if (hotel.area && hotel.city) return `${hotel.area}, ${hotel.city}`;
    if (hotel.area) return hotel.area;
    return "Downtown Mumbai";
}

function getSearchValues() {
    const fallback = {
        checkIn: "2026-03-21",
        checkOut: "2026-03-24",
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

function getDurationNights(checkIn, checkOut) {
    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);
    const diff = Math.round((end - start) / 86400000);
    return diff > 0 ? diff : 3;
}

function hashCode(value) {
    let hash = 0;
    for (const char of String(value)) {
        hash = (hash << 5) - hash + char.charCodeAt(0);
        hash |= 0;
    }
    return hash;
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
        confirm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.5 2.5L17 8"></path></svg>`,
        building: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"></path></svg>`,
        "building-white": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"></path></svg>`,
        location: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z"></path><circle cx="12" cy="11" r="2.5"></circle></svg>`,
        arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`,
        "arrow-right": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`,
        check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m8 12 2.5 2.5L16 9"></path></svg>`
        ,
        "panel-arrow": `<svg viewBox="0 0 420 420" fill="none" stroke="currentColor" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"><path d="M95 210h215"></path><path d="m218 86 125 124-125 124"></path></svg>`
    };
    return icons[name] || icons.check;
}
