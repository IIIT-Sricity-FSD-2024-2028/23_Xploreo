export const APP_ROLES = Object.freeze({
  PARTNER: "PARTNER",
  TRAVELLER_ACTOR: "TRAVELLER",
  ADMIN: "ADMIN",
  TECH_ADMIN: "TECH_ADMIN",
  EXPERIENCE_PARTNER: "EXPERIENCE_PARTNER",
  SUPERADMIN: "superadmin",
  TRAVELLER: "traveller",
  GUIDE: "guide",
  TECHADMIN: "techadmin",
  NONTECHADMIN: "nontechadmin",
  HOTEL: "hotel",
  EXPERIENCE: "experience",
});

export const API_ENDPOINTS = Object.freeze({
  // Auth
  login: "/auth/login",
  register: "/auth/register",
  users: "/auth/users",
  admins: "/auth/admins",

  // Traveller
  traveller: "/traveller",

  // Guide
  guide: "/guide",
  guideRequests: "/guide-requests",

  // Hotels
  hotels: "/hotels",
  bookings: "/bookings",
  partnerBookings: "/partners/bookings",

  // Experiences
  experiences: "/experiences",
  experienceBookings: "/experience-bookings",

  // Plans
  plans: "/plans",

  // Trips
  trips: "/trips",

  // Reviews
  reviews: "/reviews",

  // Support tickets
  tickets: "/tickets",

  // Schedule
  schedule: "/schedule",

  // Location
  location: "/location",

  // Guide (new workflow)
  guideApplications: "/guide-applications",
  guideApplicationsByGuide: (guideId) => `/guide-applications/guide/${guideId}`,
  guideApplicationsByPlan: (planId) => `/guide-applications/plan/${planId}`,
  guideAvailableForPlan: (planId) => `/guide-applications/plan/${planId}/available`,
  guideAssignments: "/guide-assignments",
  guideAssignmentsByGuide: (guideId) => `/guide-assignments/guide/${guideId}`,
  guideAssignmentsByTraveller: (travellerId) => `/guide-assignments/traveller/${travellerId}`,
  guideAssignmentConfirm: (id) => `/guide-assignments/${id}/confirm`,
  guideAssignmentReject: (id) => `/guide-assignments/${id}/reject`,
  guideAssignmentChangeGuide: (id) => `/guide-assignments/${id}/change-guide`,
  guideAssignmentCancel: (id) => `/guide-assignments/${id}/cancel`,
  hotelBookingCancel: (id) => `/bookings/${id}/cancel`,

  // Cities
  cities: "/cities",

  // Reviews
  reviews: "/reviews",
  reviewsByTarget: (type, id) => `/reviews?targetType=${type}&targetId=${id}`,

  // Payments (Razorpay)
  paymentsCreateOrder: "/payments/create-order",
  paymentsVerify: "/payments/verify",

});

export const API_SESSION_KEY = "xploreo_api_session";
