// Domain service: slots, earnings and reviews. Built on the shared request().
import { request } from '@/foundation';

// ExperienceSlotDto. `booked` is required by the DTO, but the server recomputes it from real bookings.
const SLOT_FIELDS = ['id', 'date', 'time', 'booked', 'capacity', 'available'];

function pick(source, fields) {
  return Object.fromEntries(fields.filter((f) => source[f] !== undefined).map((f) => [f, source[f]]));
}

// Slots live inside the experience, so saving them is a PATCH of the experience's `slots` array.
export function saveExperienceSlots(experienceId, slots) {
  return request(`/experiences/${encodeURIComponent(experienceId)}`, {
    method: 'PATCH',
    body: { slots: slots.map((slot) => pick(slot, SLOT_FIELDS)) },
  });
}

// NO REAL ENDPOINT YET (mock only). Earnings are calculated by the server from verified
// bookings; the app only displays them. days: 7 | 30 | 90 | 365 | 'all'
export function getExperienceEarnings({ days = 30 } = {}) {
  return request('/experience-bookings/earnings', { params: { days } });
}

export function listReviews() {
  return request('/reviews');
}
