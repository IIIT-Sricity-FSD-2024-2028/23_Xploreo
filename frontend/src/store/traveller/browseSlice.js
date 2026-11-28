import { createSlice } from '@reduxjs/toolkit';
import { loginUser, logoutSession, logoutUser, registerUser, restoreAuthSession, setAuthUser } from '@/features/authSlice.js';
import { BROWSE_CATEGORIES, SORT_OPTIONS } from '@/utils/browseUtils.js';
import {
  fetchBrowseExperiences,
  fetchBrowseHotels,
  fetchBrowseItemDetail,
  fetchBrowsePlans,
} from './browseThunks.js';

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
  name: 'traveller/browse',
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
      const nextKey = action.payload.key;
      if (state.detail.key !== nextKey) {
        state.detail.rooms = [];
        state.detail.reviews = [];
      }
      state.detail.key = nextKey;
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
      .addCase(restoreAuthSession.rejected, () => initialState)
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

export default browseSlice.reducer;
