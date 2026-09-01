import { travelerData } from "../api/legacyData.js";
import { fetchTripsForGuide, fetchTripsForTraveller, fetchExperienceBookings, fetchTravellerHotelBookings, fetchReviews } from "../api/services.js";
import { mapTripToLegacyTour } from "../api/adapters.js";
import { showAppAlert } from "./experience_shared.js";

const MY_TRIPS_FOCUS_KEY = "traveler_mytrips_focus";
const DEFAULT_TRIP_IMAGE = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800";
const SELECTED_FLIGHT_KEY = "traveler_selected_flight";
const SELECTED_PACKAGE_KEY = "traveler_selected_package";

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

    const focusStatus = getMyTripsFocusStatus();
    if (focusStatus) {
        activeStatus = focusStatus;
        clearMyTripsFocusStatus();
    }

    // Fetch ALL trip data directly from backend — no localStorage
    const trips = await fetchTripsFromBackend(user);

    const upcomingCount = trips.filter(t => t.status === "Upcoming").length;
    const cancelledCount = trips.filter(t => t.status === "Cancelled").length;
    const completedCount = trips.filter(t => t.status === "Completed").length;

    const displayedTrips = trips.filter(t => t.status === activeStatus);

    const HTML = `
        <div class="dashboard-container trips-page-container">
            ${displayedTrips.some(t => String(t.backendStatus).toUpperCase() === "END_REQUESTED") ? `
                <div class="end-request-banner" style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <h3 style="margin: 0 0 4px 0; color: #b45309; font-size: 16px;">Action Required</h3>
                        <p style="margin: 0; color: #92400e; font-size: 14px;">One or more of your experiences has ended. Please confirm completion to finalize the booking.</p>
                    </div>
                </div>
            ` : ""}
            
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

                            ${trip.backendStatus === 'pending_guide_confirm' ? `
                            <div style="margin-top: 10px; font-size: 0.9rem; color: #b45309; background: #fffbeb; padding: 6px 10px; border-radius: 6px; display: inline-block;">
                                ⏳ Guide Confirmation Pending
                            </div>
                            ` : ''}
                            
                            ${trip.backendStatus === 'confirmed' && trip.guideId ? `
                            <div style="margin-top: 10px; font-size: 0.9rem; color: #059669; background: #d1fae5; padding: 6px 10px; border-radius: 6px; display: inline-block;">
                                ✅ Guide Confirmed
                            </div>
                            ` : ''}

                            ${trip.backendStatus === 'rejected_by_guide' ? `
                            <div style="margin-top: 10px; font-size: 0.9rem; color: #dc2626; background: #fee2e2; padding: 10px; border-radius: 6px;">
                                <div style="margin-bottom: 8px;">❌ Guide Rejected</div>
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn-solid-blue" style="padding: 6px 12px; font-size: 13px;" data-rebook-guide="${trip.bookingId}">Rebook Guide</button>
                                    <button class="btn-outline-red" style="padding: 6px 12px; font-size: 13px;" data-cancel-guide="${trip.bookingId}">No Guide (Refund)</button>
                                </div>
                            </div>
                            ` : ''}
                            
                            <div class="trip-actions">
                                <button class="btn-solid-blue" ${String(trip.backendStatus).toUpperCase() === 'END_REQUESTED' ? 'style="background-color: #f59e0b; border-color: #f59e0b; color: white;"' : ''} data-trip-view="${escapeHtml(getTripViewKey(trip))}">View Details</button>
                                ${trip.status === 'Completed' && !trip.hasReviewed
                                    ? `<button class="btn-outline-teal" data-trip-review="${escapeHtml(getTripViewKey(trip))}">Review Trip</button>`
                                    : ``}
                                ${String(trip.backendStatus).toUpperCase() === 'END_REQUESTED'
                                    ? `<button class="primary-btn" style="background-color: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;" data-trip-confirm="${trip.bookingId}">Confirm Completion</button>`
                                    : ``}
                                ${trip.status !== 'Completed' && String(trip.backendStatus).toUpperCase() !== 'END_REQUESTED' && (trip.type.toLowerCase() === 'tour' || trip.type.toLowerCase() === 'experience' || trip.currentStop) 
                                    ? `<button class="btn-outline-blue" data-trip-route="${escapeHtml(getTripViewKey(trip))}">View Live Route</button>`
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

    container.querySelectorAll("[data-trip-confirm]").forEach((button) => {
        button.addEventListener("click", async () => {
            const bookingId = button.getAttribute("data-trip-confirm");
            if (!bookingId) return;

            try {
                const { updateExperienceBookingStatus } = await import("../api/services.js");
                await updateExperienceBookingStatus(bookingId, "COMPLETED");
                showAppAlert("Experience marked as completed!", "Success");
                renderTravelerTrips(containerId, user);
            } catch (error) {
                console.error("Failed to confirm completion:", error);
                showAppAlert("Failed to confirm completion. Please try again.", "Error");
            }
        });
    });

    container.querySelectorAll("[data-cancel-guide]").forEach((button) => {
        button.addEventListener("click", async () => {
            const bookingId = button.getAttribute("data-cancel-guide");
            if (!bookingId) return;
            if (!confirm("Are you sure you want to proceed without a guide? You will receive a partial refund for the guide fee.")) return;

            try {
                const { cancelGuideAssignment } = await import("../api/services.js");
                await cancelGuideAssignment(bookingId);
                showAppAlert("Guide cancelled successfully. Refund is being processed.", "Success");
                renderTravelerTrips(containerId, user);
            } catch (error) {
                console.error("Failed to cancel guide:", error);
                showAppAlert("Failed to cancel guide. Please try again.", "Error");
            }
        });
    });

    container.querySelectorAll("[data-rebook-guide]").forEach((button) => {
        button.addEventListener("click", async () => {
            const bookingId = button.getAttribute("data-rebook-guide");
            const trip = displayedTrips.find(t => String(t.bookingId) === bookingId);
            if (!trip || !bookingId) return;
            
            try {
                const plan = { id: trip.planId };
                const { showGuideSelectionPopup } = await import("./travelerBookingDetailsPage.js");
                
                const [startDate = new Date().toISOString().split('T')[0]] = String(trip.dateRange || "").split(" - ");
                const endDate = startDate; 
                
                showGuideSelectionPopup(plan, startDate, endDate, async (newGuide) => {
                    if (newGuide) {
                        try {
                            const { changeGuideOnAssignment } = await import("../api/services.js");
                            await changeGuideOnAssignment(bookingId, {
                                newGuideId: newGuide.id,
                                newGuidePricePerPerson: newGuide.price
                            });
                            showAppAlert("Successfully rebooked with new guide!", "Success");
                            renderTravelerTrips(containerId, user);
                        } catch (e) {
                            showAppAlert(e.message || "Failed to rebook guide", "Error");
                        }
                    }
                }, true); // skipApiCall = true
            } catch (error) {
                console.error(error);
                showAppAlert("Failed to load guides for rebooking.", "Error");
            }
        });
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
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                tripReviewState.photoName = file.name;
                tripReviewState.photoData = e.target.result;
                rerender();
            };
            reader.readAsDataURL(file);
        } else {
            tripReviewState.photoName = "";
            tripReviewState.photoData = "";
            rerender();
        }
    });

    container.querySelector("[data-review-cancel]")?.addEventListener("click", () => {
        resetReviewState();
        tripReviewState.photoData = "";
        rerender();
    });

    container.querySelector("[data-review-submit]")?.addEventListener("click", async () => {
        if (!tripReviewState.tripKey || !tripReviewState.rating || !tripReviewState.reviewText.trim()) {
            showTripsToast("Add a rating and a short review before submitting.");
            return;
        }

        const [type, targetId] = tripReviewState.tripKey.split(":");
        let targetType;
        if (type === "hotel") {
            targetType = "hotel";
        } else if (type === "experience") {
            targetType = "experience";
        } else {
            targetType = "guide";
        }

        const payload = {
            userId: Number(user.id),
            targetType: targetType,
            targetId: targetId,
            rating: tripReviewState.rating,
            comment: tripReviewState.reviewText
        };
        if (tripReviewState.photoData) {
            payload.image = tripReviewState.photoData;
        }

        try {
            const { submitReview } = await import("../api/services.js");
            await submitReview(payload);
            resetReviewState();
            rerender();
            showTripsToast("Thanks! Your trip review has been submitted.");
        } catch (error) {
            console.error("Failed to submit review:", error);
            showTripsToast("Failed to submit review. Please try again.");
        }
    });

    function rerender() {
        renderTravelerTrips(containerId, user);
    }

    // Real-time synchronization across tabs
    if (!window.__travelerTripsStorageListenerAttached) {
        window.addEventListener("storage", async (e) => {
            if (e.key === "experienceBookings_trigger") {
                if (document.getElementById(containerId)) {
                    renderTravelerTrips(containerId, user);
                }
            }
        });
        window.__travelerTripsStorageListenerAttached = true;
    }
}

/**
 * Fetches ALL trip data directly from the backend APIs.
 * This is the ONLY data source for My Trips — no localStorage.
 */
async function fetchTripsFromBackend(user) {
    const currentUser = user || JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!currentUser?.id) return [];

    let allTrips = [];

    // 1. Fetch experience bookings and hotel bookings directly from backend
    if (currentUser.role?.toLowerCase() === "traveller") {
        try {
            const expBookings = await fetchExperienceBookings();
            const expTrips = expBookings.map(b => ({
                id: String(b.id),
                bookingId: String(b.id),
                customerId: String(currentUser.id),
                customer: currentUser.name || "Traveler",
                title: b.experience?.title || b.experience?.name || "Experience",
                location: b.experience?.location || b.experience?.destination || "Experience Location",
                dateRange: b.date || "Date TBD",
                status: normalizeTripStatus(b.status),
                backendStatus: b.status || "CONFIRMED",
                type: "Experience",
                experienceId: b.experience?.id || b.experienceId,
                guests: b.participants,
                amount: b.totalAmount,
                duration: b.experience?.durationHours ? `${b.experience.durationHours} hours` : "3 hours",
                image: b.experience?.image || DEFAULT_TRIP_IMAGE,
                plan_iternary: [b.experience?.title || "Experience"]
            }));
            allTrips.push(...expTrips);
        } catch (e) {
            console.warn("Failed to fetch experience bookings from backend", e);
        }

        try {
            const hotelBookings = await fetchTravellerHotelBookings();
            const hotelTrips = hotelBookings.map(b => ({
                id: String(b.id),
                bookingId: String(b.id),
                customerId: String(currentUser.id),
                customer: b.guestName || currentUser.name || "Traveler",
                title: b.hotel?.name || "Hotel Booking",
                location: b.hotel?.location || b.hotel?.city || "Hotel Location",
                dateRange: `${b.checkIn} to ${b.checkOut}`,
                status: normalizeTripStatus(b.status),
                backendStatus: b.status || "CONFIRMED",
                type: "Hotel",
                hotelId: b.hotelId,
                guests: b.guests,
                amount: b.totalAmount,
                duration: `${Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000)} Nights`,
                image: b.hotel?.image || DEFAULT_TRIP_IMAGE,
                plan_iternary: [`Check-in: ${b.checkIn}`, `Check-out: ${b.checkOut}`]
            }));
            allTrips.push(...hotelTrips);
        } catch (e) {
            console.warn("Failed to fetch hotel bookings from backend", e);
        }
    }

    // 2. Fetch regular trips (tours) from localStorage and enrich with backend guide assignments
    try {
        const localTours = JSON.parse(localStorage.getItem("tours") || "[]").filter(t => (t.type || "").toLowerCase() !== "hotel");
        const myTrips = JSON.parse(localStorage.getItem("traveler_my_trips") || "[]").filter(t => (t.type || "").toLowerCase() !== "hotel");
        
        const tourMap = new Map();
        localTours.forEach(t => tourMap.set(t.bookingId || t.id, t));
        myTrips.forEach(t => tourMap.set(t.bookingId || t.id, t));
        
        let travelerTours = Array.from(tourMap.values()).map(t => ({
            ...t,
            title: t.title || t.name,
            location: t.location || t.destination,
            dateRange: t.dateRange || (t.dateTime ? t.dateTime.split(" | ")[0] : "Date TBD"),
            bookingId: t.bookingId || t.id,
            type: t.type || "Tour",
            image: t.coverImage || t.image || t.heroImage || DEFAULT_TRIP_IMAGE,
            status: t.status || "Upcoming",
            backendStatus: t.backendStatus || "CONFIRMED"
        }));

        if (currentUser.role === "guide") {
            const trips = await fetchTripsForGuide(currentUser.id);
            const legacyTrips = trips.map(trip => {
                const mapped = mapTripToLegacyTour(trip, currentUser.role);
                // Try to find plan details
                const plan = travelerData.itineraries.find(p => p.id === trip.planId) || {};
                return {
                    ...mapped,
                    title: plan.title || mapped.title || "Tour",
                    location: plan.destination || mapped.location || "Location",
                    dateRange: mapped.dateTime ? mapped.dateTime.split(" | ")[0] : (mapped.date || "Date TBD"),
                    bookingId: mapped.id || mapped.bookingId,
                    type: mapped.type || "Tour",
                    status: normalizeTripStatus(mapped.status),
                    backendStatus: mapped.status,
                    image: plan.image || mapped.coverImage || mapped.image || DEFAULT_TRIP_IMAGE,
                    currentStop: mapped.currentloction,
                };
            });
            allTrips.push(...legacyTrips);
        } else {
            const assignments = await fetchTripsForTraveller(currentUser.id);
            const assignmentMap = new Map();
            assignments.forEach(a => {
                if (a.status !== 'cancelled') {
                    if (a.bookingId) {
                        assignmentMap.set(a.bookingId, a);
                    }
                    assignmentMap.set(a.planId, a); // Fallback
                }
            });

            travelerTours = travelerTours.map(tour => {
                const assignment = assignmentMap.get(String(tour.bookingId)) || assignmentMap.get(String(tour.id)) || assignmentMap.get(tour.planId);
                if (assignment) {
                    return {
                        ...tour,
                        guideId: assignment.guideId,
                        backendStatus: assignment.status,
                        status: normalizeTripStatus(assignment.status) === "Cancelled" ? "Cancelled" : "Upcoming"
                    };
                }
                return tour;
            });
            
            allTrips.push(...travelerTours);
        }
    } catch (e) {
        console.warn("Failed to fetch/merge trips", e);
    }

    try {
        const allReviews = await fetchReviews();
        const userReviews = allReviews.filter(r => String(r.userId) === String(currentUser.id));
        allTrips = allTrips.map(trip => {
            const hasReviewed = userReviews.some(r => String(r.targetId) === String(trip.bookingId));
            return { ...trip, hasReviewed };
        });
    } catch (e) {
        console.warn("Failed to fetch reviews for trips", e);
    }

    return allTrips;
}

function normalizeTripStatus(status) {
    const value = String(status || "").trim().toLowerCase();

    if (value === "cancelled" || value === "canceled") {
        return "Cancelled";
    }

    if (value === "completed" || value === "complete" || value === "checked_out") {
        return "Completed";
    }

    if (value === "end_requested") {
        return "Upcoming";
    }

    // CONFIRMED, CHECKED_IN, and anything else => Upcoming
    return "Upcoming";
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
    const typeStr = String(trip.type || "").toLowerCase();
    return Boolean(trip.experienceId) || typeStr.includes("experience");
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
    const experienceId = trip.experienceId || "1";
    const bookingParam = trip.bookingId ? `&booking=${encodeURIComponent(trip.bookingId)}` : '';
    const backendStatusParam = trip.backendStatus ? `&backendStatus=${encodeURIComponent(trip.backendStatus)}` : '';
    window.location.href = `./traveller_experience-detail.html?experience=${encodeURIComponent(experienceId)}${getTripStatusParam(trip)}${bookingParam}${backendStatusParam}`;
}

function openHotelTrip(trip) {
    const hotelId = trip.hotelId || "grand-luxury";
    const bookingIdParam = trip.bookingId ? `&bookingId=${encodeURIComponent(trip.bookingId)}` : "";
    window.location.href = `./traveller_hotel-detail.html?hotel=${encodeURIComponent(hotelId)}${getTripStatusParam(trip)}${bookingIdParam}`;
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

    const bookingId = trip.bookingId || trip.id;
    window.location.href = `./traveller_booking-confirmation.html?plan=${encodeURIComponent(bookingId)}${getTripStatusParam(trip)}`;
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

