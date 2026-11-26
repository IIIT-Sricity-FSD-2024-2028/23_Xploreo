import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  cancelGuideRequest,
  cancelTrip,
  getTravellerTrips,
  getTripById,
  requestGuide,
  retryTripRefund,
} from '../services/tripGuides.api.js';
import { mapBackendTrip, reconcileTripTracking } from '../utils/tripTrackingUtils.js';
import { loginUser, logoutSession, logoutUser, registerUser, setAuthUser } from './authSlice.js';
import { processCheckoutPayment } from './checkoutSlice.js';

function reconcileTripList(prevTrips = [], incomingMapped = []) {
  const prevMap = new Map((prevTrips || []).map((t) => [t.id, t]));
  return incomingMapped.map((incoming) => {
    const existing = prevMap.get(incoming.id);
    return existing ? reconcileTripTracking(existing, incoming) : incoming;
  });
}

export const fetchTravellerTrips = createAsyncThunk(
  'trips/fetchTravellerTrips',
  async (travellerId, { rejectWithValue }) => {
    try {
      if (!travellerId) {
        return rejectWithValue('Authentication required. Missing or invalid saved session.');
      }
      const rawData = await getTravellerTrips(travellerId);
      return Array.isArray(rawData) ? rawData.map(mapBackendTrip).filter(Boolean) : [];
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to load trips');
    }
  },
);

export const pollTravellerTrips = createAsyncThunk(
  'trips/pollTravellerTrips',
  async ({ travellerId, selectedTripId }, { rejectWithValue }) => {
    try {
      if (!travellerId) return { mode: 'noop' };
      if (selectedTripId) {
        const rawDetail = await getTripById(selectedTripId);
        return {
          mode: 'single',
          tripId: selectedTripId,
          trip: rawDetail ? mapBackendTrip(rawDetail) : null,
        };
      }
      const rawData = await getTravellerTrips(travellerId);
      const mapped = Array.isArray(rawData) ? rawData.map(mapBackendTrip).filter(Boolean) : [];
      return { mode: 'list', trips: mapped };
    } catch (error) {
      return rejectWithValue(error?.message || 'Background poll failed');
    }
  },
);

export const fetchTripDetail = createAsyncThunk(
  'trips/fetchTripDetail',
  async (tripId, { rejectWithValue }) => {
    try {
      const rawDetail = await getTripById(tripId);
      return rawDetail ? mapBackendTrip(rawDetail) : null;
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to load trip details');
    }
  },
);

export const cancelTravellerTrip = createAsyncThunk(
  'trips/cancelTravellerTrip',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const result = await cancelTrip(id, { reason });
      return { id, result };
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to cancel trip. Please try again.');
    }
  },
);

export const retryTravellerTripRefund = createAsyncThunk(
  'trips/retryTravellerTripRefund',
  async (tripId, { rejectWithValue }) => {
    try {
      const result = await retryTripRefund(tripId);
      return { tripId, result };
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to retry refund.');
    }
  },
);

export const requestGuideForTrip = createAsyncThunk(
  'trips/requestGuideForTrip',
  async ({ tripId, guideId }, { rejectWithValue }) => {
    try {
      const updated = await requestGuide(tripId, guideId);
      return { tripId, updated: updated ? mapBackendTrip(updated) : null };
    } catch (error) {
      return rejectWithValue(error?.message || 'Could not send the request.');
    }
  },
);

export const cancelGuideForTrip = createAsyncThunk(
  'trips/cancelGuideForTrip',
  async (tripId, { rejectWithValue }) => {
    try {
      const updated = await cancelGuideRequest(tripId);
      return { tripId, updated: updated ? mapBackendTrip(updated) : null };
    } catch (error) {
      return rejectWithValue(error?.message || 'Could not cancel the request.');
    }
  },
);

const initialState = {
  items: [],
  loading: false,
  error: null,
  loaded: false,
  refreshing: false,
  detailsLoading: false,
  selectedTripId: null,
  actionLoading: false,
  actionError: null,
};

const tripsSlice = createSlice({
  name: 'trips',
  initialState,
  reducers: {
    setSelectedTripId(state, action) {
      state.selectedTripId = action.payload;
    },
    clearTripActionError(state) {
      state.actionError = null;
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
      })
      .addCase(fetchTripDetail.fulfilled, (state, action) => {
        state.detailsLoading = false;
        const detail = action.payload;
        if (!detail) return;
        const exists = state.items.some((t) => t.id === detail.id);
        state.items = exists
          ? state.items.map((t) => (t.id === detail.id ? reconcileTripTracking(t, detail) : t))
          : [...state.items, detail];
      })
      .addCase(fetchTripDetail.rejected, (state) => {
        state.detailsLoading = false;
      })
      .addCase(cancelTravellerTrip.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(cancelTravellerTrip.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { id, result } = action.payload;
        const patch = result?.trip ? mapBackendTrip(result.trip) : {
          status: 'cancelled',
          refundStatus: result?.refundStatus,
          refundAmount: result?.refundAmount,
          refundReference: result?.refundReference,
          cancellationPolicyNote: result?.cancellationPolicyNote,
          cancelledAt: result?.cancelledAt,
          cancellationReason: result?.cancellationReason,
        };
        state.items = state.items.map((t) => (t.id === id ? { ...t, ...patch } : t));
      })
      .addCase(cancelTravellerTrip.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || action.error.message || 'Failed to cancel trip.';
      })
      .addCase(retryTravellerTripRefund.fulfilled, (state, action) => {
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
      .addCase(requestGuideForTrip.fulfilled, (state, action) => {
        const { tripId, updated } = action.payload;
        if (updated) {
          state.items = state.items.map((t) => (t.id === tripId ? reconcileTripTracking(t, updated) : t));
        }
      })
      .addCase(cancelGuideForTrip.fulfilled, (state, action) => {
        const { tripId, updated } = action.payload;
        state.items = state.items.map((t) =>
          t.id === tripId
            ? (updated ? reconcileTripTracking(t, updated) : { ...t, guideId: null, guideName: '', status: 'confirmed' })
            : t,
        );
      })
      .addCase(processCheckoutPayment.fulfilled, (state, action) => {
        if (action.payload?.outcome === 'SUCCEEDED') {
          state.selectedTripId = null;
        }
      })
      .addCase(logoutUser, () => initialState)
      .addCase(logoutSession.fulfilled, () => initialState)
      .addCase(setAuthUser, () => initialState)
      .addCase(loginUser.fulfilled, () => initialState)
      .addCase(registerUser.fulfilled, () => initialState);
  },
});

export const { setSelectedTripId, clearTripActionError, resetTripsState } = tripsSlice.actions;

export const selectTripsList = (state) => state.trips.items;
export const selectTripsLoading = (state) => state.trips.loading;
export const selectTripsError = (state) => state.trips.error;
export const selectTripsRefreshing = (state) => state.trips.refreshing;
export const selectTripDetailsLoading = (state) => state.trips.detailsLoading;
export const selectSelectedTripId = (state) => state.trips.selectedTripId;

export default tripsSlice.reducer;
