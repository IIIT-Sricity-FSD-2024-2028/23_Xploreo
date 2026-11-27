import { createSlice } from '@reduxjs/toolkit';
import { fetchNtaTripActivity } from './dashboardThunks.js';

// Dashboard data that no other NTA slice already holds: the region's trip activity.
// Package KPIs and the pricing chart are derived from state.nta.plans by selectors.
const initialState = {
  tripCount: 0, // every region trip from GET /trips (the "Recent Bookings" KPI)
  recentBookings: [], // table rows, already mapped by nta.api.js (max 15)
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
        state.tripCount = payload.tripCount;
        state.recentBookings = payload.recentBookings;
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
