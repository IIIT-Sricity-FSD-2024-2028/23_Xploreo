// Domain service for the hotel portal, built on the shared request().
// Only the fields the backend DTOs allow are sent (extra fields → 400).
// All request() calls go through this file — no raw fetch/axios in pages.
import { request } from '@/foundation';

const enc = encodeURIComponent;
const listOf = (response) => (Array.isArray(response) ? response : response?.items ?? response?.data ?? []);

// ── Hotel CRUD ────────────────────────────────────────────────────────────────
// Fields: CreateHotelDto / UpdateHotelDto (see backend/src/hotels/dto/)
const HOTEL_FIELDS = ['name', 'city', 'location', 'description', 'stars', 'pricePerNight', 'taxesAndFees', 'image', 'images', 'amenities', 'status'];
function pickHotel(values) {
  return Object.fromEntries(HOTEL_FIELDS.filter((f) => values[f] !== undefined).map((f) => [f, values[f]]));
}

// GET /hotels  — partner: own hotels; traveller: active hotels (optional ?location=)
export async function listHotels(params) {
  return listOf(await request('/hotels', { params }));
}

// GET /hotels/:id
export function getHotel(id) {
  return request(`/hotels/${enc(id)}`);
}

// POST /hotels
export function createHotel(values) {
  return request('/hotels', { method: 'POST', body: pickHotel(values) });
}

// PATCH /hotels/:id
export function updateHotel(id, values) {
  return request(`/hotels/${enc(id)}`, { method: 'PATCH', body: pickHotel(values) });
}

// DELETE /hotels/:id
export function deleteHotel(id) {
  return request(`/hotels/${enc(id)}`, { method: 'DELETE' });
}

// ── Room types ────────────────────────────────────────────────────────────────
const ROOM_FIELDS = ['type', 'description', 'pricePerNight', 'maxOccupancy', 'totalRooms', 'availableRooms', 'amenities', 'images', 'status'];
function pickRoom(values) {
  return Object.fromEntries(ROOM_FIELDS.filter((f) => values[f] !== undefined).map((f) => [f, values[f]]));
}

// GET /hotels/:id/rooms
export async function listRooms(hotelId) {
  return listOf(await request(`/hotels/${enc(hotelId)}/rooms`));
}

// POST /hotels/:id/rooms
export function createRoomType(hotelId, values) {
  return request(`/hotels/${enc(hotelId)}/rooms`, { method: 'POST', body: pickRoom(values) });
}

// PATCH /hotels/:id/rooms/:roomId
export function updateRoomType(hotelId, roomId, values) {
  return request(`/hotels/${enc(hotelId)}/rooms/${enc(roomId)}`, { method: 'PATCH', body: pickRoom(values) });
}

// DELETE /hotels/:id/rooms/:roomId
export function deleteRoomType(hotelId, roomId) {
  return request(`/hotels/${enc(hotelId)}/rooms/${enc(roomId)}`, { method: 'DELETE' });
}

// GET /hotels/:id/availability
export function getHotelAvailability(hotelId, params) {
  return request(`/hotels/${enc(hotelId)}/availability`, { params });
}

// ── Bookings (hotel-partner side) ─────────────────────────────────────────────
// GET /bookings — hotel partner sees their hotels' bookings; optional ?status= filter
export async function listHotelBookings(params) {
  return listOf(await request('/bookings', { params }));
}

// GET /bookings/:id
export function getBooking(id) {
  return request(`/bookings/${enc(id)}`);
}

// PATCH /bookings/:id/check-in  — hotel partner marks guest as checked in
export function checkInBooking(id) {
  return request(`/bookings/${enc(id)}/check-in`, { method: 'PATCH' });
}

// PATCH /bookings/:id/check-out  — hotel partner marks guest as checked out
export function checkOutBooking(id) {
  return request(`/bookings/${enc(id)}/check-out`, { method: 'PATCH' });
}

// PATCH /bookings/:id/cancel  — traveller (or partner on behalf) cancels a booking with reason & refund evaluation
export function cancelBooking(id, data = {}) {
  return request(`/bookings/${enc(id)}/cancel`, {
    method: 'PATCH',
    body: data,
  });
}

// PATCH /bookings/:id/refund/retry — retry a failed or pending refund
export function retryHotelRefund(id) {
  return request(`/bookings/${enc(id)}/refund/retry`, { method: 'PATCH' });
}

// ── Bookings (traveller side) ─────────────────────────────────────────────────
const BOOKING_CREATE_FIELDS = [
  'hotelId', 'guestName', 'email', 'phone', 'checkIn', 'checkOut',
  'guests', 'roomType', 'notes', 'rooms',
];
function pickBooking(values) {
  return Object.fromEntries(BOOKING_CREATE_FIELDS.filter((f) => values[f] !== undefined).map((f) => [f, values[f]]));
}

// POST /bookings — traveller books a room
export function createBooking(values) {
  return request('/bookings', { method: 'POST', body: pickBooking(values) });
}

// ── Earnings (read-only) ──────────────────────────────────────────────────────
// GET /bookings/earnings — statement computed by the server from the partner's bookings
export function getPartnerEarnings(hotelId) {
  return request('/bookings/earnings', { params: { hotelId } });
}

// ── Reviews ───────────────────────────────────────────────────────────────────
// GET /hotels/:id/reviews
export async function getHotelReviews(hotelId) {
  return listOf(await request(`/hotels/${enc(hotelId)}/reviews`));
}

// GET /reviews — reviews across all of the partner's hotels (server scopes this to the
// signed-in partner's own hotels; see backend/src/reviews)
export async function listPartnerReviews() {
  return listOf(await request('/reviews'));
}

// ── Partner profile ───────────────────────────────────────────────────────────
// GET/PATCH /hotels/partner/profile
export function getPartnerProfile() {
  return request('/hotels/partner/profile');
}

const PROFILE_FIELDS = ['hotelName', 'description', 'contactNumber', 'email', 'location', 'gst', 'bankAccount', 'payoutMethod', 'checkInTime', 'checkOutTime', 'cancellationPolicy', 'logo'];
export function updatePartnerProfile(values) {
  const body = Object.fromEntries(PROFILE_FIELDS.filter((f) => values[f] !== undefined).map((f) => [f, values[f]]));
  return request('/hotels/partner/profile', { method: 'PATCH', body });
}
