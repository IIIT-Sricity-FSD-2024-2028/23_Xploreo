// Traveller-side guide selection for a booked trip. Built on apiRequest like the other traveller pages.
//   GET    /trips/:id/available-guides   NTA-approved guides still free on the trip's dates
//   POST   /trips/:id/guide-request      { guideId }
//   DELETE /trips/:id/guide-request      withdraw a pending request
import { apiRequest } from './api.js';

const enc = encodeURIComponent;

export async function listAvailableGuides(tripId) {
  const res = await apiRequest(`/trips/${enc(tripId)}/available-guides`);
  return Array.isArray(res) ? res : [];
}

export function requestGuide(tripId, guideId) {
  return apiRequest(`/trips/${enc(tripId)}/guide-request`, {
    method: 'POST',
    body: JSON.stringify({ guideId }),
  });
}

export function cancelGuideRequest(tripId) {
  return apiRequest(`/trips/${enc(tripId)}/guide-request`, { method: 'DELETE' });
}

// ── Experience bookings: optional guide for the session ──
//   GET    /experience-guides/:bookingId/available
//   POST   /experience-guides/:bookingId/request   { guideId }
//   DELETE /experience-guides/:bookingId/request
export async function listExperienceGuides(bookingId) {
  const res = await apiRequest(`/experience-guides/${enc(bookingId)}/available`);
  return Array.isArray(res) ? res : [];
}

export function requestExperienceGuide(bookingId, guideId) {
  return apiRequest(`/experience-guides/${enc(bookingId)}/request`, {
    method: 'POST',
    body: JSON.stringify({ guideId }),
  });
}

export function cancelExperienceGuide(bookingId) {
  return apiRequest(`/experience-guides/${enc(bookingId)}/request`, { method: 'DELETE' });
}

// ── Trip cancellation & refund retry ──
export function cancelTrip(tripId, data = {}) {
  return apiRequest(`/trips/${enc(tripId)}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function retryTripRefund(tripId) {
  return apiRequest(`/trips/${enc(tripId)}/refund/retry`, { method: 'PATCH' });
}
