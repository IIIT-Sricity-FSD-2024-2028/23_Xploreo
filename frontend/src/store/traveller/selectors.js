import { checkoutInitialState, DEFAULT_TRAVELLER_DETAILS } from './checkoutSlice.js';

const EMPTY_LIST = [];

// ---------------------------------------------------------------------------
// Dashboard (state.traveller.dashboard)
// ---------------------------------------------------------------------------

export const selectBookingStats = (state) => state.traveller.dashboard.bookingStats;
export const selectTripStats = (state) => state.traveller.dashboard.tripStats;
export const selectReviewStats = (state) => state.traveller.dashboard.reviewStats;
export const selectDashboardLoading = (state) => state.traveller.dashboard.loading;

// ---------------------------------------------------------------------------
// Browse (state.traveller.browse)
// ---------------------------------------------------------------------------

export const selectBrowseActiveCategory = (state) => state.traveller.browse.activeCategory;
export const selectBrowseFilters = (state) => state.traveller.browse.filters;
export const selectBrowseHotels = (state) => state.traveller.browse.hotels;
export const selectBrowseExperiences = (state) => state.traveller.browse.experiences;
export const selectBrowsePlans = (state) => state.traveller.browse.plans;
export const selectBrowseDetail = (state) => state.traveller.browse.detail;

// ---------------------------------------------------------------------------
// Bookings (state.traveller.bookings)
// ---------------------------------------------------------------------------

export const selectBookingsList = (state) => state.traveller.bookings.items;
export const selectBookingsLoading = (state) => state.traveller.bookings.loading;
export const selectBookingsError = (state) => state.traveller.bookings.error;
export const selectSelectedBookingId = (state) => state.traveller.bookings.selectedBookingId;
export const selectSelectedBookingDetail = (state) => state.traveller.bookings.selectedBookingDetail;
export const selectSelectedBookingHotel = (state) => state.traveller.bookings.selectedBookingHotel;
export const selectBookingDetailLoading = (state) => state.traveller.bookings.detailLoading;
export const selectBookingDetailError = (state) => state.traveller.bookings.detailError;
export const selectBookingActionLoading = (state) => Boolean(state.traveller.bookings.actionLoading);
export const selectBookingActionError = (state) => state.traveller.bookings.actionError || null;
export const selectBookingCancellationResult = (state) => state.traveller.bookings.lastCancellation || null;
export const selectBookingGuideActionLoading = (state) => Boolean(state.traveller.bookings.guideActionLoading);
export const selectBookingGuideActionError = (state) => state.traveller.bookings.guideActionError || null;
export const selectExperienceAvailableGuides = (state, bookingId) =>
  state.traveller.bookings.availableGuidesByBookingId?.[bookingId] ?? null;
export const selectExperienceGuidesLoading = (state, bookingId) =>
  Boolean(state.traveller.bookings.availableGuidesLoading?.[bookingId]);
export const selectExperienceGuidesError = (state, bookingId) =>
  state.traveller.bookings.availableGuidesError?.[bookingId] || null;

// ---------------------------------------------------------------------------
// Trips (state.traveller.trips)
// ---------------------------------------------------------------------------

export const selectTripsList = (state) => state.traveller.trips.items;
export const selectTripsLoading = (state) => state.traveller.trips.loading;
export const selectTripsError = (state) => state.traveller.trips.error;
export const selectTripsRefreshing = (state) => state.traveller.trips.refreshing;
export const selectTripDetailsLoading = (state) => state.traveller.trips.detailsLoading;
export const selectTripDetailError = (state) => state.traveller.trips.detailError || null;
export const selectSelectedTripId = (state) => state.traveller.trips.selectedTripId;
export const selectTripActionLoading = (state) => Boolean(state.traveller.trips.actionLoading);
export const selectTripActionError = (state) => state.traveller.trips.actionError || null;
export const selectTripCancellationResult = (state) => state.traveller.trips.lastCancellation || null;
export const selectTripGuideActionLoading = (state) => Boolean(state.traveller.trips.guideActionLoading);
export const selectTripGuideActionError = (state) => state.traveller.trips.guideActionError || null;
export const selectTripAvailableGuides = (state, tripId) =>
  state.traveller.trips.availableGuidesByTripId?.[tripId] ?? null;
export const selectTripGuidesLoading = (state, tripId) =>
  Boolean(state.traveller.trips.availableGuidesLoading?.[tripId]);
export const selectTripGuidesError = (state, tripId) =>
  state.traveller.trips.availableGuidesError?.[tripId] || null;

// ---------------------------------------------------------------------------
// Reviews (state.traveller.reviews)
// ---------------------------------------------------------------------------

export const selectReviewsList = (state) => state.traveller?.reviews?.items || EMPTY_LIST;
export const selectReviewsHasLoaded = (state) => Boolean(state.traveller?.reviews?.hasLoaded);
export const selectReviewsLoading = (state) => Boolean(state.traveller?.reviews?.loading);
export const selectReviewsError = (state) => state.traveller?.reviews?.error || null;
export const selectReviewSubmitting = (state) => Boolean(state.traveller?.reviews?.submitting);
export const selectReviewSubmitError = (state) => state.traveller?.reviews?.submitError || null;
export const selectLastSubmittedReview = (state) => state.traveller?.reviews?.lastSubmitted || null;
export const selectReviewActionLoading = (state) => Boolean(state.traveller?.reviews?.actionLoading);
export const selectReviewActionError = (state) => state.traveller?.reviews?.actionError || null;
export const selectSelectedReview = (state) => state.traveller?.reviews?.selectedReview || null;
export const selectSelectedReviewLoading = (state) => Boolean(state.traveller?.reviews?.selectedLoading);

// ---------------------------------------------------------------------------
// Support Tickets (state.traveller.supportTickets)
// ---------------------------------------------------------------------------

export const selectSupportTickets = (state) => state.traveller?.supportTickets?.items || EMPTY_LIST;
export const selectSupportTicketsHasLoaded = (state) => Boolean(state.traveller?.supportTickets?.hasLoaded);
export const selectSupportTicketsLoading = (state) => Boolean(state.traveller?.supportTickets?.loading);
export const selectSupportTicketsError = (state) => state.traveller?.supportTickets?.error || null;
export const selectSupportTicketCreating = (state) => Boolean(state.traveller?.supportTickets?.creating);
export const selectSupportTicketCreateError = (state) => state.traveller?.supportTickets?.createError || null;
export const selectLastCreatedTicket = (state) => state.traveller?.supportTickets?.lastCreatedTicket || null;
export const selectSupportTicketResolving = (state) => Boolean(state.traveller?.supportTickets?.resolving);
export const selectSupportTicketResolveError = (state) => state.traveller?.supportTickets?.resolveError || null;

// ---------------------------------------------------------------------------
// Checkout (state.traveller.checkout)
// ---------------------------------------------------------------------------

export const selectCheckoutState = (state) => state.traveller?.checkout || checkoutInitialState;
export const selectCheckoutItem = (state) => state.traveller?.checkout?.selectedItem || null;
export const selectCheckoutStep = (state) => state.traveller?.checkout?.currentStepIndex ?? 0;
export const selectCheckoutGuestCount = (state) => state.traveller?.checkout?.guestCount ?? 2;
export const selectCheckoutRoomCount = (state) => state.traveller?.checkout?.roomCount ?? 1;
export const selectCheckoutTravellerDetails = (state) =>
  state.traveller?.checkout?.travellerDetails || DEFAULT_TRAVELLER_DETAILS;
export const selectCheckoutPaymentMethod = (state) => state.traveller?.checkout?.selectedMethod || 'upi';
export const selectCheckoutSimulatedOutcome = (state) => state.traveller?.checkout?.simulatedOutcome || 'SUCCESS';
export const selectCheckoutProcessing = (state) => Boolean(state.traveller?.checkout?.isProcessing);
export const selectCheckoutPaymentResult = (state) => state.traveller?.checkout?.paymentResult || null;
export const selectCheckoutErrorMessage = (state) => state.traveller?.checkout?.errorMessage || '';
export const selectCheckoutCreatedExperience = (state) => state.traveller?.checkout?.createdExperience || null;
