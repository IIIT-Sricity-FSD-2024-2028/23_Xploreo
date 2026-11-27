import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  cancelGuideRequest,
  cancelTrip,
  createTrip,
  getTravellerTrips,
  getTripById,
  listAvailableGuides,
  requestGuide,
  retryTripRefund,
  updateTrip,
} from '@/services/tripGuides.api.js';
import { mapBackendTrip } from '@/utils/tripTrackingUtils.js';

export const fetchTravellerTrips = createAsyncThunk(
  'traveller/trips/fetchTravellerTrips',
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
  'traveller/trips/pollTravellerTrips',
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
  'traveller/trips/fetchTripDetail',
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
  'traveller/trips/cancelTravellerTrip',
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
  'traveller/trips/retryTravellerTripRefund',
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
  'traveller/trips/requestGuideForTrip',
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
  'traveller/trips/cancelGuideForTrip',
  async (tripId, { rejectWithValue }) => {
    try {
      const updated = await cancelGuideRequest(tripId);
      return { tripId, updated: updated ? mapBackendTrip(updated) : null };
    } catch (error) {
      return rejectWithValue(error?.message || 'Could not cancel the request.');
    }
  },
);

export const createTravellerTrip = createAsyncThunk(
  'traveller/trips/createTravellerTrip',
  async (payload, { rejectWithValue }) => {
    try {
      const created = await createTrip(payload);
      return created ? mapBackendTrip(created) : null;
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to create trip.');
    }
  },
);

export const updateTravellerTrip = createAsyncThunk(
  'traveller/trips/updateTravellerTrip',
  async ({ tripId, patch }, { rejectWithValue }) => {
    try {
      const updated = await updateTrip(tripId, patch);
      return updated ? mapBackendTrip(updated) : null;
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to update trip.');
    }
  },
);

export const fetchTripAvailableGuides = createAsyncThunk(
  'traveller/trips/fetchTripAvailableGuides',
  async (tripId, { rejectWithValue }) => {
    try {
      const guides = await listAvailableGuides(tripId);
      return { tripId, guides: Array.isArray(guides) ? guides : [] };
    } catch (error) {
      return rejectWithValue({
        tripId,
        message: error?.message || 'Could not load guides.',
      });
    }
  },
);
