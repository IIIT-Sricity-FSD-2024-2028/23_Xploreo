import { createAsyncThunk } from '@reduxjs/toolkit';
import { getHotel, getHotelReviews, listHotels, listRooms } from '@/services/hotels.api.js';
import { getExperience, listMyExperiences } from '@/services/partners.api.js';
import { getPlanById, getPlanCapacity, getPlans } from '@/services/plans.api.js';
import { listReviews } from '@/services/reviews.api.js';
import { mapBackendExperience, mapBackendHotel, mapBackendPlan } from '@/utils/browseUtils.js';

export const fetchBrowseHotels = createAsyncThunk(
  'traveller/browse/fetchHotels',
  async (params, { rejectWithValue }) => {
    try {
      const raw = await listHotels(params);
      return Array.isArray(raw) ? raw.map(mapBackendHotel).filter(Boolean) : [];
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to load hotels. Please try again.');
    }
  },
);

export const fetchBrowseExperiences = createAsyncThunk(
  'traveller/browse/fetchExperiences',
  async (_, { rejectWithValue }) => {
    try {
      const raw = await listMyExperiences();
      return Array.isArray(raw) ? raw.map(mapBackendExperience).filter(Boolean) : [];
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to load experiences. Please try again.');
    }
  },
);

export const fetchBrowsePlans = createAsyncThunk(
  'traveller/browse/fetchPlans',
  async (params = { limit: 50 }, { rejectWithValue }) => {
    try {
      const res = await getPlans(params);
      const items = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      return items.map(mapBackendPlan).filter(Boolean);
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to load plans. Please try again.');
    }
  },
);

export const fetchBrowseItemDetail = createAsyncThunk(
  'traveller/browse/fetchItemDetail',
  async ({ type, id }, { rejectWithValue }) => {
    try {
      if (!id) {
        return rejectWithValue({ status: 400, message: 'Invalid item identifier provided.' });
      }

      const normalizedType = (type || 'hotel').toLowerCase();
      if (normalizedType === 'hotel') {
        const [rawHotel, roomsData, reviewsData] = await Promise.all([
          getHotel(id),
          listRooms(id).catch(() => []),
          getHotelReviews(id).catch(() => []),
        ]);
        if (!rawHotel) {
          return rejectWithValue({ status: 404, message: `The requested hotel (#${id}) could not be found.` });
        }
        const mapped = mapBackendHotel(rawHotel);
        const item = {
          ...rawHotel,
          ...mapped,
          images: Array.isArray(rawHotel.images) ? rawHotel.images : [],
        };
        return {
          key: `hotel:${id}`,
          item,
          rooms: Array.isArray(roomsData) ? roomsData : [],
          reviews: Array.isArray(reviewsData) ? reviewsData : [],
        };
      }

      if (normalizedType === 'experience') {
        const [rawExp, reviewsData] = await Promise.all([
          getExperience(id),
          listReviews({ experienceId: id }).catch(() => []),
        ]);
        if (!rawExp) {
          return rejectWithValue({ status: 404, message: `The requested experience (#${id}) could not be found.` });
        }
        const mapped = mapBackendExperience(rawExp);
        const item = {
          ...rawExp,
          ...mapped,
        };
        const filteredReviews = (Array.isArray(reviewsData) ? reviewsData : []).filter((r) => {
          const rType = r?.targetType ? String(r.targetType).toLowerCase() : null;
          const rTarget = r?.targetId ?? r?.experienceId ?? null;
          if (rType && rType !== 'experience') return false;
          if (rTarget != null && String(rTarget) !== String(id)) return false;
          return true;
        });
        return {
          key: `experience:${id}`,
          item,
          rooms: [],
          reviews: filteredReviews,
        };
      }

      // A package also loads its booking quote (GET /plans/:id/capacity): maximum guests across its
      // hotel and experience sessions, whether it is bookable, and the per-person amount recorded.
      // If the quote cannot be loaded, capacity is unknown and booking stays blocked.
      const [rawPlan, bookingQuote] = await Promise.all([
        getPlanById(id),
        getPlanCapacity(id).catch((err) => ({
          maxGuests: null,
          bookable: false,
          issues: [err?.message || 'Availability for this package could not be loaded.'],
          limits: [],
          pricePerPerson: null,
        })),
      ]);
      if (!rawPlan) {
        return rejectWithValue({ status: 404, message: `The requested package (#${id}) could not be found.` });
      }
      const mapped = mapBackendPlan(rawPlan);
      return {
        key: `package:${id}`,
        item: { ...rawPlan, ...mapped, bookingQuote, maxGuests: bookingQuote.maxGuests },
        rooms: [],
        reviews: [],
      };
    } catch (error) {
      return rejectWithValue({
        status: error?.status || error?.response?.status || 500,
        message: error?.message || `Failed to load ${type || 'item'} details.`,
      });
    }
  },
);
