import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createReview,
  deleteReview,
  getReviewById,
  listReviews,
  updateReview,
} from '@/services/reviews.api.js';

export const fetchReviews = createAsyncThunk(
  'traveller/reviews/fetchReviews',
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
  'traveller/reviews/submitReview',
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
  'traveller/reviews/fetchReviewById',
  async (id, { rejectWithValue }) => {
    try {
      return await getReviewById(id);
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to load review details.');
    }
  },
);

export const updateReviewItem = createAsyncThunk(
  'traveller/reviews/updateReviewItem',
  async ({ id, patch }, { rejectWithValue }) => {
    try {
      return await updateReview(id, patch);
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to update review.');
    }
  },
);

export const deleteReviewItem = createAsyncThunk(
  'traveller/reviews/deleteReviewItem',
  async (id, { rejectWithValue }) => {
    try {
      await deleteReview(id);
      return id;
    } catch (error) {
      return rejectWithValue(error?.message || 'Failed to delete review.');
    }
  },
);
