import { combineReducers } from '@reduxjs/toolkit';
import bookingsReducer from './bookingsSlice.js';
import browseReducer from './browseSlice.js';
import checkoutReducer from './checkoutSlice.js';
import dashboardReducer from './dashboardSlice.js';
import reviewsReducer from './reviewsSlice.js';
import supportTicketsReducer from './supportTicketsSlice.js';
import tripsReducer from './tripsSlice.js';

// Traveller Portal state, registered in store/index.js as `traveller`.
export const travellerReducer = combineReducers({
  dashboard: dashboardReducer,
  browse: browseReducer,
  bookings: bookingsReducer,
  trips: tripsReducer,
  reviews: reviewsReducer,
  supportTickets: supportTicketsReducer,
  checkout: checkoutReducer,
});

export { resetDashboardState } from './dashboardSlice.js';
export { calculateBookingStats, fetchDashboardSummary } from './dashboardThunks.js';

export {
  clearBrowseDetail,
  resetBrowseFilters,
  setBrowseCategory,
  setBrowseFilters,
  setSelectedItemPreview,
  toggleBrowseAmenity,
} from './browseSlice.js';
export {
  fetchBrowseExperiences,
  fetchBrowseHotels,
  fetchBrowseItemDetail,
  fetchBrowsePlans,
} from './browseThunks.js';

export {
  clearBookingActionError,
  clearBookingCancellationResult,
  resetBookingsState,
  setSelectedBookingDetail,
  setSelectedBookingId,
} from './bookingsSlice.js';
export {
  cancelGuideForExperienceBooking,
  cancelTravellerBooking,
  confirmExperienceBookingEnd,
  createExperienceSlotBooking,
  createHotelBooking,
  fetchBookingDetail,
  fetchExperienceAvailableGuides,
  fetchTravellerBookings,
  requestGuideForExperienceBooking,
  retryBookingRefund,
} from './bookingsThunks.js';

export {
  clearTripActionError,
  clearTripCancellationResult,
  clearTripDetailError,
  resetTripsState,
  setSelectedTripId,
} from './tripsSlice.js';
export {
  cancelGuideForTrip,
  cancelTravellerTrip,
  createTravellerTrip,
  fetchTravellerTrips,
  fetchTripAvailableGuides,
  fetchTripDetail,
  pollTravellerTrips,
  requestGuideForTrip,
  retryTravellerTripRefund,
  updateTravellerTrip,
} from './tripsThunks.js';

export {
  addDemoReview,
  clearReviewError,
  clearReviewSubmitState,
  resetReviewsState,
} from './reviewsSlice.js';
export {
  deleteReviewItem,
  fetchReviewById,
  fetchReviews,
  submitReview,
  updateReviewItem,
} from './reviewsThunks.js';

export {
  clearCreateTicketState,
  clearSupportTicketsError,
  resetSupportTicketsState,
} from './supportTicketsSlice.js';
export {
  createSupportTicket,
  fetchSupportTickets,
  resolveSupportTicket,
} from './supportTicketsThunks.js';

export {
  DEFAULT_DEMO_ITEM,
  initCheckoutSession,
  resetCheckoutState,
  setCheckoutError,
  setCheckoutItem,
  setCheckoutStep,
  setGuestCount,
  setPaymentMethod,
  setRoomCount,
  setSimulatedOutcome,
  setTravellerDetails,
} from './checkoutSlice.js';
export { processCheckoutPayment } from './checkoutThunks.js';

export * from './selectors.js';
