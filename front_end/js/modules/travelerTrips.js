const travelerData = (() => { try { return JSON.parse(localStorage.getItem("travelerData") || "{}"); } catch { return {}; } })();
import { getTravelerBookings } from "../utils/travelerWorkspaceState.js";

const CONFIRMED_BOOKING_KEY = "traveler_confirmed_booking";
const CONFIRMED_BOOKING_SESSION_KEY = "traveler_confirmed_booking_session";
const MY_TRIPS_FOCUS_KEY = "traveler_mytrips_focus";
const DEFAULT_TRIP_IMAGE = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800";
const SELECTED_PLAN_KEY = "traveler_selected_plan";
const PLAN_SOURCE_KEY = "traveler_plan_source";
const SELECTED_FLIGHT_KEY = "traveler_selected_flight";
const SELECTED_EXPERIENCE_KEY = "traveler_selected_experience";
const SELECTED_PACKAGE_KEY = "traveler_selected_package";
const SELECTED_HOTEL_KEY = "traveler_selected_hotel";
const EXPERIENCE_BOOKING_DRAFT_KEY = "traveler_experience_booking_draft";
const TRAVELER_MY_TRIPS_KEY = "traveler_my_trips";

const calendarSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
const xCircleSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
const checkCircleSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
const mapPinSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
const listCalSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

let activeStatus = "Upcoming";
const REVIEW_TAGS = ["Great Guide", "Smooth Booking", "Value for Money", "Amazing Experience", "Well Organized", "Highly Recommend"];
let tripReviewState = createEmptyReviewState();

export async function renderTravelerTrips(containerId, user) {
    const container = document.getElementById(containerId);
    if (!container) return;

    await syncTripsFromApi(user);

    const focusStatus = getMyTripsFocusStatus();
    if (focusStatus) {
        activeStatus = focusStatus;
        clearMyTripsFocusStatus();
    }

    const trips = getTravelerTripsData();

    const upcomingCount = trips.filter(t => t.status === "Upcoming").length;
    const cancelledCount = trips.filter(t => t.status === "Cancelled").length;
    const completedCount = trips.filter(t => t.status === "Completed").length;

    const displayedTrips = trips.filter(t => t.status === activeStatus);

    const HTML = `
        <div class="dashboard-container trips-page-container">
            <div class="trips-header">
                <div class="trips-header-left">
                    <h1>My Trips</h1>
                    <p>View and manage your bookings</p>
                </div>
            </div>

            <div class="trips-tabs">
                <button class="trip-tab ${activeStatus === 'Upcoming' ? 'active' : ''}" data-status="Upcoming">
                    ${calendarSvg} Upcoming <span class="pill-counter">${upcomingCount}</span>
                </button>
                <button class="trip-tab ${activeStatus === 'Cancelled' ? 'active' : ''}" data-status="Cancelled">
                    ${xCircleSvg} Cancelled <span class="pill-counter">${cancelledCount}</span>
                </button>
                <button class="trip-tab ${activeStatus === 'Completed' ? 'active' : ''}" data-status="Completed">
                    ${checkCircleSvg} Completed <span class="pill-counter">${completedCount}</span>
                </button>
            </div>

            <div class="trips-list">
                ${displayedTrips.length === 0 ? `<div style="text-align: center; color: #64748B; padding: 40px; font-weight: 500;">No ${activeStatus.toLowerCase()} trips found.</div>` : ''}
                
                ${displayedTrips.map(trip => `
                    <div class="trip-card">
                        <img class="trip-card-img" src="${trip.image}" alt="${trip.title}" onerror="this.onerror=null;this.src='${DEFAULT_TRIP_IMAGE}';">
                        <div class="trip-card-body">
                            <h2>${trip.title}</h2>
                            <div class="trip-badge">${trip.type}</div>
                            
                            <div class="trip-meta">
                                <span>${mapPinSvg} ${trip.location}</span>
                                <span>${listCalSvg} ${trip.dateRange}</span>
                            </div>
                            
                            <div class="trip-booking-id">
                                Booking ID: <strong>${trip.bookingId}</strong>
                            </div>
                            
                            ${trip.currentStop && trip.status !== 'Completed' ? `
                            <div class="trip-current-stop" style="margin-top: 10px; font-size: 0.9rem; color: #1e40af; background: #eff6ff; padding: 6px 10px; border-radius: 6px; display: inline-block;">
                                📍 Current: <strong>${trip.currentStop}</strong>
                            </div>
                            ` : ''}
                            
                            <div class="trip-actions">
                                <button class="btn-solid-blue" data-trip-view="${escapeHtmlAttr(getTripViewKey(trip))}">View Details</button>
                                ${trip.status === 'Completed'
                                    ? `<button class="btn-outline-teal" data-trip-review="${escapeHtmlAttr(getTripViewKey(trip))}">Review Trip</button>`
                                    : ``}
                                ${trip.status !== 'Completed' && (trip.type.toLowerCase() === 'tour' || trip.type.toLowerCase() === 'experience' || trip.currentStop) 
                                    ? `<button class="btn-outline-blue" data-trip-route="${escapeHtmlAttr(getTripViewKey(trip))}">View Live Route</button>`
                                    : ``}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            ${renderReviewModal(displayedTrips, tripReviewState)}
        </div>
    `;

    container.innerHTML = HTML;

    // Tab Listeners
    const tabs = container.querySelectorAll(".trip-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", (e) => {
            activeStatus = e.currentTarget.getAttribute("data-status");
            renderTravelerTrips(containerId, user);
        });
    });

    container.querySelectorAll("[data-trip-view]").forEach((button) => {
        button.addEventListener("click", () => {
            const key = button.getAttribute("data-trip-view");
            const trip = displayedTrips.find((item) => getTripViewKey(item) === key);

            if (!trip) {
                return;
            }

            if (isFlightTrip(trip)) {
                openFlightTrip(trip);
                return;
            }

            if (isExperienceTrip(trip)) {
                openExperienceTrip(trip);
                return;
            }

            if (isHotelTrip(trip)) {
                openHotelTrip(trip);
                return;
            }

            openPackageBookingTrip(trip);
        });
    });

    container.querySelectorAll("[data-trip-route]").forEach((button) => {
        button.addEventListener("click", () => {
            const key = button.getAttribute("data-trip-route");
            const trip = displayedTrips.find((item) => getTripViewKey(item) === key);
            if (trip && window.openTourModal) {
                window.openTourModal(trip);
            }
        });
    });

    container.querySelectorAll("[data-trip-review]").forEach((button) => {
        button.addEventListener("click", () => {
            tripReviewState = createEmptyReviewState(button.getAttribute("data-trip-review") || "");
            rerender();
        });
    });

    container.querySelector("[data-review-close]")?.addEventListener("click", () => {
        resetReviewState();
        rerender();
    });

    container.querySelector(".trip-review-modal-backdrop")?.addEventListener("click", (event) => {
        if (event.target.classList.contains("trip-review-modal-backdrop")) {
            resetReviewState();
            rerender();
        }
    });

    container.querySelectorAll("[data-review-star]").forEach((button) => {
        button.addEventListener("click", () => {
            tripReviewState.rating = Number(button.getAttribute("data-review-star")) || 0;
            rerender();
        });
    });

    container.querySelector("#trip-review-text")?.addEventListener("input", (event) => {
        tripReviewState.reviewText = event.target.value;
        updateReviewSubmitState(container);
    });

    container.querySelectorAll("[data-review-tag]").forEach((button) => {
        button.addEventListener("click", () => {
            const tag = button.getAttribute("data-review-tag");
            if (!tag) return;

            if (tripReviewState.selectedTags.has(tag)) {
                tripReviewState.selectedTags.delete(tag);
            } else {
                tripReviewState.selectedTags.add(tag);
            }
            rerender();
        });
    });

    container.querySelector("#trip-review-photo")?.addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        tripReviewState.photoName = file?.name || "";
        rerender();
    });

    container.querySelector("[data-review-cancel]")?.addEventListener("click", () => {
        resetReviewState();
        rerender();
    });

    container.querySelector("[data-review-submit]")?.addEventListener("click", () => {
        if (!tripReviewState.tripKey || !tripReviewState.rating || !tripReviewState.reviewText.trim()) {
            showTripsToast("Add a rating and a short review before submitting.");
            return;
        }

        resetReviewState();
        rerender();
        showTripsToast("Thanks! Your trip review has been submitted.");
    });

    function rerender() {
        renderTravelerTrips(containerId, user);
    }
}

async function syncTripsFromApi(user) {
    return;
}

function getTravelerTripsData() {
    // Get unified bookings from localStorage (filtered by customerId)
    const unifiedBookings = getTravelerBookings();

    // Also read traveler_my_trips which stores locally confirmed bookings
    let myTripsRaw = [];
    try { myTripsRaw = JSON.parse(localStorage.getItem("traveler_my_trips") || "[]"); } catch (e) { myTripsRaw = []; }

    // Merge: unifiedBookings first, then any myTrips entries not already present
    const bookingIdsSeen = new Set(unifiedBookings.map(b => String(b.id)));
    const combined = [...unifiedBookings];
    for (const b of myTripsRaw) {
        if (!bookingIdsSeen.has(String(b.id)) && !bookingIdsSeen.has(String(b.bookingId))) {
            combined.push(b);
            bookingIdsSeen.add(String(b.id));
        }
    }

    // Map combined list to traveler UI format
    const trips = combined.map(b => ({
        ...b,
        title: b.title || b.name,
        location: b.destination || b.location,
        dateRange: b.dateTime ? b.dateTime.split(" | ")[0] : (b.date || "Date TBD"),
        bookingId: b.id || b.bookingId,
        planId: b.planId || b.id,
        experienceId: b.experienceId,
        hotelId: b.hotelId,
        flightId: b.flightId,
        type: b.type || "Tour",
        status: normalizeTripStatus(b.status),
        image: b.coverImage || b.image || DEFAULT_TRIP_IMAGE,
        currentStop: b.currentloction,
        plan_iternary: b.plan_iternary,
        customer: b.customer
    }));
    const confirmedBooking = getConfirmedBooking();

    if (!confirmedBooking) {
        return trips;
    }

    const existingIndex = trips.findIndex(trip => String(trip.bookingId) === String(confirmedBooking.bookingId));
    const confirmedTrip = mapConfirmedBookingToTrip(confirmedBooking);

    if (existingIndex >= 0) {
        trips[existingIndex] = confirmedTrip;
        return trips;
    }

    return [confirmedTrip, ...trips];
}

function getStoredTravelerTrips() {
    const fallbackTrips = (travelerData.myTrips || []).map(normalizeTripRecord);

    if (typeof localStorage === "undefined") {
        return fallbackTrips;
    }

    try {
        const stored = JSON.parse(localStorage.getItem(TRAVELER_MY_TRIPS_KEY) || "null");
        if (Array.isArray(stored) && stored.length) {
            const mergedTrips = mergeTripCollections(stored.map(normalizeTripRecord), fallbackTrips);
            localStorage.setItem(TRAVELER_MY_TRIPS_KEY, JSON.stringify(mergedTrips));
            return mergedTrips;
        }

        localStorage.setItem(TRAVELER_MY_TRIPS_KEY, JSON.stringify(fallbackTrips));
        return fallbackTrips;
    } catch (error) {
        return fallbackTrips;
    }
}

function mergeTripCollections(primaryTrips, fallbackTrips) {
    const merged = new Map();

    fallbackTrips.forEach((trip) => {
        merged.set(getTripPersistenceKey(trip), trip);
    });

    primaryTrips.forEach((trip) => {
        const key = getTripPersistenceKey(trip);
        const fallbackTrip = merged.get(key) || {};
        merged.set(key, normalizeTripRecord({ ...fallbackTrip, ...trip }));
    });

    return Array.from(merged.values());
}

function getTripPersistenceKey(trip) {
    if (trip.bookingId) return `booking:${trip.bookingId}`;
    if (trip.flightId) return `flight:${trip.flightId}`;
    if (trip.experienceId) return `experience:${trip.experienceId}`;
    if (trip.hotelId) return `hotel:${trip.hotelId}`;
    if (trip.planId) return `plan:${trip.planId}`;
    return `trip:${normalizeText(trip.title)}`;
}

function normalizeTripRecord(trip) {
    const normalizedType = String(trip.type || "").trim();
    const normalizedTitle = String(trip.title || "").trim();
    const normalizedLocation = String(trip.location || "").trim();
    const hotel = resolveHotelForTrip({ ...trip, title: normalizedTitle, location: normalizedLocation });

    return {
        ...trip,
        title: normalizedTitle,
        location: normalizedLocation,
        type: normalizedType,
        status: normalizeTripStatus(trip.status),
        hotelId: trip.hotelId || (normalizedType.toLowerCase().includes("hotel") ? hotel?.id || "" : "")
    };
}

function normalizeTripStatus(status) {
    const value = String(status || "").trim().toLowerCase();

    if (value === "cancelled" || value === "canceled") {
        return "Cancelled";
    }

    if (value === "completed" || value === "complete") {
        return "Completed";
    }

    return "Upcoming";
}

function getConfirmedBooking() {
    if (typeof sessionStorage !== "undefined") {
        try {
            const booking = JSON.parse(sessionStorage.getItem(CONFIRMED_BOOKING_SESSION_KEY) || "null");
            if (booking) return booking;
        } catch (error) {
            console.warn("Unable to read confirmed booking from session storage", error);
        }
    }

    if (typeof localStorage !== "undefined") {
        try {
            return JSON.parse(localStorage.getItem(CONFIRMED_BOOKING_KEY) || "null");
        } catch (error) {
            console.warn("Unable to read confirmed booking from local storage", error);
        }
    }

    return null;
}

function getMyTripsFocusStatus() {
    if (typeof sessionStorage === "undefined") {
        return null;
    }

    try {
        return sessionStorage.getItem(MY_TRIPS_FOCUS_KEY);
    } catch (error) {
        return null;
    }
}

function clearMyTripsFocusStatus() {
    if (typeof sessionStorage === "undefined") {
        return;
    }

    try {
        sessionStorage.removeItem(MY_TRIPS_FOCUS_KEY);
    } catch (error) {
        return;
    }
}

function mapConfirmedBookingToTrip(booking) {
    return {
        title: booking.routeLabel,
        location: booking.toLabel,
        dateRange: `${formatTripDate(booking.departureDate)} - ${formatTripDate(formatArrivalValue(booking.departureDate, booking.duration))}`,
        bookingId: Number(booking.bookingId),
        type: booking.type || "Flight",
        status: "Upcoming",
        image: booking.heroImage || "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=800",
        flightId: booking.id || booking.flightNumber || `flight-${booking.bookingId}`,
        flightPayload: booking
    };
}

function getTripViewKey(trip) {
    if (trip.flightId) return `flight:${trip.flightId}`;
    if (trip.experienceId) return `experience:${trip.experienceId}`;
    if (trip.hotelId) return `hotel:${trip.hotelId}`;
    if (trip.planId) return `plan:${trip.planId}`;
    return `trip:${trip.title}`;
}

function isFlightTrip(trip) {
    return Boolean(trip.flightId) || String(trip.type || "").toLowerCase() === "flight";
}

function isExperienceTrip(trip) {
    return Boolean(trip.experienceId) || String(trip.type || "").toLowerCase().includes("experience");
}

function isHotelTrip(trip) {
    return Boolean(trip.hotelId) || String(trip.type || "").toLowerCase().includes("hotel");
}

function openFlightTrip(trip) {
    const payload = trip.flightPayload || buildFlightPayloadFromTrip(trip);
    if (!payload || typeof localStorage === "undefined") return;

    localStorage.setItem(SELECTED_FLIGHT_KEY, JSON.stringify(payload));
    window.location.href = `./traveller_flight-detail.html?flight=${encodeURIComponent(payload.id || trip.flightId || trip.bookingId)}${getTripStatusParam(trip)}`;
}

function openExperienceTrip(trip) {
    const experience = travelerData.searchCatalog.experiences.find((item) => item.id === trip.experienceId);
    if (!experience || typeof localStorage === "undefined") return;

    localStorage.setItem(SELECTED_EXPERIENCE_KEY, JSON.stringify(experience));
    window.location.href = `./traveller_experience-detail.html?experience=${encodeURIComponent(experience.id)}${getTripStatusParam(trip)}`;
}

function openHotelTrip(trip) {
    const hotel = resolveHotelForTrip(trip);
    if (!hotel || typeof localStorage === "undefined") return;

    localStorage.setItem(SELECTED_HOTEL_KEY, JSON.stringify(hotel));
    window.location.href = `./traveller_hotel-detail.html?hotel=${encodeURIComponent(hotel.id)}${getTripStatusParam(trip)}`;
}

function openExperienceBookingTrip(trip) {
    const experience = travelerData.searchCatalog.experiences.find((item) => item.id === trip.experienceId);
    if (!experience || typeof localStorage === "undefined") return;

    const defaultOption = Array.isArray(experience.options) && experience.options.length
        ? experience.options.find((item) => item.popular) || experience.options[0]
        : { id: `${experience.id}-standard`, title: "Standard Option", time: experience.time || "Flexible timing", price: extractPrice(experience.price) || 79 };

    const adultCount = inferAdultCountFromTrip(trip);
    const draft = {
        experienceId: experience.id,
        experience,
        option: { ...defaultOption },
        selectedDate: getTripStartDate(trip),
        adults: adultCount,
        totalPrice: (Number(defaultOption.price) || 0) * adultCount
    };

    localStorage.setItem(SELECTED_EXPERIENCE_KEY, JSON.stringify(experience));
    localStorage.setItem(EXPERIENCE_BOOKING_DRAFT_KEY, JSON.stringify(draft));
    window.location.href = "./traveller_experience-booking.html";
}

function openPackageBookingTrip(trip) {
    if (typeof localStorage === "undefined") return;

    const packageSelection = buildPackageSelectionFromTrip(trip);
    localStorage.setItem(SELECTED_PACKAGE_KEY, JSON.stringify(packageSelection));
    const packageId = packageSelection?.id || trip.planId || slugify(trip.title);
    window.location.href = `./traveller_booking-details.html?plan=${encodeURIComponent(packageId)}${getTripStatusParam(trip)}`;
}

function getTripStatusParam(trip) {
    if (!trip || !trip.status) return "";
    const normalized = String(trip.status).trim().toLowerCase();
    if (!normalized) return "";
    return `&status=${encodeURIComponent(normalized)}`;
}

function resolveHotelForTrip(trip) {
    const hotels = travelerData.searchCatalog.hotels || [];
    if (trip.hotelId) {
        const direct = hotels.find((hotel) => hotel.id === trip.hotelId);
        if (direct) return direct;
    }

    const normalizedTitle = normalizeText(trip.title);
    const normalizedLocation = normalizeText(trip.location);
    const locationCity = normalizedLocation.split(",")[0].trim();

    const exactNameMatch = hotels.find((hotel) => normalizeText(hotel.name) === normalizedTitle);
    if (exactNameMatch) return exactNameMatch;

    const fuzzyNameMatch = hotels.find((hotel) => normalizedTitle.includes(normalizeText(hotel.name)) || normalizeText(hotel.name).includes(normalizedTitle));
    if (fuzzyNameMatch) return fuzzyNameMatch;

    const cityAndAreaMatch = hotels.find((hotel) =>
        normalizeText(hotel.city) === locationCity ||
        normalizedLocation.includes(normalizeText(hotel.city)) ||
        normalizedLocation.includes(normalizeText(hotel.area))
    );
    if (cityAndAreaMatch) return cityAndAreaMatch;

    return hotels[0] || null;
}

function buildFlightPayloadFromTrip(trip) {
    const [fromLabel = "Origin", toLabel = trip.location] = String(trip.title || "").split("→").map((item) => item.trim());
    const [startDate = "", endDate = startDate] = String(trip.dateRange || "").split(" - ").map((item) => item.trim());

    return {
        id: trip.flightId || `flight-${trip.bookingId}`,
        airline: "Xploreo Air",
        flightNumber: `XP ${trip.bookingId}`,
        routeLabel: `${fromLabel} → ${toLabel}`,
        fromLabel,
        toLabel,
        fromCode: getAirportCode(fromLabel),
        toCode: getAirportCode(toLabel),
        departureDate: new Date(startDate).toISOString(),
        returnDate: "",
        departureTime: "09:30 AM",
        arrivalTime: "05:40 PM",
        duration: "8h 10m",
        stops: "Non-stop",
        classType: "Economy",
        price: 840,
        originalFare: 990,
        taxes: 120,
        passengers: "1 Traveller, Economy",
        baggage: "2 pieces (23kg each)",
        cancellation: "Free cancellation up to 24 hours before departure",
        confirmation: "Instant confirmation",
        heroImage: trip.image,
        type: "Flight"
    };
}

function getAirportCode(label) {
    const match = String(label).match(/\(([A-Z]{3})\)/);
    return match ? match[1] : String(label).slice(0, 3).toUpperCase();
}

function buildPackageSelectionFromTrip(trip) {
    const matchingPlan = travelerData.itineraries.find((item) => item.id === trip.planId || item.title === trip.title);
    const adultCount = inferAdultCountFromTrip(trip);
    const pricePerPerson = matchingPlan ? extractPrice(matchingPlan.price) || 999 : 999;
    const [startDate = ""] = String(trip.dateRange || "").split(" - ").map((item) => item.trim());

    return {
        id: trip.planId || `package-${slugify(trip.title)}`,
        origin: "Traveler Selection",
        destination: trip.location,
        title: trip.title,
        image: trip.image,
        nights: matchingPlan ? Math.max(1, Number(matchingPlan.days) - 1) : 5,
        days: matchingPlan ? Number(matchingPlan.days) || 6 : 6,
        withFlight: true,
        hotelCategory: 4,
        stayLine: "Curated hotel stays included",
        mealsLine: "Breakfast included",
        transferLine: "Transfers included",
        activityLine: matchingPlan?.features?.join(" • ") || "Curated sightseeing and local experiences",
        perk: "Flexible itinerary customization",
        pricePerPerson,
        totalPrice: pricePerPerson * adultCount,
        emi: Math.max(1, Math.round((pricePerPerson * adultCount) / 12)),
        departureDate: normalizeDateForStorage(startDate)
    };
}

function extractPrice(value) {
    const match = String(value || "").replace(/,/g, "").match(/(\d+)/);
    return match ? Number(match[1]) : 0;
}

function inferAdultCountFromTrip(trip) {
    const title = String(trip.passengers || trip.travelerCount || trip.people || "");
    const matched = title.match(/(\d+)/);
    return matched ? Math.max(1, Number(matched[1])) : 2;
}

function getTripStartDate(trip) {
    const [startDate = ""] = String(trip.dateRange || "").split(" - ").map((item) => item.trim());
    return normalizeDateForStorage(startDate);
}

function normalizeDateForStorage(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return new Date().toISOString().slice(0, 10);
    }
    return parsed.toISOString().slice(0, 10);
}

function slugify(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "package";
}

function normalizeText(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function renderReviewModal(displayedTrips, reviewState) {
    if (!reviewState.tripKey) return "";

    const trip = displayedTrips.find((item) => getTripViewKey(item) === reviewState.tripKey);
    if (!trip) return "";

    const canSubmit = reviewState.rating > 0 && reviewState.reviewText.trim().length > 0;

    return `
        <div class="trip-review-modal-backdrop">
            <section class="trip-review-modal" role="dialog" aria-modal="true" aria-labelledby="trip-review-title">
                <div class="trip-review-modal-header">
                    <div class="trip-review-modal-heading">
                        <h2 id="trip-review-title">Review Your Trip</h2>
                    </div>
                    <button class="trip-review-close" type="button" data-review-close aria-label="Close review modal">×</button>
                </div>

                <div class="trip-review-modal-body">
                    <div class="trip-review-section">
                        <h3>Rate your experience</h3>
                        <div class="trip-review-stars">
                            ${Array.from({ length: 5 }, (_, index) => {
                                const value = index + 1;
                                return `<button type="button" class="trip-review-star ${value <= reviewState.rating ? "active" : ""}" data-review-star="${value}" aria-label="Rate ${value} star">${starOutlineSvg(value <= reviewState.rating)}</button>`;
                            }).join("")}
                        </div>
                    </div>

                    <div class="trip-review-section">
                        <h3>Write your experience</h3>
                        <textarea id="trip-review-text" class="trip-review-textarea" placeholder="Share your thoughts about this trip...">${escapeHtml(reviewState.reviewText)}</textarea>
                    </div>

                    <div class="trip-review-section">
                        <h3>Add tags (optional)</h3>
                        <div class="trip-review-tags">
                            ${REVIEW_TAGS.map((tag) => `
                                <button type="button" class="trip-review-tag ${reviewState.selectedTags.has(tag) ? "active" : ""}" data-review-tag="${escapeHtmlAttr(tag)}">${tag}</button>
                            `).join("")}
                        </div>
                    </div>

                    <div class="trip-review-section">
                        <h3>Add photos (optional)</h3>
                        <label class="trip-review-upload">
                            <input type="file" id="trip-review-photo" accept="image/*">
                            <div class="trip-review-upload-copy">
                                <div class="trip-review-upload-icon">${uploadIconSvg()}</div>
                                <strong>Drag & drop photos here</strong>
                                <span>or click to browse</span>
                                ${reviewState.photoName ? `<small>${escapeHtml(reviewState.photoName)}</small>` : ""}
                            </div>
                        </label>
                    </div>
                </div>

                <div class="trip-review-modal-footer">
                    <button type="button" class="trip-review-secondary" data-review-cancel>Cancel</button>
                    <button type="button" class="trip-review-submit ${canSubmit ? "enabled" : ""}" data-review-submit ${canSubmit ? "" : "disabled"}>Submit Review</button>
                </div>
            </section>
        </div>
    `;
}

function createEmptyReviewState(tripKey = "") {
    return {
        tripKey,
        rating: 0,
        reviewText: "",
        selectedTags: new Set(),
        photoName: ""
    };
}

function resetReviewState() {
    tripReviewState = createEmptyReviewState();
}

function updateReviewSubmitState(container) {
    const submitButton = container.querySelector("[data-review-submit]");
    if (!submitButton) return;

    const canSubmit = tripReviewState.rating > 0 && tripReviewState.reviewText.trim().length > 0;
    submitButton.disabled = !canSubmit;
    submitButton.classList.toggle("enabled", canSubmit);
}

function showTripsToast(message) {
    let toast = document.getElementById("trips-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "trips-toast";
        toast.className = "toast-notification";
        toast.innerHTML = `<span id="trips-toast-message"></span>`;
        document.body.appendChild(toast);
    }

    const label = document.getElementById("trips-toast-message");
    if (label) label.textContent = message;

    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");

    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => toast.classList.remove("show"), 2400);
}

function starOutlineSvg(active) {
    return active
        ? `<svg width="56" height="56" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
        : `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#d7dce6" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
}

function uploadIconSvg() {
    return `<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#7c8597" stroke-width="1.8"><path d="M12 16V4"></path><path d="m7 9 5-5 5 5"></path><path d="M20 16.58A5 5 0 0 1 18 21H6a5 5 0 0 1-2-9.42"></path></svg>`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeHtmlAttr(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function formatTripDate(dateValue) {
    const date = new Date(dateValue);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function formatArrivalValue(dateString, duration) {
    const date = new Date(dateString);
    const durationMatch = String(duration).match(/(\d+)h\s*(\d+)m/);
    const minutesToAdd = durationMatch
        ? (Number(durationMatch[1]) * 60) + Number(durationMatch[2])
        : 0;
    date.setMinutes(date.getMinutes() + minutesToAdd);
    return date.toISOString();
}

// Global Modal Handlers for Traveler View Route
window.openTourModal = (trip) => {
    const modal = document.getElementById("tourModal");
    const body = document.getElementById("modalBody");
    if (!modal || !body) return;

    // Use fallback variables to prevent undefined
    const title = trip.name || trip.title || trip.destination || trip.location || 'Guided Tour';
    const subtitle = trip.title && trip.title !== title ? trip.title : '';
    const bookingId = trip.id || trip.bookingId || 'N/A';
    const dateStr = trip.date || trip.dateTime || trip.dateRange || 'TBD';
    const customer = trip.customer || 'Traveller';

    body.innerHTML = `
        <div class="tracking-modal-header" style="padding: 20px 24px; border-bottom: 1px solid #e5e7eb;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">${title} <span style="font-weight: 400; color: #6b7280; font-size: 16px;">${subtitle ? '- ' + subtitle : ''}</span></h2>
            <div style="margin-top: 8px; display: flex; gap: 16px; font-size: 13px; color: #4b5563;">
                <span><strong style="color: #111827;">ID:</strong> ${bookingId}</span>
                <span><strong style="color: #111827;">Date:</strong> ${dateStr}</span>
                <span><strong style="color: #111827;">Customer:</strong> ${customer}</span>
            </div>
        </div>

        <div class="tracking-container" style="height: 500px; padding: 24px;">
          <!-- LEFT -->
          <div class="tracking-left">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #111827;">Itinerary</h3>
            <ul id="trackingStops"></ul>

            <!-- GUIDE CONTROLS -->
            <div id="guideControls" style="display:none; margin-top: auto; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                  <button onclick="tracking.start()" class="btn-solid-blue">Start</button>
                  <button onclick="tracking.pause()" class="btn-outline-blue">Pause</button>
                  <button onclick="tracking.resume()" class="btn-outline-blue">Resume</button>
                  <button onclick="tracking.skip()" class="btn-outline-blue">Skip</button>
              </div>
              <div style="display: flex; gap: 8px;">
                  <input id="trackingMsgInput" placeholder="Send message to traveller..." />
                  <button onclick="tracking.sendMessage()" class="btn-solid-blue">Send</button>
              </div>
            </div>

            <!-- TRAVELLER CONTROLS -->
            <div id="travellerControls" style="margin-top: auto; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button onclick="tracking.sendRequest('🚻 Washroom')" class="btn-outline-blue">🚻 Washroom</button>
                  <button onclick="tracking.sendRequest('☕ Break')" class="btn-outline-blue">☕ Break</button>
                  <button onclick="tracking.sendRequest('🆘 Emergency')" style="background: #ea580c; color: white; border: none;">🆘 Emergency</button>
              </div>
            </div>
          </div>

          <!-- RIGHT -->
          <div class="tracking-right">
            <div id="trackingMap"></div>
            <div id="trackingMessages"></div>
          </div>
        </div>
    `;

    modal.classList.add('active');
    modal.style.setProperty('display', 'flex', 'important');

    if (window.tracking) {
        window.tracking.init(trip);
    }
};

window.closeModal = () => {
    const modal = document.getElementById("tourModal");
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.getElementById("modalBody").innerHTML = "";
    }
};

