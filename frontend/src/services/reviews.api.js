// Domain service for reviews (owned by M5, consumed by M3 and Guide portals).
// Built on the shared request(). All request() calls go through domain services.
import { request } from '@/foundation';

const enc = encodeURIComponent;
const listOf = (response) => (Array.isArray(response) ? response : response?.items ?? response?.data ?? []);

// GET /reviews — list reviews, optionally filtered by params (e.g. ?hotelId=, ?targetType=)
export async function listReviews(params) {
  return listOf(await request('/reviews', { params }));
}

// GET /reviews/:id
export function getReview(id) {
  return request(`/reviews/${enc(id)}`);
}

// POST /reviews (for traveller submitting reviews)
export function createReview(values) {
  return request('/reviews', { method: 'POST', body: values });
}

// GET /reviews/:id
export function getReviewById(id) {
  return request(`/reviews/${encodeURIComponent(id)}`);
}

// PATCH /reviews/:id
export function updateReview(id, values) {
  return request(`/reviews/${encodeURIComponent(id)}`, { method: 'PATCH', body: values });
}

// DELETE /reviews/:id
export function deleteReview(id) {
  return request(`/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
