import { travelerData } from "../api/legacyData.js";
import { fetchHotel } from "../api/services.js";
import { mapHotelToSearchCard } from "../api/adapters.js";

const SEARCH_STORAGE_KEY = "traveler_dashboard_search_state";
const HOTEL_BOOKING_PAGE = "./traveller_hotel-booking.html";
const HOTEL_RESULTS_PAGE = "./traveller_hotel-search.html";
const WISHLIST_STORAGE_KEY = "traveler_wishlist";
const ROOM_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const GUEST_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

export const HOTEL_DETAIL_DATA = {
    "grand-luxury": {
        id: "grand-luxury",
        title: "The Grand Luxury Resort",
        area: "Downtown Dubai",
        distance: "2.5 km from city center",
        rating: 0,
        reviews: 0,
        stars: 5,
        roomName: "Deluxe King Room",
        adults: "2 Adults",
        pricePerNight: 380,
        taxes: 45,
        total: 1185,
        badges: [
            { text: "Free Cancellation", tone: "green", icon: "check" },
            { text: "Sanitized Stay", tone: "blue", icon: "shield" },
            { text: "Instant Confirmation", tone: "purple", icon: "clock" }
        ],
        highlights: [
            "Free cancellation available",
            "Instant confirmation",
            "Best price guarantee"
        ],
        about: [
            "Experience luxury at its finest at The Grand Luxury Resort. Located in the heart of Downtown Dubai, our 5-star property offers breathtaking views of the iconic Burj Khalifa and Dubai Fountain. Each room is elegantly designed with modern amenities, plush bedding, and floor-to-ceiling windows.",
            "Our resort features world-class dining options, a stunning infinity pool, state-of-the-art fitness center, and a rejuvenating spa. Whether you're here for business or leisure, we ensure an unforgettable stay with impeccable service and attention to detail."
        ],
        amenities: [
            { label: "Free High-Speed WiFi", icon: "wifi" },
            { label: "Infinity Pool", icon: "waves" },
            { label: "Fitness Center", icon: "dumbbell" },
            { label: "3 Restaurants & Bar", icon: "utensils" },
            { label: "Free Parking", icon: "car" },
            { label: "24/7 Room Service", icon: "coffee" },
            { label: "Airport Shuttle", icon: "shield" },
            { label: "24-Hour Front Desk", icon: "clock" }
        ],
        policies: [
            "Check-in: After 3:00 PM | Check-out: Before 11:00 AM",
            "Free cancellation up to 24 hours before check-in",
            "Pets are not allowed",
            "Children of all ages are welcome"
        ],
        gallery: [
            "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=800"
        ],
        rooms: [
            {
                id: "dlx-king",
                name: "Deluxe King Room",
                size: "35 sqm",
                bedding: "1 King Bed",
                guests: "2 Adults",
                image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=800",
                tags: ["Free WiFi", "City View", "Breakfast Included"],
                price: 380,
                oldPrice: 450,
                selected: true
            },
            {
                id: "exec-suite",
                name: "Executive Suite",
                size: "55 sqm",
                bedding: "1 King Bed + Living Area",
                guests: "2 Adults, 1 Child",
                image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800",
                tags: ["Free WiFi", "Ocean View", "Breakfast Included", "Lounge Access"],
                price: 620
            },
            {
                id: "family-suite",
                name: "Family Suite",
                size: "70 sqm",
                bedding: "2 Queen Beds + Living Area",
                guests: "4 Adults, 2 Children",
                image: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800",
                tags: ["Free WiFi", "City View", "Breakfast Included", "Kitchenette"],
                price: 850,
                oldPrice: 1050
            }
        ]
    },
    "beachfront-villa": {
        id: "beachfront-villa",
        title: "Beachfront Paradise Villa",
        area: "Jumeirah Beach",
        distance: "0.5 km from beach",
        rating: 0,
        reviews: 0,
        stars: 5,
        roomName: "Private Ocean Villa",
        adults: "2 Adults",
        pricePerNight: 620,
        taxes: 60,
        total: 1920,
        badges: [
            { text: "Private Beach", tone: "green", icon: "check" },
            { text: "All Inclusive", tone: "blue", icon: "shield" },
            { text: "Sunset Views", tone: "purple", icon: "clock" }
        ],
        highlights: [
            "Beach access included",
            "Private pool in select villas",
            "Flexible cancellation"
        ],
        about: [
            "Beachfront Paradise Villa is a serene coastal retreat offering private villas steps away from the shoreline. Guests enjoy panoramic sea views, lush gardens, and spacious interiors designed for rest and relaxation.",
            "Spend your days by the pool, enjoy curated dining by the beach, and unwind with personalized villa service. This property is ideal for couples and families wanting a premium beach escape in Dubai."
        ],
        amenities: [
            { label: "Private Beach Access", icon: "waves" },
            { label: "Infinity Pool", icon: "waves" },
            { label: "Spa & Wellness", icon: "shield" },
            { label: "2 Beachfront Restaurants", icon: "utensils" },
            { label: "Airport Transfer", icon: "car" },
            { label: "In-Villa Dining", icon: "coffee" },
            { label: "Water Sports Desk", icon: "dumbbell" },
            { label: "24-Hour Concierge", icon: "clock" }
        ],
        policies: [
            "Check-in: After 3:00 PM | Check-out: Before 12:00 PM",
            "Free cancellation up to 48 hours before check-in",
            "Pets are not allowed",
            "Children are welcome with extra bedding options"
        ],
        gallery: [
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=800"
        ],
        rooms: [
            {
                id: "ocean-villa",
                name: "Private Ocean Villa",
                size: "52 sqm",
                bedding: "1 King Bed",
                guests: "2 Adults",
                image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=800",
                tags: ["Private Pool", "Ocean View", "Breakfast Included"],
                price: 620,
                selected: true
            },
            {
                id: "garden-villa",
                name: "Garden Family Villa",
                size: "78 sqm",
                bedding: "2 Queen Beds",
                guests: "4 Adults",
                image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=800",
                tags: ["Garden Patio", "Beach Access", "All Inclusive"],
                price: 890
            }
        ]
    },
    "modern-boutique": {
        id: "modern-boutique",
        title: "Modern Boutique Hotel",
        area: "Dubai Marina",
        distance: "1.8 km from marina",
        rating: 0,
        reviews: 0,
        stars: 4,
        roomName: "Boutique Queen Room",
        adults: "2 Adults",
        pricePerNight: 225,
        taxes: 45,
        total: 720,
        badges: [
            { text: "City Views", tone: "green", icon: "check" },
            { text: "Fast WiFi", tone: "blue", icon: "shield" },
            { text: "Rooftop Access", tone: "purple", icon: "clock" }
        ],
        highlights: [
            "Rooftop lounge access",
            "Close to Dubai Marina",
            "Stylish modern interiors"
        ],
        about: [
            "Modern Boutique Hotel blends contemporary design with warm hospitality in one of Dubai's most vibrant neighborhoods. Interiors feature curated artwork, designer furniture, and bright, airy rooms.",
            "Guests have access to a rooftop bar, coworking lounge, and easy connections to restaurants, nightlife, and the marina promenade."
        ],
        amenities: [
            { label: "Free WiFi", icon: "wifi" },
            { label: "Rooftop Bar", icon: "utensils" },
            { label: "Fitness Studio", icon: "dumbbell" },
            { label: "Coworking Lounge", icon: "coffee" },
            { label: "Valet Parking", icon: "car" },
            { label: "Daily Housekeeping", icon: "shield" },
            { label: "Express Check-in", icon: "clock" },
            { label: "Concierge", icon: "shield" }
        ],
        policies: [
            "Check-in: After 2:00 PM | Check-out: Before 11:00 AM",
            "Non-refundable special rates may apply",
            "Pets are not allowed",
            "Children under 12 stay free with existing bedding"
        ],
        gallery: [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=800"
        ],
        rooms: [
            {
                id: "queen-room",
                name: "Boutique Queen Room",
                size: "28 sqm",
                bedding: "1 Queen Bed",
                guests: "2 Adults",
                image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=800",
                tags: ["Free WiFi", "City View"],
                price: 225,
                oldPrice: 280,
                selected: true
            },
            {
                id: "marina-suite",
                name: "Marina Corner Suite",
                size: "42 sqm",
                bedding: "1 King Bed + Lounge",
                guests: "2 Adults",
                image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800",
                tags: ["Balcony", "Breakfast Included", "Marina View"],
                price: 410
            }
        ]
    },
    "family-resort": {
        id: "family-resort",
        title: "Family Resort & Spa",
        area: "Al Barsha",
        distance: "3.2 km from Mall of Emirates",
        rating: 0,
        reviews: 0,
        stars: 5,
        roomName: "Family Deluxe Room",
        adults: "2 Adults, 2 Children",
        pricePerNight: 320,
        taxes: 45,
        total: 1005,
        badges: [
            { text: "Kids Club", tone: "green", icon: "check" },
            { text: "Spa Access", tone: "blue", icon: "shield" },
            { text: "Family Friendly", tone: "purple", icon: "clock" }
        ],
        highlights: [
            "Family suites available",
            "Kids club and splash pool",
            "Complimentary shuttle service"
        ],
        about: [
            "Family Resort & Spa is designed for multigenerational stays, with spacious rooms, child-friendly dining options, and dedicated leisure spaces for every age group.",
            "Located close to shopping and city attractions, the resort pairs convenience with comfort, offering pools, spa services, and engaging activities throughout the day."
        ],
        amenities: [
            { label: "Kids Club", icon: "shield" },
            { label: "Splash Pool", icon: "waves" },
            { label: "Spa Treatments", icon: "coffee" },
            { label: "Family Restaurant", icon: "utensils" },
            { label: "Shuttle Service", icon: "car" },
            { label: "Free WiFi", icon: "wifi" },
            { label: "Gym", icon: "dumbbell" },
            { label: "24-Hour Front Desk", icon: "clock" }
        ],
        policies: [
            "Check-in: After 3:00 PM | Check-out: Before 12:00 PM",
            "Free cancellation up to 24 hours before arrival",
            "Children's extra beds available on request",
            "Pets are not allowed"
        ],
        gallery: [
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1578898887932-dce23a595ad4?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=800"
        ],
        rooms: [
            {
                id: "family-deluxe",
                name: "Family Deluxe Room",
                size: "44 sqm",
                bedding: "1 King Bed + Sofa Bed",
                guests: "2 Adults, 2 Children",
                image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=800",
                tags: ["Kids Amenities", "Breakfast Included", "Pool View"],
                price: 320,
                selected: true
            },
            {
                id: "family-suite-2",
                name: "Resort Family Suite",
                size: "62 sqm",
                bedding: "2 Queen Beds",
                guests: "4 Adults, 2 Children",
                image: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800",
                tags: ["Kitchenette", "Living Area", "Kids Club Access"],
                price: 540
            }
        ]
    },
    "party-lofts": {
        id: "party-lofts",
        title: "Skyline Party Lofts",
        area: "Business Bay",
        distance: "1.1 km from nightlife district",
        rating: 0,
        reviews: 0,
        stars: 4,
        roomName: "Skyline Loft",
        adults: "2 Adults",
        pricePerNight: 285,
        taxes: 45,
        total: 900,
        badges: [
            { text: "Nightlife Access", tone: "green", icon: "check" },
            { text: "Late Check-in", tone: "blue", icon: "shield" },
            { text: "City Views", tone: "purple", icon: "clock" }
        ],
        highlights: [
            "Close to rooftop clubs",
            "Loft-style interiors",
            "24/7 concierge"
        ],
        about: [
            "Skyline Party Lofts delivers bold interiors, high-floor city views, and immediate access to Dubai's nightlife hubs. It's built for social stays and short city breaks.",
            "Guests can enjoy lounge spaces, curated event access, and easy transport links while staying in spacious loft-style rooms."
        ],
        amenities: [
            { label: "High-Speed WiFi", icon: "wifi" },
            { label: "Rooftop Lounge", icon: "utensils" },
            { label: "Concierge", icon: "shield" },
            { label: "Late Check-in", icon: "clock" },
            { label: "Parking", icon: "car" },
            { label: "Room Service", icon: "coffee" },
            { label: "Fitness Room", icon: "dumbbell" },
            { label: "City Transfers", icon: "car" }
        ],
        policies: [
            "Check-in: After 4:00 PM | Check-out: Before 11:00 AM",
            "Flexible date change available",
            "Adults-only loft categories available",
            "Pets are not allowed"
        ],
        gallery: [
            "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=800"
        ],
        rooms: [
            {
                id: "skyline-loft",
                name: "Skyline Loft",
                size: "38 sqm",
                bedding: "1 King Bed",
                guests: "2 Adults",
                image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800",
                tags: ["City View", "Late Check-in", "Lounge Access"],
                price: 285,
                selected: true
            },
            {
                id: "party-suite",
                name: "Party Suite",
                size: "58 sqm",
                bedding: "1 King Bed + Living Area",
                guests: "3 Adults",
                image: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=800",
                tags: ["Premium View", "Rooftop Entry", "Mini Bar"],
                price: 470
            }
        ]
    }
};

export async function renderTravelerHotelDetailPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let hotel = await getSelectedHotel();

    const initialSearchValues = normalizeSearchValues(getSearchValues(hotel));
    const defaultRoom = hotel.rooms.find((room) => room.selected) || hotel.rooms[0];
    const params = new URLSearchParams(window.location.search);
    const selectedRoomFromUrl = params.get("room");
    const state = {
        selectedImageIndex: 0,
        selectedRoomId: hotel.rooms.some((room) => room.id === selectedRoomFromUrl) ? selectedRoomFromUrl : defaultRoom?.id || "",
        searchValues: initialSearchValues
    };

    function render() {
        const selectedRoom = hotel.rooms.find((room) => room.id === state.selectedRoomId) || defaultRoom;
        const status = new URLSearchParams(window.location.search).get("status")?.trim().toLowerCase() || "";
        const isCompleted = status === "completed" || status === "upcoming" || status === "cancelled";
        const mainImage = hotel.gallery[state.selectedImageIndex] || hotel.gallery[0];
        const stayNights = getStayNights(state.searchValues.checkIn, state.searchValues.checkOut);
        const roomCount = Math.max(1, Number.parseInt(state.searchValues.rooms, 10) || 1);
        const guestCount = Math.max(1, Number.parseInt(state.searchValues.guestCount, 10) || 2);
        const taxTotal = hotel.taxes * roomCount;
        const roomSubtotal = selectedRoom.price * stayNights * roomCount;
        const PLATFORM_FEE = 14;
        const totalAmount = roomSubtotal + taxTotal + PLATFORM_FEE;
        const hasMultipleImages = hotel.gallery.length > 1;
        const isWishlisted = getWishlistItems().some((item) => item.title === hotel.title);

        container.innerHTML = `
            <main class="traveler-hotel-detail-page">
                <div class="traveler-hotel-detail-frame">
                    <section class="traveler-hotel-detail-toolbar">
                        <label class="traveler-hotel-detail-toolbar-field traveler-hotel-detail-toolbar-location">
                            ${icon("location")}
                            <input
                                class="traveler-hotel-detail-toolbar-input"
                                type="text"
                                value="${escapeHtml(state.searchValues.city)}"
                                data-detail-search-field="city"
                                placeholder="Where are you staying?"
                                ${isCompleted ? "disabled" : ""}
                            >
                        </label>

                        <label class="traveler-hotel-detail-toolbar-field">
                            ${icon("calendar")}
                            <input
                                class="traveler-hotel-detail-toolbar-input traveler-hotel-detail-toolbar-date"
                                type="date"
                                value="${escapeHtml(state.searchValues.checkIn)}"
                                data-detail-search-field="checkIn"
                                ${isCompleted ? "disabled" : ""}
                            >
                        </label>

                        <label class="traveler-hotel-detail-toolbar-field">
                            ${icon("calendar")}
                            <input
                                class="traveler-hotel-detail-toolbar-input traveler-hotel-detail-toolbar-date"
                                type="date"
                                value="${escapeHtml(state.searchValues.checkOut)}"
                                data-detail-search-field="checkOut"
                                min="${escapeHtml(getNextDateValue(state.searchValues.checkIn))}"
                                ${isCompleted ? "disabled" : ""}
                            >
                        </label>

                        <label class="traveler-hotel-detail-toolbar-field">
                            ${icon("guests")}
                            <select class="traveler-hotel-detail-toolbar-select" data-detail-search-field="rooms" ${isCompleted ? "disabled" : ""}>
                                ${ROOM_OPTIONS.map((option) => `<option value="${option}" ${option === String(state.searchValues.rooms) ? "selected" : ""}>${option} Room${option === "1" ? "" : "s"}</option>`).join("")}
                            </select>
                        </label>

                        <label class="traveler-hotel-detail-toolbar-field">
                            ${icon("guests")}
                            <select class="traveler-hotel-detail-toolbar-select" data-detail-search-field="guestCount" ${isCompleted ? "disabled" : ""}>
                                ${GUEST_OPTIONS.map((option) => `<option value="${option}" ${option === String(state.searchValues.guestCount) ? "selected" : ""}>${option} Guest${option === "1" ? "" : "s"}</option>`).join("")}
                            </select>
                        </label>

                        ${isCompleted ? "" : `<button class="traveler-hotel-detail-toolbar-search-btn" type="button" data-detail-search-submit>
                            ${icon("search")}
                            <span>Search</span>
                        </button>`}
                    </section>

                    <section class="traveler-hotel-detail-grid">
                        <div class="traveler-hotel-gallery-card">
                            <div class="traveler-hotel-main-image" style="background-image:url('${mainImage}')">
                                ${hasMultipleImages ? `
                                    <button class="traveler-hotel-gallery-nav prev" type="button" data-gallery-nav="prev" aria-label="Previous photo">${icon("chevronLeft")}</button>
                                    <button class="traveler-hotel-gallery-nav next" type="button" data-gallery-nav="next" aria-label="Next photo">${icon("chevronRight")}</button>
                                ` : ""}
                                <span class="traveler-hotel-image-count">${state.selectedImageIndex + 1} / ${hotel.gallery.length}</span>
                            </div>
                            <div class="traveler-hotel-thumbnails">
                                ${hotel.gallery.slice(0, 4).map((image, index) => `
                                    <button type="button" class="traveler-hotel-thumb ${state.selectedImageIndex === index ? "active" : ""} ${index === 3 && hotel.gallery.length > 4 ? "traveler-hotel-thumb-more" : ""}" data-thumb-index="${index}" style="background-image:url('${image}')">
                                        ${index === 3 && hotel.gallery.length > 4 ? `<span>+${hotel.gallery.length - 3} Photos</span>` : ""}
                                    </button>
                                `).join("")}
                            </div>
                        </div>

                        <aside class="traveler-hotel-booking-card">
                            <h2>Booking Details</h2>
                            <div class="traveler-hotel-booking-overview">
                                <h3>${escapeHtml(hotel.title)}</h3>
                                <div class="traveler-hotel-booking-rating">
                                    <span class="traveler-hotel-booking-stars">${"★".repeat(hotel.stars)}</span>
                                    <span class="traveler-hotel-booking-score">${hotel.rating.toFixed(1)}</span>
                                    <span class="traveler-hotel-booking-reviews">(${hotel.reviews.toLocaleString()} reviews)</span>
                                </div>
                                <div class="traveler-hotel-booking-location">
                                    ${icon("location")}
                                    <span>${escapeHtml(hotel.area)} • ${escapeHtml(hotel.distance)}</span>
                                </div>
                                <div class="traveler-hotel-booking-badges">
                                    ${hotel.badges.map((badge) => `<span class="traveler-hotel-badge ${badge.tone}">${icon(badge.icon)}${escapeHtml(badge.text)}</span>`).join("")}
                                </div>
                            </div>
                            <div class="traveler-hotel-booking-meta">
                                <span>Selected Room</span>
                                <strong>${escapeHtml(selectedRoom.name || hotel.roomName)}</strong>
                            </div>

                            <div class="traveler-hotel-price-breakdown">
                                <h3>Price Breakdown</h3>
                                <div class="traveler-hotel-breakdown-row">
                                    <span>₹${selectedRoom.price} x ${stayNights} ${stayNights === 1 ? "night" : "nights"} x ${roomCount} ${roomCount === 1 ? "room" : "rooms"}</span>
                                    <strong>₹${roomSubtotal}</strong>
                                </div>
                                <div class="traveler-hotel-breakdown-row">
                                    <span>Taxes & fees</span>
                                    <strong>₹${taxTotal}</strong>
                                </div>
                                <div class="traveler-hotel-breakdown-row">
                                    <span style="color: #4B5563; font-weight: 500;">Platform Fee</span>
                                    <strong style="color: #4B5563;">₹14</strong>
                                </div>
                                <div class="traveler-hotel-total-row">
                                    <span>Total Amount</span>
                                    <strong>₹${totalAmount}</strong>
                                </div>
                            </div>

                            <div class="traveler-hotel-booking-actions">
                                ${status === "upcoming" ? `
                                    <button class="traveler-hotel-danger-btn" type="button" data-cancel-hotel-booking style="background: #ef4444; color: white; padding: 12px; border-radius: 8px; width: 100%; border: none; cursor: pointer; font-weight: 600; margin-bottom: 8px;">Cancel Booking</button>
                                    <p style="font-size: 12px; color: #6B7280; text-align: center; margin: 0; line-height: 1.4;">If cancelled, Platform Fee and Taxes won't be repaid.</p>
                                ` : status === "cancelled" ? `
                                    <p style="font-size: 13px; color: #ef4444; text-align: center; margin: 0; padding: 12px; font-weight: 500; background: #FEF2F2; border-radius: 8px;">Booking Cancelled. Platform Fee and Taxes are non-refundable.</p>
                                ` : !isCompleted ? `
                                    <button class="traveler-hotel-primary-btn" type="button">Book This Now</button>
                                    <button class="traveler-hotel-secondary-btn" type="button">View All Rooms</button>
                                ` : ""}
                            </div>
                        </aside>
                    </section>

                    <div class="traveler-hotel-detail-sections">
                        <section class="traveler-hotel-info-card traveler-hotel-about">
                            <h2>About this property</h2>
                            ${hotel.about.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
                        </section>

                        <section class="traveler-hotel-info-card">
                            <h2 class="traveler-hotel-amenities-title">Amenities</h2>
                            <div class="traveler-hotel-amenities">
                                ${hotel.amenities.map((amenity) => `
                                    <div class="traveler-hotel-amenity">
                                        <span class="traveler-hotel-amenity-icon">${icon(amenity.icon)}</span>
                                        <span>${escapeHtml(amenity.label)}</span>
                                    </div>
                                `).join("")}
                            </div>
                        </section>

                        <section class="traveler-hotel-info-card">
                            <h2 class="traveler-hotel-rooms-title">${isCompleted ? "Your Booked Room" : "Choose Your Room"}</h2>
                            ${isCompleted ? `
                                <div class="traveler-hotel-room-list booked-room-summary">
                                    <article class="traveler-hotel-room-card selected">
                                        <div class="traveler-hotel-room-card-inner">
                                            <div class="traveler-hotel-room-image" style="background-image:url('${selectedRoom.image}')"></div>
                                            <div class="traveler-hotel-room-main">
                                                <h3>${escapeHtml(selectedRoom.name)}</h3>
                                                <div class="traveler-hotel-room-meta">${escapeHtml(selectedRoom.size)} • ${escapeHtml(selectedRoom.bedding)} • ${escapeHtml(selectedRoom.guests)}</div>
                                                <div class="traveler-hotel-room-tags">
                                                    ${selectedRoom.tags.map((tag) => `<span class="traveler-hotel-room-tag">${icon("check")}${escapeHtml(tag)}</span>`).join("")}
                                                </div>
                                            </div>
                                            <div class="traveler-hotel-room-price">
                                                ${selectedRoom.oldPrice ? `<del>₹${selectedRoom.oldPrice}</del>` : ""}
                                                <strong>₹${selectedRoom.price}</strong>
                                                <span>per night</span>
                                            </div>
                                        </div>
                                    </article>
                                </div>
                            ` : `
                                <div class="traveler-hotel-room-list" id="traveler-hotel-room-list">
                                    ${hotel.rooms.map((room) => `
                                        <article class="traveler-hotel-room-card ${state.selectedRoomId === room.id ? "selected" : ""}" data-room-id="${room.id}" tabindex="0" role="button" aria-pressed="${state.selectedRoomId === room.id ? "true" : "false"}">
                                            <div class="traveler-hotel-room-card-inner">
                                                <div class="traveler-hotel-room-image" style="background-image:url('${room.image}')"></div>
                                                <div class="traveler-hotel-room-main">
                                                    <h3>${escapeHtml(room.name)}</h3>
                                                    <div class="traveler-hotel-room-meta">${escapeHtml(room.size)} • ${escapeHtml(room.bedding)} • ${escapeHtml(room.guests)}</div>
                                                    <div class="traveler-hotel-room-tags">
                                                        ${room.tags.map((tag) => `<span class="traveler-hotel-room-tag">${icon("check")}${escapeHtml(tag)}</span>`).join("")}
                                                    </div>
                                                </div>
                                                <div class="traveler-hotel-room-price">
                                                    ${room.oldPrice ? `<del>₹${room.oldPrice}</del>` : ""}
                                                    <strong>₹${room.price}</strong>
                                                    <span>per night</span>
                                                </div>
                                            </div>
                                        </article>
                                    `).join("")}
                                </div>
                            `}
                        </section>

                        <section class="traveler-hotel-policies-card">
                            <h2>Important Information</h2>
                            <ul class="traveler-hotel-policy-list">
                                ${hotel.policies.map((policy) => `<li>${icon("check")}${escapeHtml(policy)}</li>`).join("")}
                            </ul>
                        </section>
                    </div>
                </div>
            </main>
        `;

        bindEvents();
    }

    function bindEvents() {
        container.querySelectorAll("[data-detail-search-field]").forEach((field) => {
            const eventName = field.tagName === "SELECT" ? "change" : "input";
            field.addEventListener(eventName, () => {
                const fieldName = field.dataset.detailSearchField;
                if (!fieldName) return;

                state.searchValues = normalizeSearchValues({
                    ...state.searchValues,
                    [fieldName]: field.value
                });

                if (fieldName === "checkIn") {
                    const checkOutField = container.querySelector('[data-detail-search-field="checkOut"]');
                    if (checkOutField) {
                        checkOutField.min = getNextDateValue(state.searchValues.checkIn);
                    }
                }

                render();
            });
        });

        container.querySelector("[data-detail-search-submit]")?.addEventListener("click", () => {
            state.searchValues = normalizeSearchValues(state.searchValues);
            const dateError = getHotelDateValidationError(state.searchValues);

            if (dateError) {
                showWishlistToast(dateError);
                render();
                return;
            }

            persistSearchValues(state.searchValues);
            render();
        });

        container.querySelectorAll("[data-thumb-index]").forEach((button) => {
            button.addEventListener("click", () => {
                state.selectedImageIndex = Number(button.dataset.thumbIndex);
                render();
            });
        });

        container.querySelectorAll("[data-gallery-nav]").forEach((button) => {
            button.addEventListener("click", () => {
                if (button.dataset.galleryNav === "prev") {
                    state.selectedImageIndex = (state.selectedImageIndex - 1 + hotel.gallery.length) % hotel.gallery.length;
                } else {
                    state.selectedImageIndex = (state.selectedImageIndex + 1) % hotel.gallery.length;
                }
                render();
            });
        });

        const status = new URLSearchParams(window.location.search).get("status")?.trim().toLowerCase() || "";
        const isCompleted = status === "completed" || status === "upcoming";

        if (!isCompleted) {
            container.querySelectorAll("[data-room-id]").forEach((card) => {
                const selectRoom = () => {
                    state.selectedRoomId = card.dataset.roomId || defaultRoom.id;
                    render();
                };

                card.addEventListener("click", selectRoom);
                card.addEventListener("keydown", (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectRoom();
                    }
                });
            });
        }

        container.querySelector(".traveler-hotel-primary-btn")?.addEventListener("click", () => {
            const selectedRoomId = state.selectedRoomId || defaultRoom.id;
            window.location.href = `${HOTEL_BOOKING_PAGE}?hotel=${encodeURIComponent(hotel.id)}&room=${encodeURIComponent(selectedRoomId)}`;
        });

        container.querySelector(".traveler-hotel-secondary-btn")?.addEventListener("click", () => {
            container.querySelector("#traveler-hotel-room-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        container.querySelector("[data-cancel-hotel-booking]")?.addEventListener("click", () => {
            const params = new URLSearchParams(window.location.search);
            const bookingId = params.get("bookingId");
            if (!bookingId) {
                showWishlistToast("Booking ID not found.");
                return;
            }

            let myTrips = [];
            try { myTrips = JSON.parse(localStorage.getItem("traveler_my_trips") || "[]"); } catch (e) { }
            const tripIndex = myTrips.findIndex(t => String(t.id) === String(bookingId) || String(t.bookingId) === String(bookingId));
            if (tripIndex >= 0) {
                myTrips[tripIndex].status = "Cancelled";
                localStorage.setItem("traveler_my_trips", JSON.stringify(myTrips));
            }

            let tours = [];
            try { tours = JSON.parse(localStorage.getItem("tours") || "[]"); } catch (e) { }
            const tourIndex = tours.findIndex(t => String(t.id) === String(bookingId) || String(t.bookingId) === String(bookingId));
            if (tourIndex >= 0) {
                tours[tourIndex].status = "Cancelled";
                localStorage.setItem("tours", JSON.stringify(tours));
            }

            let hotelBookings = [];
            try { hotelBookings = JSON.parse(localStorage.getItem("hotelBookings") || "[]"); } catch (e) { }
            const hbIndex = hotelBookings.findIndex(b => String(b.id) === String(bookingId));
            if (hbIndex >= 0) {
                hotelBookings[hbIndex].status = "Cancelled";
                localStorage.setItem("hotelBookings", JSON.stringify(hotelBookings));
            }

            const currentTraveler = getCurrentTraveler();
            const getApiBaseUrl = () => (window.__XPLOREO_API_BASE__ || localStorage.getItem("xploreo_api_base_url") || "http://localhost:3000/api").replace(/\/$/, "");

            fetch(`${getApiBaseUrl()}/bookings/${bookingId}/cancel`, {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": currentTraveler?.id || "traveler-fallback",
                    "x-user-role": "TRAVELLER"
                }
            }).catch(e => console.error("Failed to cancel on backend:", e));

            showWishlistToast("Booking successfully cancelled.");
            setTimeout(() => {
                window.location.href = "./traveller_mytrips.html";
            }, 1500);
        });

        container.querySelector("[data-hotel-wishlist]")?.addEventListener("click", () => {
            const wishlist = getWishlistItems();
            const existingIndex = wishlist.findIndex((item) => item.title === hotel.title);

            if (existingIndex >= 0) {
                wishlist.splice(existingIndex, 1);
                saveWishlistItems(wishlist);
                showWishlistToast("Removed from Wishlist");
            } else {
                wishlist.push(buildWishlistItem(hotel));
                saveWishlistItems(wishlist);
                showWishlistToast("Added to Wishlist");
            }

            render();
        });
    }

    render();
}

async function getSelectedHotel() {
    const params = new URLSearchParams(window.location.search);
    const hotelId = params.get("hotel");
    return await getHotelDetailDataById(hotelId);
}

export async function getHotelDetailDataById(hotelId) {
    const resolvedId = HOTEL_DETAIL_ALIASES[hotelId] || hotelId;
    if (HOTEL_DETAIL_DATA[resolvedId]) {
        return HOTEL_DETAIL_DATA[resolvedId];
    }

    if (hotelId && hotelId !== "grand-luxury") {
        try {
            const backendHotel = await fetchHotel(hotelId);
            if (backendHotel && backendHotel.id) {
                const searchCard = mapHotelToSearchCard(backendHotel);
                return buildGeneratedHotelDetail({
                    ...searchCard,
                    name: searchCard.title,
                    priceValue: searchCard.price,
                    maxGuests: searchCard.maxGuests || 4,
                });
            }
        } catch (e) {
            console.warn("Could not fetch hotel from API", e);
        }
    }

    const searchHotel = travelerData.searchCatalog.hotels.find((hotel) => hotel.id === hotelId);
    if (searchHotel) {
        return buildGeneratedHotelDetail(searchHotel);
    }

    return HOTEL_DETAIL_DATA["grand-luxury"];
}

function getSearchValues(hotel) {
    const fallback = {
        city: inferCityFromHotel(hotel),
        checkIn: "2026-03-21",
        checkOut: "2026-03-24",
        rooms: "1",
        guestCount: "2",
        guests: "2 Guests"
    };

    if (typeof localStorage === "undefined") {
        return fallback;
    }

    try {
        const stored = JSON.parse(localStorage.getItem(SEARCH_STORAGE_KEY) || "{}");
        const hotelValues = stored.values?.hotels || {};
        return {
            city: hotelValues.city || fallback.city,
            checkIn: hotelValues.checkIn || fallback.checkIn,
            checkOut: hotelValues.checkOut || fallback.checkOut,
            rooms: hotelValues.rooms || fallback.rooms,
            guestCount: hotelValues.guestCount || parseGuestCount(hotelValues.guests) || fallback.guestCount,
            guests: hotelValues.guests || fallback.guests
        };
    } catch (error) {
        return fallback;
    }
}

function normalizeSearchValues(values) {
    const rooms = String(values.rooms || "1");
    const guestCount = String(values.guestCount || parseGuestCount(values.guests) || "2");

    return {
        city: values.city || "Dubai",
        checkIn: values.checkIn || "2026-03-21",
        checkOut: values.checkOut || "2026-03-24",
        rooms,
        guestCount,
        guests: `${guestCount} Guest${guestCount === "1" ? "" : "s"}`
    };
}

function getHotelDateValidationError(searchValues) {
    if (!searchValues.checkIn || !searchValues.checkOut) return "";
    return new Date(`${searchValues.checkOut}T00:00:00`) > new Date(`${searchValues.checkIn}T00:00:00`)
        ? ""
        : "Check-out must be after check-in";
}

function persistSearchValues(searchValues) {
    if (typeof localStorage === "undefined") return;

    try {
        const stored = JSON.parse(localStorage.getItem(SEARCH_STORAGE_KEY) || "{}");
        const nextState = {
            ...stored,
            values: {
                ...(stored.values || {}),
                hotels: {
                    ...normalizeSearchValues(searchValues)
                }
            }
        };

        localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(nextState));
    } catch (error) {
        return;
    }
}

function getWishlistItems() {
    if (typeof localStorage === "undefined") return [];

    try {
        return JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]");
    } catch (error) {
        return [];
    }
}

function saveWishlistItems(items) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
}

function buildWishlistItem(hotel) {
    return {
        title: hotel.title,
        location: hotel.area,
        image: hotel.gallery?.[0] || hotel.rooms?.[0]?.image || "",
        likes: 10 + (Math.abs(hashValue(hotel.id)) % 20)
    };
}

function showWishlistToast(message) {
    if (typeof document === "undefined") return;

    let toast = document.getElementById("wishlist-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "wishlist-toast";
        toast.className = "toast-notification";
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            <span id="toast-message"></span>
        `;
        document.body.appendChild(toast);
    }

    const messageNode = document.getElementById("toast-message");
    if (messageNode) {
        messageNode.textContent = message;
    }

    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");

    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB");
}

function parseGuestCount(value) {
    const match = String(value || "").match(/(\d+)/);
    return match ? match[1] : "";
}

function inferCityFromHotel(hotel) {
    const hotelId = String(hotel?.id || "").toLowerCase();
    if (hotelId.startsWith("tokyo-")) return "Tokyo";
    if (hotelId.startsWith("paris-")) return "Paris";
    if (hotelId.startsWith("newyork-")) return "New York";
    if (hotelId.startsWith("singapore-")) return "Singapore";
    if (hotelId.startsWith("bali-")) return "Bali";
    return "Dubai";
}

function getStayNights(checkIn, checkOut) {
    const start = new Date(`${checkIn}T00:00:00`);
    const end = new Date(`${checkOut}T00:00:00`);
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
    return diff > 0 ? diff : 1;
}

function getNextDateValue(dateString) {
    if (!dateString) return "";
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
}

const HOTEL_DETAIL_ALIASES = {
    "dubai-grand-luxury": "grand-luxury",
    "dubai-beachfront-paradise": "beachfront-villa",
    "dubai-modern-boutique": "modern-boutique",
    "dubai-family-resort": "family-resort",
    "dubai-skyline-lofts": "party-lofts"
};

function buildGeneratedHotelDetail(searchHotel) {
    const gallery = buildGalleryForHotel(searchHotel);
    const generatedRooms = buildGeneratedRooms(searchHotel);
    const pricePerNight = searchHotel.priceValue;
    const taxes = searchHotel.taxes;
    const total = pricePerNight * 3 + taxes;

    return {
        id: searchHotel.id,
        title: searchHotel.name,
        area: searchHotel.area,
        distance: searchHotel.distance,
        rating: Number(searchHotel.rating),
        reviews: searchHotel.reviews,
        stars: searchHotel.stars,
        roomName: generatedRooms[0].name,
        adults: inferAdultsLabel(searchHotel.maxGuests),
        pricePerNight,
        taxes,
        total,
        badges: buildBadges(searchHotel.tags),
        highlights: [
            `${searchHotel.category} in ${searchHotel.city}`,
            `${searchHotel.area} access`,
            "Instant confirmation available"
        ],
        about: [
            `${searchHotel.name} is a stylish ${searchHotel.stars}-star stay in ${searchHotel.area}, offering ${searchHotel.description.toLowerCase()}.`,
            `Guests staying here enjoy convenient access to ${searchHotel.distance.toLowerCase()}, flexible traveler-friendly amenities, and thoughtfully designed rooms tailored for short city breaks and longer stays alike.`
        ],
        amenities: buildAmenities(searchHotel.tags),
        policies: [
            "Check-in: After 3:00 PM | Check-out: Before 11:00 AM",
            "Free cancellation up to 24 hours before check-in",
            "Valid government ID required at check-in",
            "Extra bedding is subject to availability"
        ],
        gallery,
        rooms: generatedRooms
    };
}

function buildGalleryForHotel(searchHotel) {
    if (Array.isArray(searchHotel.images)) {
        if (searchHotel.images.length > 0) {
            return searchHotel.images;
        } else if (searchHotel.image) {
            return [searchHotel.image];
        }
    }

    const galleryByCategory = {
        "Luxury Stays": [
            "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=900",
            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=900",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=900"
        ],
        "Beach Stays": [
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&q=80&w=900",
            "https://images.unsplash.com/photo-1506169466986-63cd4fbec844?auto=format&fit=crop&q=80&w=900",
            "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=900"
        ],
        "City Stays": [
            "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&q=80&w=900",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=900",
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=900"
        ],
        "Family Stays": [
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=900",
            "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=900",
            "https://images.unsplash.com/photo-1578898887932-dce23a595ad4?auto=format&fit=crop&q=80&w=900"
        ],
        "Boutique Stays": [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&q=80&w=900",
            "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&q=80&w=900",
            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=900"
        ],
        "Budget Stays": [
            "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&q=80&w=1400",
            "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&q=80&w=900",
            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=900",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=900"
        ]
    };

    const seedGallery = galleryByCategory[searchHotel.category] || galleryByCategory["City Stays"];
    const uniqueImages = [searchHotel.image, ...seedGallery.filter((image) => image !== searchHotel.image)];
    return uniqueImages.slice(0, 4);
}

function buildGeneratedRooms(searchHotel) {
    return [
        {
            id: `${searchHotel.id}-standard`,
            name: `${searchHotel.name.split(" ")[0]} Standard Room`,
            size: searchHotel.stars >= 5 ? "38 sqm" : "30 sqm",
            bedding: searchHotel.maxGuests >= 4 ? "2 Queen Beds" : "1 King Bed",
            guests: inferGuestsRoomLabel(searchHotel.maxGuests),
            image: searchHotel.image,
            tags: searchHotel.tags.slice(0, 3),
            price: searchHotel.priceValue,
            oldPrice: searchHotel.oldPriceValue,
            selected: true
        }
    ];
}

function inferAdultsLabel(maxGuests) {
    if (maxGuests >= 5) return "2 Adults, 2 Children";
    if (maxGuests >= 4) return "2 Adults, 2 Guests";
    if (maxGuests === 3) return "2 Adults, 1 Child";
    return "2 Adults";
}

function inferGuestsRoomLabel(maxGuests) {
    if (maxGuests >= 5) return "4 Adults, 2 Children";
    if (maxGuests >= 4) return "4 Adults";
    if (maxGuests === 3) return "3 Adults";
    return "2 Adults";
}

function buildBadges(tags) {
    const tones = ["green", "blue", "purple"];
    const icons = ["check", "shield", "clock"];
    return tags.slice(0, 3).map((tag, index) => ({
        text: tag,
        tone: tones[index] || "green",
        icon: icons[index] || "check"
    }));
}

function buildAmenities(tags) {
    const amenityByTag = {
        "Free Cancellation": { label: "Flexible Cancellation", icon: "shield" },
        "Breakfast Included": { label: "Daily Breakfast", icon: "utensils" },
        "City Views": { label: "Skyline Views", icon: "waves" },
        "Private Beach": { label: "Beach Access", icon: "waves" },
        "All Inclusive": { label: "All-Inclusive Dining", icon: "utensils" },
        "WiFi": { label: "Free High-Speed WiFi", icon: "wifi" },
        "Kids Club": { label: "Kids Club", icon: "shield" },
        "Pool": { label: "Outdoor Pool", icon: "waves" },
        "Nightlife": { label: "Late-Night Concierge", icon: "clock" },
        "Budget Friendly": { label: "Great Value Rooms", icon: "shield" },
        "Kitchenette": { label: "Kitchenette", icon: "coffee" },
        "Fine Dining": { label: "Fine Dining", icon: "utensils" },
        "Skyline View": { label: "Skyline View", icon: "waves" }
    };

    const baseAmenities = [
        { label: "Free WiFi", icon: "wifi" },
        { label: "24-Hour Front Desk", icon: "clock" },
        { label: "Room Service", icon: "coffee" },
        { label: "Parking", icon: "car" }
    ];

    const mapped = tags
        .map((tag) => amenityByTag[tag])
        .filter(Boolean);

    return [...mapped, ...baseAmenities].slice(0, 8);
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
        calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"></rect><path d="M8 2v4M16 2v4M3 10h18"></path></svg>`,
        check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>`,
        shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 5 3.5 8.5 7 9 3.5-.5 7-4 7-9V6l-7-3Z"></path><path d="m9.5 12 1.5 1.5L14.5 10"></path></svg>`,
        clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>`,
        wifi: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><path d="M12 20h.01"></path></svg>`,
        waves: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"></path><path d="M2 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"></path><path d="M2 6c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"></path></svg>`,
        dumbbell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6.5 6.5 11 11"></path><path d="m21 21-1.5-1.5"></path><path d="m4.5 4.5-1.5-1.5"></path><path d="m18 22 4-4"></path><path d="m2 6 4-4"></path><path d="m3 21 6-6"></path><path d="m15 9 6-6"></path></svg>`,
        utensils: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 2.21 1.79 4 4 4V2"></path><path d="M7 2v20"></path><path d="M21 15V2a5 5 0 0 0-5 5v8"></path><path d="M16 15v7"></path></svg>`,
        car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16H9m10 0h2v-3l-1.5-4.5A2 2 0 0 0 17.6 7H6.4a2 2 0 0 0-1.9 1.5L3 13v3h2"></path><circle cx="6.5" cy="16.5" r="2.5"></circle><circle cx="17.5" cy="16.5" r="2.5"></circle></svg>`,
        coffee: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 0 1 0 8h-1"></path><path d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z"></path><path d="M6 2v2M10 2v2M14 2v2"></path></svg>`,
        heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 21-1.45-1.32C5.4 15.03 2 11.92 2 8.08 2 5 4.42 2.6 7.5 2.6c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 2.6C19.58 2.6 22 5 22 8.08c0 3.84-3.4 6.95-8.55 11.6z"></path></svg>`,
        share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.59 13.51 6.83 3.98"></path><path d="m15.41 6.51-6.82 3.98"></path></svg>`,
        location: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z"></path><circle cx="12" cy="11" r="2.5"></circle></svg>`,
        chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>`,
        chevronLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>`,
        chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>`,
        search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>`,
        guests: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
    };
    return icons[name] || icons.check;
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
