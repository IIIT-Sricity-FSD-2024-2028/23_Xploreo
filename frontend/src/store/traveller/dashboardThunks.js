import { createAsyncThunk } from '@reduxjs/toolkit';
import { listHotelBookings } from '@/services/hotels.api.js';
import { listExperienceBookings } from '@/services/partners.api.js';
import { listReviews } from '@/services/reviews.api.js';
import { getTravellerTrips } from '@/services/tripGuides.api.js';

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
  'traveller/dashboard/fetchDashboardSummary',
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
