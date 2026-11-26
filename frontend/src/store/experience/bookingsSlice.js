import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError } from '@/services/ApiError.js';
import { listExperienceBookings, updateExperienceBookingStatus } from '@/services/partners.api.js';
import { selectSessionVersion, selectUser } from '../sessionSlice.js';
import { refreshExperienceCatalog } from './experiencesSlice.js';

const CACHE_AGE = 30_000;
const isExperiencePartner = (state) => selectUser(state).role === 'experience';
export const selectExperienceBookings = (state) => state.experience.bookings;
export const selectExperienceBooking = (state, id) => selectExperienceBookings(state).data?.find((booking) => booking.id === id);
export const selectExperienceEarningsRevision = (state) => selectExperienceBookings(state).earningsRevision;

export const fetchExperienceBookings = createAsyncThunk('experience/bookings/fetch', async (_, { rejectWithValue }) => {
  try {
    return { data: await listExperienceBookings(), fetchedAt: Date.now() };
  } catch (error) {
    return rejectWithValue({ status: error.status ?? null, message: error.message });
  }
}, {
  condition({ force = false } = {}, { getState }) {
    const state = getState();
    const { requestId, fetchedAt, error } = selectExperienceBookings(state);
    return isExperiencePartner(state) && !requestId && (force || error || fetchedAt === null || Date.now() - fetchedAt >= CACHE_AGE);
  },
});

const bookingsSlice = createSlice({
  name: 'experience/bookings',
  initialState: { data: null, error: null, fetchedAt: null, requestId: null, saving: {}, earningsRevision: 0 },
  reducers: {
    update(state, { payload }) {
      const index = state.data?.findIndex((booking) => booking.id === payload.id) ?? -1;
      if (index >= 0) state.data[index] = { ...state.data[index], ...payload };
      // An earlier GET may still contain the previous status.
      if (state.requestId) {
        state.requestId = null;
        state.fetchedAt = null;
      }
      // The server re-synchronizes slot occupancy, which also feeds earnings utilization.
      state.earningsRevision += 1;
    },
    saveStarted(state, { payload }) {
      state.saving[payload] = true;
    },
    saveFinished(state, { payload }) {
      delete state.saving[payload];
    },
  },
  extraReducers: (builder) => builder
    .addCase(fetchExperienceBookings.pending, (state, { meta }) => {
      Object.assign(state, { requestId: meta.requestId, error: null });
    })
    .addCase(fetchExperienceBookings.fulfilled, (state, { meta, payload }) => {
      if (state.requestId === meta.requestId) {
        Object.assign(state, { ...payload, requestId: null, error: null });
      }
    })
    .addCase(fetchExperienceBookings.rejected, (state, { meta, payload, error }) => {
      if (state.requestId === meta.requestId) {
        Object.assign(state, { requestId: null, error: payload ?? error });
      }
    }),
});

const actions = bookingsSlice.actions;

function changeBookingStatus(id, status) {
  return async (dispatch, getState) => {
    const state = getState();
    if (!isExperiencePartner(state)) throw new ApiError(403);
    if (Object.hasOwn(selectExperienceBookings(state).saving, id)) {
      throw new ApiError(409, 'Wait for this booking update to finish.');
    }

    const version = selectSessionVersion(state);
    const isSameSession = () => selectSessionVersion(getState()) === version;
    dispatch(actions.saveStarted(id));
    try {
      const updated = await updateExperienceBookingStatus(id, status);
      if (!isSameSession()) throw new ApiError(401);

      const { data, requestId } = selectExperienceBookings(getState());
      dispatch(actions.update(updated));
      if (requestId || data === null) dispatch(fetchExperienceBookings());
      dispatch(refreshExperienceCatalog());
      return updated;
    } finally {
      if (isSameSession()) dispatch(actions.saveFinished(id));
    }
  };
}

export const checkInExperienceBooking = (id) => changeBookingStatus(id, 'CHECKED_IN');
export const requestExperienceBookingEnd = (id) => changeBookingStatus(id, 'END_REQUESTED');

export default bookingsSlice.reducer;
