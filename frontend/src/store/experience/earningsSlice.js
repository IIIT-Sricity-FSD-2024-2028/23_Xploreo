import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getExperienceEarnings } from '@/services/schedule.api.js';
import { selectUser } from '../sessionSlice.js';

const isExperiencePartner = (state) => selectUser(state).role === 'experience';

/**
 * Fetches the live earnings statement from the backend for a given time window (days: 7, 30, 90, or 'all').
 * The statement is computed server-side directly from verified bookings.
 */
export const fetchExperienceEarnings = createAsyncThunk(
  'experience/earnings/fetch',
  async ({ days = '30' } = {}, { rejectWithValue }) => {
    try {
      const data = await getExperienceEarnings({ days });
      return { days: String(days), data, fetchedAt: Date.now() };
    } catch (error) {
      return rejectWithValue({
        status: error?.status ?? null,
        message: error?.message || 'Failed to load earnings statement',
      });
    }
  },
  {
    condition(_, { getState }) {
      return isExperiencePartner(getState());
    },
  }
);

const earningsSlice = createSlice({
  name: 'experience/earnings',
  initialState: {
    byDays: {},
    loading: false,
    error: null,
  },
  reducers: {
    clearEarnings(state) {
      state.byDays = {};
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExperienceEarnings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExperienceEarnings.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.byDays[payload.days] = payload.data;
        state.error = null;
      })
      .addCase(fetchExperienceEarnings.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload ?? error;
      });
  },
});

export const { clearEarnings } = earningsSlice.actions;

export const selectExperienceEarningsState = (state) => state.experience.earnings;
export const selectEarningsForDays = (days) => (state) =>
  state.experience.earnings?.byDays?.[String(days)] ?? null;

export default earningsSlice.reducer;
