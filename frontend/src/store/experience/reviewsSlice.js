import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { listReviews } from '@/services/schedule.api.js';
import { selectUser } from '../sessionSlice.js';

const isExperiencePartner = (state) => selectUser(state).role === 'experience';

export const fetchExperienceReviews = createAsyncThunk(
  'experience/reviews/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const data = await listReviews();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue({
        status: error?.status ?? null,
        message: error?.message || 'Failed to load reviews',
      });
    }
  },
  {
    condition(_, { getState }) {
      return isExperiencePartner(getState());
    },
  }
);

const reviewsSlice = createSlice({
  name: 'experience/reviews',
  initialState: {
    data: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearReviews(state) {
      state.data = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExperienceReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExperienceReviews.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.data = payload;
        state.error = null;
      })
      .addCase(fetchExperienceReviews.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload ?? error;
      });
  },
});

export const { clearReviews } = reviewsSlice.actions;

export const selectExperienceReviewsState = (state) => state.experience.reviews;
export const selectExperienceReviewsData = (state) => state.experience.reviews?.data ?? [];

export const selectExperienceReviewStats = createSelector(
  [selectExperienceReviewsData],
  (reviews) => {
    const list = reviews || [];
    const count = list.length;
    const rating = count > 0
      ? (list.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / count).toFixed(1)
      : '—';
    const recent = [...list]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 6);

    return {
      totalCount: count,
      rating,
      recentReviews: recent,
    };
  }
);

export default reviewsSlice.reducer;
