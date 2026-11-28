import { createSlice } from '@reduxjs/toolkit';
import { loginUser, logoutSession, logoutUser, registerUser, restoreAuthSession, setAuthUser } from '@/features/authSlice.js';
import {
  deleteReviewItem,
  fetchReviewById,
  fetchReviews,
  submitReview,
  updateReviewItem,
} from './reviewsThunks.js';

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
  name: 'traveller/reviews',
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

export default reviewsSlice.reducer;
