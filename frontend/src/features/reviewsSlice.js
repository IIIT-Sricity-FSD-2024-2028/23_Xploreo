import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  createReview,
  deleteReview,
  getReviewById,
  listReviews,
  updateReview,
} from '../services/reviews.api.js';
import { loginUser, logoutSession, logoutUser, registerUser, restoreAuthSession, setAuthUser } from './authSlice.js';

const EMPTY_LIST = [];

export const fetchReviews = createAsyncThunk(
  'reviews/fetchReviews',
  async (params, { rejectWithValue }) => {
    try {
      const data = await listReviews(params);
      return Array.isArray(data) ? data : data?.data || [];
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to load reviews from server.');
    }
  },
);

export const submitReview = createAsyncThunk(
  'reviews/submitReview',
  async (payload, { rejectWithValue }) => {
    try {
      const result = await createReview(payload);
      return result || payload;
    } catch (error) {
      return rejectWithValue({
        status: error?.status || error?.response?.status || 500,
        message: error?.message || 'Failed to submit review. Please try again.',
        errors: error?.errors && typeof error.errors === 'object' ? error.errors : null,
      });
    }
  },
);

export const fetchReviewById = createAsyncThunk(
  'reviews/fetchReviewById',
  async (id, { rejectWithValue }) => {
    try {
      return await getReviewById(id);
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to load review details.');
    }
  },
);

export const updateReviewItem = createAsyncThunk(
  'reviews/updateReviewItem',
  async ({ id, patch }, { rejectWithValue }) => {
    try {
      return await updateReview(id, patch);
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to update review.');
    }
  },
);

export const deleteReviewItem = createAsyncThunk(
  'reviews/deleteReviewItem',
  async (id, { rejectWithValue }) => {
    try {
      await deleteReview(id);
      return id;
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to delete review.');
    }
  },
);

const initialState = {
  items: [],
  hasLoaded: false,
  loading: false,
  error: null,
  submitting: false,
  submitError: null,
  lastSubmitted: null,
  actionLoading: false,
  actionError: null,
  selectedReview: null,
  selectedLoading: false,
};

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    addDemoReview(state, action) {
      const demo = action.payload;
      if (demo) {
        state.items = [demo, ...state.items];
        state.lastSubmitted = demo;
        state.submitError = null;
      }
    },
    clearReviewError(state) {
      state.error = null;
      state.actionError = null;
    },
    clearReviewSubmitState(state) {
      state.submitting = false;
      state.submitError = null;
      state.lastSubmitted = null;
    },
    resetReviewsState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.hasLoaded = true;
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || 'Failed to load reviews from server.';
        state.items = [];
      })
      .addCase(submitReview.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(submitReview.fulfilled, (state, action) => {
        state.submitting = false;
        state.submitError = null;
        state.lastSubmitted = action.payload || null;
        if (action.payload && typeof action.payload === 'object') {
          const id = action.payload.id;
          if (!id || !state.items.some((r) => r.id === id)) {
            state.items = [action.payload, ...state.items];
          }
        }
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.submitting = false;
        state.submitError =
          (typeof action.payload === 'string' ? action.payload : action.payload?.message) ||
          action.error?.message ||
          'Failed to submit review. Please try again.';
      })
      .addCase(fetchReviewById.pending, (state) => {
        state.selectedLoading = true;
      })
      .addCase(fetchReviewById.fulfilled, (state, action) => {
        state.selectedLoading = false;
        state.selectedReview = action.payload || null;
      })
      .addCase(fetchReviewById.rejected, (state, action) => {
        state.selectedLoading = false;
        state.error = action.payload || action.error?.message || 'Failed to load review details.';
      })
      .addCase(updateReviewItem.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(updateReviewItem.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.actionError = null;
        const updated = action.payload;
        if (updated?.id) {
          state.items = state.items.map((r) => (r.id === updated.id ? { ...r, ...updated } : r));
          if (state.selectedReview?.id === updated.id) {
            state.selectedReview = { ...state.selectedReview, ...updated };
          }
        }
      })
      .addCase(updateReviewItem.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || action.error?.message || 'Failed to update review.';
      })
      .addCase(deleteReviewItem.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(deleteReviewItem.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.actionError = null;
        const deletedId = action.payload;
        state.items = state.items.filter((r) => r.id !== deletedId);
        if (state.selectedReview?.id === deletedId) {
          state.selectedReview = null;
        }
      })
      .addCase(deleteReviewItem.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || action.error?.message || 'Failed to delete review.';
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
  addDemoReview,
  clearReviewError,
  clearReviewSubmitState,
  resetReviewsState,
} = reviewsSlice.actions;

export const selectReviewsList = (state) => state.reviews?.items || EMPTY_LIST;
export const selectReviewsHasLoaded = (state) => Boolean(state.reviews?.hasLoaded);
export const selectReviewsLoading = (state) => Boolean(state.reviews?.loading);
export const selectReviewsError = (state) => state.reviews?.error || null;
export const selectReviewSubmitting = (state) => Boolean(state.reviews?.submitting);
export const selectReviewSubmitError = (state) => state.reviews?.submitError || null;
export const selectLastSubmittedReview = (state) => state.reviews?.lastSubmitted || null;
export const selectReviewActionLoading = (state) => Boolean(state.reviews?.actionLoading);
export const selectReviewActionError = (state) => state.reviews?.actionError || null;
export const selectSelectedReview = (state) => state.reviews?.selectedReview || null;
export const selectSelectedReviewLoading = (state) => Boolean(state.reviews?.selectedLoading);

export default reviewsSlice.reducer;
