import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { listHotelBookings } from '../services/hotels.api.js';
import { listExperienceBookings } from '../services/partners.api.js';
import { listReviews } from '../services/reviews.api.js';
import { getTravellerTrips } from '../services/tripGuides.api.js';
import { logoutSession, logoutUser, loginUser, registerUser, setAuthUser } from './authSlice.js';

export function calculateBookingStats(list = []) {
  const safeList = Array.isArray(list) ? list : [];
  const total = safeList.length;
  const confirmed = safeList.filter((b) => (b.status || '').toUpperCase() === 'CONFIRMED').length;
  const cancelled = safeList.filter((b) => (b.status || '').toUpperCase() === 'CANCELLED').length;
  const confirmedSpend = safeList.reduce((sum, b) => {
    if ((b.status || '').toUpperCase() === 'CONFIRMED') {
      return sum + (Number(b.totalAmount) || 0);
    }
    return sum;
  }, 0);

  return { total, count: total, confirmed, cancelled, confirmedSpend };
}

function createMatchesIdentifier(userIdentifiers = []) {
  const idSet = new Set((userIdentifiers || []).map((id) => String(id).trim().toLowerCase()).filter(Boolean));
  return (targetId) => {
    if (targetId == null) return false;
    const str = String(targetId).trim().toLowerCase();
    if (idSet.has(str)) return true;
    const numeric = str.replace(/\D/g, '');
    return Boolean(numeric && idSet.has(numeric));
  };
}

export const fetchDashboardSummary = createAsyncThunk(
  'dashboard/fetchDashboardSummary',
  async ({ userIdentifiers = [], candidateTripIds = [], currentTravellerId = '' } = {}) => {
    const isUserMatch = createMatchesIdentifier(userIdentifiers);

    // 1. Bookings summary (experience + hotel bookings)
    let bookingStats;
    try {
      let expList = [];
      let expError = null;
      try {
        const expData = await listExperienceBookings();
        expList = Array.isArray(expData) ? expData : expData?.data || [];
      } catch (err) {
        expError = err;
      }

      let hotelList = [];
      let hotelError = null;
      try {
        const hotelData = await listHotelBookings();
        hotelList = (Array.isArray(hotelData) ? hotelData : hotelData?.data || []).map((b) => ({
          ...b,
          bookingType: 'hotel',
        }));
      } catch (err) {
        hotelError = err;
      }

      if (expError && hotelError && expList.length === 0 && hotelList.length === 0) {
        throw new Error('Failed to load bookings from all sources');
      }

      const combinedBookings = [...expList, ...hotelList];
      const userBookings = combinedBookings.filter((b) => {
        if (!b.travellerId) return true;
        if (isUserMatch(b.travellerId)) return true;
        if (b.travellerId === currentTravellerId) return true;
        return false;
      });

      bookingStats = {
        loading: false,
        error: false,
        ...calculateBookingStats(userBookings),
      };
    } catch {
      bookingStats = {
        loading: false,
        error: true,
        total: null,
        count: null,
        confirmed: null,
        cancelled: null,
        confirmedSpend: null,
      };
    }

    // 2. Trips summary across candidate traveller identifiers
    let tripStats;
    try {
      const uniqueCandidates = [...new Set((candidateTripIds || []).filter(Boolean))];
      let tripsList = [];
      let fetchedSuccessfully = false;

      for (const candId of uniqueCandidates) {
        try {
          const mapped = await getTravellerTrips(candId);
          fetchedSuccessfully = true;
          if (mapped.length > 0) {
            tripsList = mapped;
            break;
          }
        } catch {
          // Continue trying remaining candidate identifiers
        }
      }

      tripStats = fetchedSuccessfully
        ? { loading: false, error: false, count: tripsList.length }
        : { loading: false, error: true, count: null };
    } catch {
      tripStats = { loading: false, error: true, count: null };
    }

    // 3. Reviews summary
    let reviewStats;
    try {
      const revList = await listReviews();
      const safeReviews = Array.isArray(revList) ? revList : revList?.data || [];
      const userReviews = safeReviews.filter((r) => isUserMatch(r.userId) || isUserMatch(r.travellerId));
      reviewStats = { loading: false, error: false, count: userReviews.length };
    } catch {
      reviewStats = { loading: false, error: true, count: null };
    }

    return {
      bookingStats,
      tripStats,
      reviewStats,
      travellerId: currentTravellerId || null,
    };
  },
);

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
  name: 'dashboard',
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
      .addCase(setAuthUser, () => initialState)
      .addCase(loginUser.fulfilled, () => initialState)
      .addCase(registerUser.fulfilled, () => initialState);
  },
});

export const { resetDashboardState } = dashboardSlice.actions;

export const selectBookingStats = (state) => state.dashboard.bookingStats;
export const selectTripStats = (state) => state.dashboard.tripStats;
export const selectReviewStats = (state) => state.dashboard.reviewStats;
export const selectDashboardLoading = (state) => state.dashboard.loading;

export default dashboardSlice.reducer;
