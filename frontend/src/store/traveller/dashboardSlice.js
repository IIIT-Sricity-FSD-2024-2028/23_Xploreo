import { createSlice } from '@reduxjs/toolkit';
import { loginUser, logoutSession, logoutUser, registerUser, restoreAuthSession, setAuthUser } from '@/features/authSlice.js';
import { fetchDashboardSummary } from './dashboardThunks.js';

const initialState = {
  bookingStats: {
    loading: false,
    error: false,
    total: 0,
    count: 0,
    confirmed: 0,
    cancelled: 0,
    confirmedSpend: 0,
  },
  tripStats: {
    loading: false,
    error: false,
    count: 0,
  },
  reviewStats: {
    loading: false,
    error: false,
    count: 0,
  },
  loading: false,
  error: null,
  loaded: false,
  lastTravellerId: null,
};

const dashboardSlice = createSlice({
  name: 'traveller/dashboard',
  initialState,
  reducers: {
    resetDashboardState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.bookingStats = { ...state.bookingStats, loading: true, error: false };
        state.tripStats = { ...state.tripStats, loading: true, error: false };
        state.reviewStats = { ...state.reviewStats, loading: true, error: false };
      })
      .addCase(fetchDashboardSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.error = null;
        state.bookingStats = action.payload.bookingStats;
        state.tripStats = action.payload.tripStats;
        state.reviewStats = action.payload.reviewStats;
        state.lastTravellerId = action.payload.travellerId;
      })
      .addCase(fetchDashboardSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || 'Failed to load dashboard statistics.';
        state.bookingStats = { ...state.bookingStats, loading: false, error: true };
        state.tripStats = { ...state.tripStats, loading: false, error: true };
        state.reviewStats = { ...state.reviewStats, loading: false, error: true };
      })
      .addCase(logoutUser, () => initialState)
      .addCase(logoutSession.fulfilled, () => initialState)
      .addCase(restoreAuthSession.rejected, () => initialState)
      .addCase(setAuthUser, () => initialState)
      .addCase(loginUser.fulfilled, () => initialState)
      .addCase(registerUser.fulfilled, () => initialState);
  },
});

export const { resetDashboardState } = dashboardSlice.actions;

export default dashboardSlice.reducer;
