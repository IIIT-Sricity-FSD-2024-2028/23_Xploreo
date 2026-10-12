// Domain service: experience partners (catalog, bookings, profile). Built on the shared request().
// Only send fields the backend DTO allows: extra fields are rejected with a 400.
import { request } from '@/foundation';

// CreateExperienceDto / UpdateExperienceDto. Deliberately NOT sent from the UI:
// id, partnerId (the server uses the signed-in partner), booked, availability, nextSlot (server-derived).
const EXPERIENCE_FIELDS = ['title', 'description', 'destination', 'category', 'price', 'durationHours', 'capacity', 'image', 'status'];
const PROFILE_FIELDS = ['name', 'email', 'phone', 'businessName'];

function pick(source, fields) {
  return Object.fromEntries(fields.filter((f) => source[f] !== undefined).map((f) => [f, source[f]]));
}

export function listMyExperiences() {
  return request('/experiences');
}

export function createExperience(values) {
  return request('/experiences', { method: 'POST', body: pick(values, EXPERIENCE_FIELDS) });
}

export function updateExperience(id, values) {
  return request(`/experiences/${encodeURIComponent(id)}`, { method: 'PATCH', body: pick(values, EXPERIENCE_FIELDS) });
}

export function deleteExperience(id) {
  return request(`/experiences/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function listExperienceBookings() {
  return request('/experience-bookings');
}

// status: CHECKED_IN | END_REQUESTED | CANCELLED (a partner may not set COMPLETED: the traveller does)
export function updateExperienceBookingStatus(id, status) {
  return request(`/experience-bookings/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } });
}

// GET /auth/users/:id is admin-only on the real API, so profile data comes from the session
// (useAuth().user); this only saves edits.
export function updatePartnerProfile(userId, values) {
  return request(`/auth/users/${encodeURIComponent(userId)}`, { method: 'PATCH', body: pick(values, PROFILE_FIELDS) });
}
