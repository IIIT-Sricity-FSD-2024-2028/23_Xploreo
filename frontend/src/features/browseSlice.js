import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getHotel, getHotelReviews, listHotels, listRooms } from '../services/hotels.api.js';
import { getExperience, listMyExperiences } from '../services/partners.api.js';
import { getPlanById, getPlans } from '../services/plans.api.js';
import { listReviews } from '../services/reviews.api.js';
import {
  BROWSE_CATEGORIES,
  SORT_OPTIONS,
  mapBackendExperience,
  mapBackendHotel,
  mapBackendPlan,
} from '../utils/browseUtils.js';
import { loginUser, logoutSession, logoutUser, registerUser, setAuthUser } from './authSlice.js';

export const fetchBrowseHotels = createAsyncThunk(
  'browse/fetchHotels',
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
  'browse/fetchExperiences',
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
  'browse/fetchPlans',
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
  'browse/fetchItemDetail',
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
        return {
          key: `experience:${id}`,
          item,
          rooms: [],
          reviews: Array.isArray(reviewsData) ? reviewsData : [],
        };
      }

      const rawPlan = await getPlanById(id);
      if (!rawPlan) {
        return rejectWithValue({ status: 404, message: `The requested package (#${id}) could not be found.` });
      }
      const mapped = mapBackendPlan(rawPlan);
      return {
        key: `package:${id}`,
        item: { ...rawPlan, ...mapped },
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

const initialFilters = {
  searchQuery: '',
  locationQuery: '',
  checkInDate: '',
  checkOutDate: '',
  guestCount: '2',
  roomCount: '1',
  minStars: 0,
  expCategory: 'all',
  maxPrice: '',
  selectedAmenities: [],
  sortBy: SORT_OPTIONS.DEFAULT,
  viewMode: 'grid',
};

const initialDetail = {
  key: null,
  item: null,
  rooms: [],
  reviews: [],
  loading: false,
  error: null,
  currentRequestId: null,
};

const initialState = {
  activeCategory: BROWSE_CATEGORIES.HOTELS,
  filters: initialFilters,
  hotels: { items: [], loading: false, error: null, loaded: false },
  experiences: { items: [], loading: false, error: null, loaded: false },
  plans: { items: [], loading: false, error: null, loaded: false },
  detail: initialDetail,
};

const browseSlice = createSlice({
  name: 'browse',
  initialState,
  reducers: {
    setBrowseCategory(state, action) {
      state.activeCategory = action.payload;
    },
    setBrowseFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    toggleBrowseAmenity(state, action) {
      const amenity = action.payload;
      const exists = state.filters.selectedAmenities.includes(amenity);
      state.filters.selectedAmenities = exists
        ? state.filters.selectedAmenities.filter((a) => a !== amenity)
        : [...state.filters.selectedAmenities, amenity];
    },
    resetBrowseFilters(state) {
      state.filters = { ...initialFilters, viewMode: state.filters.viewMode };
    },
    setSelectedItemPreview(state, action) {
      state.detail.key = action.payload.key;
      state.detail.item = action.payload.item;
      state.detail.error = null;
    },
    clearBrowseDetail(state) {
      state.detail = initialDetail;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrowseHotels.pending, (state) => {
        state.hotels.loading = true;
        state.hotels.error = null;
      })
      .addCase(fetchBrowseHotels.fulfilled, (state, action) => {
        state.hotels.loading = false;
        state.hotels.items = action.payload;
        state.hotels.loaded = true;
        state.hotels.error = null;
      })
      .addCase(fetchBrowseHotels.rejected, (state, action) => {
        state.hotels.loading = false;
        state.hotels.items = [];
        state.hotels.error = action.payload || action.error.message || 'Failed to load hotels.';
      })
      .addCase(fetchBrowseExperiences.pending, (state) => {
        state.experiences.loading = true;
        state.experiences.error = null;
      })
      .addCase(fetchBrowseExperiences.fulfilled, (state, action) => {
        state.experiences.loading = false;
        state.experiences.items = action.payload;
        state.experiences.loaded = true;
        state.experiences.error = null;
      })
      .addCase(fetchBrowseExperiences.rejected, (state, action) => {
        state.experiences.loading = false;
        state.experiences.items = [];
        state.experiences.error = action.payload || action.error.message || 'Failed to load experiences.';
      })
      .addCase(fetchBrowsePlans.pending, (state) => {
        state.plans.loading = true;
        state.plans.error = null;
      })
      .addCase(fetchBrowsePlans.fulfilled, (state, action) => {
        state.plans.loading = false;
        state.plans.items = action.payload;
        state.plans.loaded = true;
        state.plans.error = null;
      })
      .addCase(fetchBrowsePlans.rejected, (state, action) => {
        state.plans.loading = false;
        state.plans.items = [];
        state.plans.error = action.payload || action.error.message || 'Failed to load plans.';
      })
      .addCase(fetchBrowseItemDetail.pending, (state, action) => {
        const nextKey = `${(action.meta.arg?.type || 'hotel').toLowerCase()}:${action.meta.arg?.id}`;
        state.detail.loading = true;
        state.detail.error = null;
        state.detail.currentRequestId = action.meta.requestId;
        if (state.detail.key !== nextKey) {
          state.detail.key = nextKey;
          state.detail.item = null;
          state.detail.rooms = [];
          state.detail.reviews = [];
        }
      })
      .addCase(fetchBrowseItemDetail.fulfilled, (state, action) => {
        if (state.detail.currentRequestId !== action.meta.requestId) return;
        state.detail.loading = false;
        state.detail.error = null;
        state.detail.key = action.payload.key;
        state.detail.item = action.payload.item;
        state.detail.rooms = action.payload.rooms;
        state.detail.reviews = action.payload.reviews;
        state.detail.currentRequestId = null;
      })
      .addCase(fetchBrowseItemDetail.rejected, (state, action) => {
        if (state.detail.currentRequestId !== action.meta.requestId) return;
        state.detail.loading = false;
        state.detail.currentRequestId = null;
        if (!state.detail.item) {
          state.detail.error = action.payload || { status: 500, message: action.error.message };
        }
      })
      .addCase(logoutUser, () => initialState)
      .addCase(logoutSession.fulfilled, () => initialState)
      .addCase(setAuthUser, () => initialState)
      .addCase(loginUser.fulfilled, () => initialState)
      .addCase(registerUser.fulfilled, () => initialState);
  },
});

export const {
  setBrowseCategory,
  setBrowseFilters,
  toggleBrowseAmenity,
  resetBrowseFilters,
  setSelectedItemPreview,
  clearBrowseDetail,
} = browseSlice.actions;

export const selectBrowseActiveCategory = (state) => state.browse.activeCategory;
export const selectBrowseFilters = (state) => state.browse.filters;
export const selectBrowseHotels = (state) => state.browse.hotels;
export const selectBrowseExperiences = (state) => state.browse.experiences;
export const selectBrowsePlans = (state) => state.browse.plans;
export const selectBrowseDetail = (state) => state.browse.detail;

export default browseSlice.reducer;
