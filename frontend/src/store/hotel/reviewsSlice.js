import { listPartnerReviews } from '@/services/hotels.api.js';
import { createReadThunk, createRepositorySlice } from './resource.js';

export const fetchPartnerReviews = createReadThunk('reviews', () => listPartnerReviews());
export const reviewsSlice = createRepositorySlice('reviews', fetchPartnerReviews);
