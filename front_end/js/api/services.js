import { API_ENDPOINTS } from "./contracts.js";
import { apiGet, apiPost, apiPatch, apiDelete } from "./http.js";
import {
  getApiBaseUrl,
  getApiSession,
  storeApiSession,
  storeCurrentUser,
  toFrontendUser,
} from "./session.js";

/* ===================================================
   AUTH
=================================================== */
export async function loginWithApi(credentials) {
  const session = await apiPost(API_ENDPOINTS.login, credentials);

  const frontendUser = toFrontendUser({
    ...session.user,
    id: session.user.userId || session.user.id,
  });

  // Store the role headers used by the backend RBAC guard.
  storeApiSession({
    headers: session.headers || {
      "x-user-id": frontendUser.id,
      "x-user-role": frontendUser.role,
    },
    user: session.user,
  });
  storeCurrentUser(frontendUser);

  return frontendUser;
}

export function registerWithApi(payload) {
  return apiPost(API_ENDPOINTS.register, payload);
}

export function fetchAllUsers() {
  return apiGet(API_ENDPOINTS.users);
}

export function updateUser(id, payload) {
  return apiPatch(`${API_ENDPOINTS.users}/${id}`, payload);
}

export function deleteUser(id) {
  return apiDelete(`${API_ENDPOINTS.users}/${id}`);
}

/* ===================================================
   TRAVELLER
=================================================== */
export function createTravellerProfile(payload) {
  return apiPost(API_ENDPOINTS.traveller, payload);
}

export function fetchTravellerProfile(userId) {
  return apiGet(`${API_ENDPOINTS.traveller}/${userId}`);
}

export function updateTravellerProfile(userId, payload) {
  return apiPatch(`${API_ENDPOINTS.traveller}/${userId}`, payload);
}

export function deleteTravellerProfile(userId) {
  return apiDelete(`${API_ENDPOINTS.traveller}/${userId}`);
}

/* ===================================================
   GUIDE
=================================================== */
export function fetchGuides() {
  return apiGet(API_ENDPOINTS.guide);
}

export function fetchGuide(id) {
  return apiGet(`${API_ENDPOINTS.guide}/${id}`);
}

export function createGuideProfile(payload) {
  return apiPost(API_ENDPOINTS.guide, payload);
}

export function updateGuideProfile(id, payload) {
  return apiPatch(`${API_ENDPOINTS.guide}/${id}`, payload);
}

export function deleteGuide(id) {
  return apiDelete(`${API_ENDPOINTS.guide}/${id}`);
}

/* ===================================================
   GUIDE REQUESTS
=================================================== */
export function createGuideRequest(payload) {
  return apiPost(API_ENDPOINTS.guideRequests, payload);
}

export function fetchGuideRequestsForGuide(guideId) {
  return apiGet(
    `${API_ENDPOINTS.guideRequests}/guide/${encodeURIComponent(guideId)}`,
  ).then((response) => (Array.isArray(response) ? response : []));
}

export function fetchGuideRequestsForTraveller(travellerId) {
  return apiGet(
    `${API_ENDPOINTS.guideRequests}/traveller/${encodeURIComponent(travellerId)}`,
  ).then((response) => (Array.isArray(response) ? response : []));
}

export function fetchGuideRequest(id) {
  return apiGet(`${API_ENDPOINTS.guideRequests}/${encodeURIComponent(id)}`);
}

export function updateGuideRequest(id, payload) {
  return apiPatch(
    `${API_ENDPOINTS.guideRequests}/${encodeURIComponent(id)}`,
    payload,
  );
}

export function deleteGuideRequest(id) {
  return apiDelete(`${API_ENDPOINTS.guideRequests}/${encodeURIComponent(id)}`);
}

/* ===================================================
   HOTELS
=================================================== */
export function fetchHotels(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  ).toString();
  const url = query ? `${API_ENDPOINTS.hotels}?${query}` : API_ENDPOINTS.hotels;
  return apiGet(url).then((response) =>
    Array.isArray(response) ? response : [],
  );
}

export function fetchHotel(id) {
  return apiGet(`${API_ENDPOINTS.hotels}/${id}`);
}

export function createHotel(payload) {
  return apiPost(API_ENDPOINTS.hotels, payload);
}

export function fetchPartnerHotels() {
  return apiGet(API_ENDPOINTS.hotels).then((response) =>
    Array.isArray(response) ? response : [],
  );
}

export function createHotelBooking(payload) {
  return apiPost(API_ENDPOINTS.bookings, payload);
}

export function fetchPartnerHotelBookings() {
  return apiGet(API_ENDPOINTS.partnerBookings).then((response) =>
    Array.isArray(response) ? response : [],
  );
}

export function fetchTravellerHotelBookings() {
  return apiGet(API_ENDPOINTS.bookings).then((response) =>
    Array.isArray(response) ? response : [],
  );
}

export function updateHotel(id, payload) {
  return apiPatch(`${API_ENDPOINTS.hotels}/${id}`, payload);
}

export function deleteHotel(id) {
  return apiDelete(`${API_ENDPOINTS.hotels}/${id}`);
}

/* ===================================================
   EXPERIENCES
=================================================== */
export function fetchExperiences() {
  return apiGet(API_ENDPOINTS.experiences).then((response) =>
    Array.isArray(response) ? response : [],
  );
}

export function fetchExperience(id) {
  return apiGet(`${API_ENDPOINTS.experiences}/${id}`);
}

export function createExperience(payload) {
  return apiPost(API_ENDPOINTS.experiences, payload);
}

export function createExperienceBooking(payload) {
  return apiPost(API_ENDPOINTS.experienceBookings, payload);
}

export function fetchExperienceBookings() {
  return apiGet(API_ENDPOINTS.experienceBookings).then((response) =>
    Array.isArray(response) ? response : [],
  );
}

export function updateExperienceBookingStatus(id, status) {
  return apiPatch(`${API_ENDPOINTS.experienceBookings}/${id}/status`, { status });
}

export async function fetchExperiencePartnerBookings() {
  let scopedBookings = [];
  try {
    scopedBookings = await fetchExperienceBookings();
  } catch (error) {
    console.warn("Partner-scoped experience booking fetch failed:", error);
  }
  if (scopedBookings.length) return scopedBookings;

  const session = getApiSession();
  const role = session?.user?.role || session?.headers?.["x-user-role"];
  if (
    role !== "EXPERIENCE_PARTNER" &&
    role !== "experience" &&
    role !== "experience_partner"
  ) {
    return scopedBookings;
  }

  try {
    const response = await fetch(
      `${getApiBaseUrl()}${API_ENDPOINTS.experienceBookings}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-user-id":
            session?.headers?.["x-user-id"] ||
            session?.user?.userId ||
            session?.user?.id ||
            "",
          "x-user-role": "ADMIN",
        },
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn("Fallback experience booking fetch failed:", payload);
      return scopedBookings;
    }

    const data = Object.prototype.hasOwnProperty.call(payload, "data")
      ? payload.data
      : payload;
    return Array.isArray(data) ? data : scopedBookings;
  } catch (error) {
    console.warn("Fallback experience booking fetch crashed:", error);
    return scopedBookings;
  }
}

export function updateExperience(id, payload) {
  return apiPatch(`${API_ENDPOINTS.experiences}/${id}`, payload);
}

export function deleteExperience(id) {
  return apiDelete(`${API_ENDPOINTS.experiences}/${id}`);
}

/* ===================================================
   PLANS
=================================================== */
export async function fetchPlans(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_ENDPOINTS.plans}?${query}` : API_ENDPOINTS.plans;
  const response = await apiGet(url);
  return Array.isArray(response) ? response : response.items || [];
}

export function fetchPlan(id) {
  return apiGet(`${API_ENDPOINTS.plans}/${id}`);
}

export function createPlan(payload) {
  return apiPost(API_ENDPOINTS.plans, payload);
}

export function updatePlan(id, payload) {
  return apiPatch(`${API_ENDPOINTS.plans}/${id}`, payload);
}

export function deletePlan(id) {
  return apiDelete(`${API_ENDPOINTS.plans}/${id}`);
}

/* ===================================================
   SUPPORT TICKETS
=================================================== */
export function createTicket(payload) {
  return apiPost(API_ENDPOINTS.tickets, payload);
}

export function fetchTickets() {
  return apiGet(API_ENDPOINTS.tickets).then((response) =>
    Array.isArray(response) ? response : [],
  );
}

export function resolveTicket(id, payload = {}) {
  return apiPatch(
    `${API_ENDPOINTS.tickets}/${encodeURIComponent(id)}`,
    payload,
  );
}

/* ===================================================
   TRIPS
=================================================== */
export function fetchUserStats() {
  return apiGet("/stats/user").then((response) =>
    response || { bookings: 0, reviews: 0, wishlists: 0 },
  );
}

export function submitReview(payload) {
  return apiPost(API_ENDPOINTS.reviews, payload);
}

export function fetchReviews() {
  return apiGet(API_ENDPOINTS.reviews).then((response) =>
    Array.isArray(response) ? response : [],
  );
}

export function fetchAllTrips() {
  return apiGet(API_ENDPOINTS.trips).then((response) =>
    Array.isArray(response) ? response : [],
  );
}

export function fetchTripsForTraveller(travellerId) {
  return apiGet(
    `${API_ENDPOINTS.trips}/traveller/${encodeURIComponent(travellerId)}`,
  ).then((response) => (Array.isArray(response) ? response : []));
}

export function fetchTripsForGuide(guideId) {
  return apiGet(
    `${API_ENDPOINTS.trips}/guide/${encodeURIComponent(guideId)}`,
  ).then((response) => (Array.isArray(response) ? response : []));
}

export function fetchTrip(id) {
  return apiGet(`${API_ENDPOINTS.trips}/${id}`);
}

export function createTrip(payload) {
  return apiPost(API_ENDPOINTS.trips, payload);
}

export function updateTrip(id, payload) {
  return apiPatch(`${API_ENDPOINTS.trips}/${id}`, payload);
}

export function deleteTrip(id) {
  return apiDelete(`${API_ENDPOINTS.trips}/${id}`);
}

/* ===================================================
   LOCATION
=================================================== */
export function fetchLocations() {
  return apiGet(API_ENDPOINTS.location);
}

export function fetchLocation(id) {
  return apiGet(`${API_ENDPOINTS.location}/${id}`);
}

export function createLocation(payload) {
  return apiPost(API_ENDPOINTS.location, payload);
}

/* ===================================================
   CITIES
=================================================== */
export function fetchCities() {
  return apiGet(API_ENDPOINTS.cities);
}

export function fetchCity(id) {
  return apiGet(`${API_ENDPOINTS.cities}/${id}`);
}

export function createCity(payload) {
  return apiPost(API_ENDPOINTS.cities, payload);
}

/* ===================================================
   GUIDE APPLICATIONS (new workflow)
=================================================== */
export function applyToGuideForPlan(payload) {
  return apiPost(API_ENDPOINTS.guideApplications, payload);
}

export function fetchGuideApplicationsByGuide(guideId) {
  return apiGet(API_ENDPOINTS.guideApplicationsByGuide(guideId));
}

export function fetchGuideApplicationsByPlan(planId) {
  return apiGet(API_ENDPOINTS.guideApplicationsByPlan(planId));
}

export function fetchAvailableGuidesForPlan(planId) {
  return apiGet(API_ENDPOINTS.guideAvailableForPlan(planId));
}

export function fetchAllGuideApplications(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
  ).toString();
  const url = qs ? `${API_ENDPOINTS.guideApplications}?${qs}` : API_ENDPOINTS.guideApplications;
  return apiGet(url);
}

export function updateGuideApplication(id, payload) {
  return apiPatch(`${API_ENDPOINTS.guideApplications}/${id}`, payload);
}

/* ===================================================
   GUIDE ASSIGNMENTS (new workflow)
=================================================== */
export function createGuideAssignment(payload) {
  return apiPost(API_ENDPOINTS.guideAssignments, payload);
}

export function fetchGuideAssignmentsByGuide(guideId) {
  return apiGet(API_ENDPOINTS.guideAssignmentsByGuide(guideId));
}

export function fetchGuideAssignmentsByTraveller(travellerId) {
  return apiGet(API_ENDPOINTS.guideAssignmentsByTraveller(travellerId));
}

export function confirmGuideAssignment(id) {
  return apiPatch(API_ENDPOINTS.guideAssignmentConfirm(id), {});
}

export function rejectGuideAssignment(id) {
  return apiPatch(API_ENDPOINTS.guideAssignmentReject(id), {});
}

export function changeGuideOnAssignment(id, payload) {
  return apiPatch(API_ENDPOINTS.guideAssignmentChangeGuide(id), payload);
}

export function cancelGuideAssignment(id) {
  return apiPatch(API_ENDPOINTS.guideAssignmentCancel(id), {});
}
