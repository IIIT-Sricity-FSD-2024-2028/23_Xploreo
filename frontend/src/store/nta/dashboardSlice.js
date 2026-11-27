import { createSlice } from '@reduxjs/toolkit';
import { fetchNtaTripActivity } from './dashboardThunks.js';

// Dashboard data that no other NTA slice already holds: the region's package bookings.
// The booking KPI, recent-bookings table and booking details are derived by selectors; package
// KPIs and the pricing chart come from state.nta.plans.
const initialState = {
  bookings: [], // every region trip from GET /trips, as nta.api.js#toBookingRecord maps it
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null, // { status, message } from the last failed load
  requestId: null,
};

const dashboardSlice = createSlice({
  name: 'nta/dashboard',
  initialState,
  reducers: {
    clearDashboardError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNtaTripActivity.pending, (state, { meta }) => {
        state.status = 'loading';
        state.error = null;
        state.requestId = meta.requestId;
      })
      .addCase(fetchNtaTripActivity.fulfilled, (state, { payload, meta }) => {
        // Ignore a response that arrives after logout (the root reducer reset this slice) or
        // after a newer request was started.
        if (state.requestId !== meta.requestId) return;
        state.bookings = payload.bookings;
        state.status = 'succeeded';
        state.requestId = null;
      })
      .addCase(fetchNtaTripActivity.rejected, (state, { payload, error, meta }) => {
        if (state.requestId !== meta.requestId) return;
        state.status = 'failed';
        state.error = payload ?? { status: null, message: error.message };
        state.requestId = null;
      });
  },
});

export const { clearDashboardError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
