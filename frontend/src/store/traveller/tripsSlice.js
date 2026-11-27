import { createSlice } from '@reduxjs/toolkit';
import { loginUser, logoutSession, logoutUser, registerUser, restoreAuthSession, setAuthUser } from '@/features/authSlice.js';
import { mapBackendTrip, reconcileTripTracking } from '@/utils/tripTrackingUtils.js';
import { processCheckoutPayment } from './checkoutThunks.js';
import {
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

function reconcileTripList(prevTrips = [], incomingMapped = []) {
  const prevMap = new Map((prevTrips || []).map((t) => [t.id, t]));
  return incomingMapped.map((incoming) => {
    const existing = prevMap.get(incoming.id);
    return existing ? reconcileTripTracking(existing, incoming) : incoming;
  });
}

const initialState = {
  items: [],
  loading: false,
  error: null,
  loaded: false,
  refreshing: false,
  detailsLoading: false,
  detailError: null,
  selectedTripId: null,
  actionLoading: false,
  actionError: null,
  guideActionLoading: false,
  guideActionError: null,
  lastCancellation: null,
  availableGuidesByTripId: {},
  availableGuidesLoading: {},
  availableGuidesError: {},
};

const tripsSlice = createSlice({
  name: 'traveller/trips',
  initialState,
  reducers: {
    setSelectedTripId(state, action) {
      state.selectedTripId = action.payload;
    },
    clearTripActionError(state) {
      state.actionError = null;
      state.guideActionError = null;
    },
    clearTripDetailError(state) {
      state.detailError = null;
    },
    clearTripCancellationResult(state) {
      state.lastCancellation = null;
    },
    resetTripsState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTravellerTrips.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTravellerTrips.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.loaded = true;
        state.items = reconcileTripList(state.items, action.payload);
      })
      .addCase(fetchTravellerTrips.rejected, (state, action) => {
        state.loading = false;
        state.items = [];
        state.error = action.payload || action.error.message || 'Failed to load trips';
      })
      .addCase(pollTravellerTrips.pending, (state) => {
        state.refreshing = true;
      })
      .addCase(pollTravellerTrips.fulfilled, (state, action) => {
        state.refreshing = false;
        const payload = action.payload;
        if (payload.mode === 'single' && payload.trip) {
          const exists = state.items.some((t) => t.id === payload.tripId);
          state.items = exists
            ? state.items.map((t) => (t.id === payload.tripId ? reconcileTripTracking(t, payload.trip) : t))
            : [...state.items, payload.trip];
        } else if (payload.mode === 'list') {
          state.items = reconcileTripList(state.items, payload.trips);
        }
      })
      .addCase(pollTravellerTrips.rejected, (state) => {
        // Background poll failure preserves current state without regressions.
        state.refreshing = false;
      })
      .addCase(fetchTripDetail.pending, (state) => {
        state.detailsLoading = true;
        state.detailError = null;
      })
      .addCase(fetchTripDetail.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.detailError = null;
        const detail = action.payload;
        if (!detail) return;
        const exists = state.items.some((t) => t.id === detail.id);
        state.items = exists
          ? state.items.map((t) => (t.id === detail.id ? reconcileTripTracking(t, detail) : t))
          : [...state.items, detail];
      })
      .addCase(fetchTripDetail.rejected, (state, action) => {
        state.detailsLoading = false;
        state.detailError = action.payload || action.error?.message || 'Failed to load trip details';
      })
      .addCase(cancelTravellerTrip.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
        state.lastCancellation = null;
      })
      .addCase(cancelTravellerTrip.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.actionError = null;
        const { id, result } = action.payload;
        const mappedTrip = result?.trip ? mapBackendTrip(result.trip) : null;
        const cancellationResult = {
          ...(result && typeof result === 'object' ? result : {}),
          ...(result?.trip && typeof result.trip === 'object' ? result.trip : {}),
        };
        const patch = mappedTrip || {
          status: 'cancelled',
          refundEligibility: result?.refundEligibility,
          refundStatus: result?.refundStatus,
          refundAmount: result?.refundAmount,
          refundReference: result?.refundReference,
          cancellationPolicyNote: result?.cancellationPolicyNote,
          cancelledAt: result?.cancelledAt,
          cancellationReason: result?.cancellationReason,
        };
        state.items = state.items.map((t) => (t.id === id ? { ...t, ...patch } : t));
        state.lastCancellation = {
          id,
          bookingType: 'trip',
          result: cancellationResult,
        };
      })
      .addCase(cancelTravellerTrip.rejected, (state, action) => {
        state.actionLoading = false;
        state.lastCancellation = null;
        state.actionError = action.payload || action.error.message || 'Failed to cancel trip.';
      })
      .addCase(retryTravellerTripRefund.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(retryTravellerTripRefund.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.actionError = null;
        const { tripId, result } = action.payload;
        const refundStatus = result?.refund?.status || result?.refundStatus;
        state.items = state.items.map((t) =>
          t.id === tripId
            ? {
                ...t,
                ...(refundStatus ? { refundStatus } : {}),
                ...(result?.refundAmount !== undefined ? { refundAmount: result.refundAmount } : {}),
                ...(result?.refundReference ? { refundReference: result.refundReference } : {}),
              }
            : t,
        );
      })
      .addCase(retryTravellerTripRefund.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || action.error?.message || 'Failed to retry refund.';
      })
      .addCase(requestGuideForTrip.pending, (state) => {
        state.guideActionLoading = true;
        state.guideActionError = null;
        state.actionError = null;
      })
      .addCase(requestGuideForTrip.fulfilled, (state, action) => {
        state.guideActionLoading = false;
        state.guideActionError = null;
        const { tripId, updated } = action.payload;
        if (updated) {
          state.items = state.items.map((t) => (t.id === tripId ? reconcileTripTracking(t, updated) : t));
        }
      })
      .addCase(requestGuideForTrip.rejected, (state, action) => {
        state.guideActionLoading = false;
        state.guideActionError =
          action.payload || action.error?.message || 'Could not send the request.';
      })
      .addCase(cancelGuideForTrip.pending, (state) => {
        state.guideActionLoading = true;
        state.guideActionError = null;
        state.actionError = null;
      })
      .addCase(cancelGuideForTrip.fulfilled, (state, action) => {
        state.guideActionLoading = false;
        state.guideActionError = null;
        const { tripId, updated } = action.payload;
        state.items = state.items.map((t) =>
          t.id === tripId
            ? (updated ? reconcileTripTracking(t, updated) : { ...t, guideId: null, guideName: '', status: 'confirmed' })
            : t,
        );
      })
      .addCase(cancelGuideForTrip.rejected, (state, action) => {
        state.guideActionLoading = false;
        state.guideActionError =
          action.payload || action.error?.message || 'Could not cancel the request.';
      })
      .addCase(createTravellerTrip.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createTravellerTrip.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.actionError = null;
        const created = action.payload;
        if (created?.id) {
          state.items = [created, ...state.items.filter((t) => t.id !== created.id)];
        }
      })
      .addCase(createTravellerTrip.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || action.error?.message || 'Failed to create trip.';
      })
      .addCase(updateTravellerTrip.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(updateTravellerTrip.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.actionError = null;
        const updated = action.payload;
        if (updated?.id) {
          state.items = state.items.map((t) =>
            t.id === updated.id ? reconcileTripTracking(t, updated) : t,
          );
        }
      })
      .addCase(updateTravellerTrip.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || action.error?.message || 'Failed to update trip.';
      })
      .addCase(fetchTripAvailableGuides.pending, (state, action) => {
        const tripId = action.meta.arg;
        state.availableGuidesLoading[tripId] = true;
        state.availableGuidesError[tripId] = null;
      })
      .addCase(fetchTripAvailableGuides.fulfilled, (state, action) => {
        const { tripId, guides } = action.payload;
        state.availableGuidesLoading[tripId] = false;
        state.availableGuidesByTripId[tripId] = guides;
        state.availableGuidesError[tripId] = null;
      })
      .addCase(fetchTripAvailableGuides.rejected, (state, action) => {
        const tripId = action.payload?.tripId || action.meta.arg;
        state.availableGuidesLoading[tripId] = false;
        state.availableGuidesError[tripId] =
          action.payload?.message || action.error?.message || 'Could not load guides.';
      })
      .addCase(processCheckoutPayment.fulfilled, (state, action) => {
        if (action.payload?.outcome === 'SUCCEEDED') {
          state.selectedTripId = null;
          if (action.payload.createdTrip) {
            const mapped = mapBackendTrip(action.payload.createdTrip);
            if (mapped?.id) {
              state.items = [mapped, ...state.items.filter((t) => t.id !== mapped.id)];
            }
          }
        }
      })
      .addCase(logoutUser, () => initialState)
      .addCase(logoutSession.fulfilled, () => initialState)
      .addCase(restoreAuthSession.rejected, () => initialState)
      .addCase(setAuthUser, () => initialState)
      .addCase(loginUser.fulfilled, () => initialState)
      .addCase(registerUser.fulfilled, () => initialState);
  },
});

export const {
  setSelectedTripId,
  clearTripActionError,
  clearTripDetailError,
  clearTripCancellationResult,
  resetTripsState,
} = tripsSlice.actions;

export default tripsSlice.reducer;
