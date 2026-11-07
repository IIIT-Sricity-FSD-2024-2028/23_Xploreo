// Mock domain "hotels": hotel inventory, room types, bookings, earnings, hotel partner profile.
// Mirrors backend/src/hotels, backend/src/bookings, backend/src/upload.
// Enforces server rules: 401 without login, 403 for wrong role/owner/region, 400 for invalid/extra fields.
//
// Unhappy paths baked in:
//   • hotel-partner-goa opens hotel-goa-2 (owned by hotel-partner-goa-2) → 403
//   • Room availableRooms drops after a booking is CONFIRMED
//   • Upload: too-big file, wrong file type, midway-failure scenarios
//   • Hotel partner A tries to edit/delete partner B's hotel → 403

import { ApiError, registerMock, requireRole, requireUser, assertRegion, assertOwner, whitelist } from '@/foundation';
import {
  HOTEL_BOOKING_STATUSES,
  bookingsForHotel,
  bookingsForTraveller,
  earningsForHotel,
  earningsForPartner,
  dayOffset,
  findHotel,
  findHotelBooking,
  findRoomType,
  getPartnerProfile,
  hotelBookings,
  hotelReviews,
  hotels,
  newBookingId,
  newHotelId,
  nowIso,
  refreshHotel,
  refreshRoomType,
  roomTypes,
  roomsForHotel,
  savePartnerProfile,
} from './db.js';
import { experiences as partnerExperiences, reviews as partnerReviews } from '../partners/db.js';


const sameRegion = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
const fieldError = (field, text) => new ApiError(400, text, { [field]: text });

// Fields the backend CreateHotelDto / UpdateHotelDto allows.
// Extra fields give a 400 — whitelist enforces this.
const HOTEL_FIELDS = ['id', 'partnerId', 'name', 'city', 'location', 'description', 'stars', 'pricePerNight', 'taxesAndFees', 'totalRooms', 'image', 'images', 'amenities', 'status', 'isDeleted'];

function validateHotel(body, { partial }) {
  const errors = {};
  const need = (k) => !partial || body[k] !== undefined;

  if (need('name') && (typeof body.name !== 'string' || !body.name.trim())) errors.name = 'name should not be empty';
  if (need('city') && (typeof body.city !== 'string' || !body.city.trim())) errors.city = 'city should not be empty';
  if (need('location') && (typeof body.location !== 'string' || !body.location.trim())) errors.location = 'location should not be empty';
  if (need('description') && (typeof body.description !== 'string' || !body.description.trim())) errors.description = 'description should not be empty';
  if (need('stars') && !(Number.isInteger(body.stars) && body.stars >= 1 && body.stars <= 5)) errors.stars = 'stars must be an integer between 1 and 5';
  if (need('pricePerNight') && !(typeof body.pricePerNight === 'number' && body.pricePerNight >= 0)) errors.pricePerNight = 'pricePerNight must not be less than 0';
  if (body.status !== undefined && !['active', 'inactive', 'restricted'].includes(body.status)) {
    errors.status = 'status must be one of the following values: active, inactive, restricted';
  }
  if (Object.keys(errors).length) throw new ApiError(400, Object.values(errors)[0], errors);
}

// ── Helper: load a hotel that the signed-in partner owns ──────────────────────
function loadOwnHotel(ctx) {
  const user = requireRole(ctx, 'hotel');
  const found = findHotel(ctx.params.id);
  if (!found || found.isDeleted) throw new ApiError(404, `Hotel ${ctx.params.id} not found`);
  assertRegion(ctx, found.city);
  assertOwner(ctx, found.partnerId);
  return found;
}

// ── Hotels ────────────────────────────────────────────────────────────────────

// GET /hotels
// - Hotel partner → their own hotels only (filtered by partnerId)
// - Traveller → all active hotels (optional ?location= filter)
// - Signed out → 401; Other partner roles → 403
registerMock('GET', '/hotels', (ctx) => {
  const user = requireUser(ctx);
  if (user.role === 'hotel') {
    return structuredClone(
      hotels
        .filter((h) => h.partnerId === user.id && !h.isDeleted)
        .map(refreshHotel),
    );
  }
  if (user.role === 'traveller') {
    const loc = ctx.query?.location;
    return structuredClone(
      hotels
        .filter((h) => !h.isDeleted && h.status === 'active' && (!loc || sameRegion(h.city, loc)))
        .map(refreshHotel),
    );
  }
  throw new ApiError(403, 'Your account type cannot do this.');
});

// GET /hotels/:id
registerMock('GET', '/hotels/:id', (ctx) => {
  const found = findHotel(ctx.params.id);
  if (!found || found.isDeleted) throw new ApiError(404, `Hotel ${ctx.params.id} not found`);
  // A hotel partner may only read their own hotel
  if (ctx.user?.role === 'hotel') {
    assertRegion(ctx, found.city);
    assertOwner(ctx, found.partnerId);
  }
  return structuredClone(refreshHotel(found));
});

// POST /hotels  (partner or admin creates a hotel)
registerMock('POST', '/hotels', (ctx) => {
  const user = requireRole(ctx, 'hotel');
  const body = whitelist(ctx.body, HOTEL_FIELDS);
  validateHotel(body, { partial: false });
  if (body.city && !sameRegion(body.city, user.region)) {
    throw new ApiError(403, `You can only create hotels in your region (${user.region}).`);
  }
  const h = {
    id: body.id ?? newHotelId(user.id),
    partnerId: user.id,
    name: body.name.trim(),
    city: user.region,
    location: body.location.trim(),
    description: body.description.trim(),
    stars: body.stars,
    rating: 0,
    reviewCount: 0,
    pricePerNight: body.pricePerNight,
    taxesAndFees: body.taxesAndFees ?? 0,
    totalRooms: body.totalRooms ?? 0,
    availableRooms: body.totalRooms ?? 0,
    image: body.image ?? '',
    images: body.images ?? [],
    amenities: body.amenities ?? [],
    status: body.status ?? 'active',
    isDeleted: false,
    createdAt: nowIso(),
  };
  hotels.push(h);
  return structuredClone(h);
});

// PATCH /hotels/:id
registerMock('PATCH', '/hotels/:id', (ctx) => {
  const found = loadOwnHotel(ctx);
  const body = whitelist(ctx.body, HOTEL_FIELDS);
  validateHotel(body, { partial: true });
  if (body.city !== undefined && !sameRegion(body.city, found.city)) {
    throw new ApiError(403, 'You cannot move a hotel to a different region.');
  }
  const updatable = ['name', 'location', 'description', 'stars', 'pricePerNight', 'taxesAndFees', 'totalRooms', 'image', 'images', 'amenities', 'status'];
  updatable.forEach((field) => {
    if (body[field] !== undefined) found[field] = field === 'name' ? body.name.trim() : body[field];
  });
  return structuredClone(refreshHotel(found));
});

// DELETE /hotels/:id
registerMock('DELETE', '/hotels/:id', (ctx) => {
  const found = loadOwnHotel(ctx);
  const active = hotelBookings.filter(
    (b) => b.hotelId === found.id && ['CONFIRMED', 'CHECKED_IN'].includes(b.status),
  );
  if (active.length) {
    throw new ApiError(400, `Cannot delete: ${active.length} active booking(s) exist for this hotel.`);
  }
  found.isDeleted = true;
  return { message: `Hotel ${found.id} deleted` };
});

// ── Room types ────────────────────────────────────────────────────────────────
const ROOM_FIELDS = ['id', 'hotelId', 'type', 'description', 'pricePerNight', 'maxOccupancy', 'totalRooms', 'amenities', 'images'];

function validateRoomType(body, { partial }) {
  const errors = {};
  const need = (k) => !partial || body[k] !== undefined;
  if (need('type') && (typeof body.type !== 'string' || !body.type.trim())) errors.type = 'type should not be empty';
  if (need('pricePerNight') && !(typeof body.pricePerNight === 'number' && body.pricePerNight >= 0)) errors.pricePerNight = 'pricePerNight must not be less than 0';
  if (need('maxOccupancy') && !(Number.isInteger(body.maxOccupancy) && body.maxOccupancy >= 1)) errors.maxOccupancy = 'maxOccupancy must be at least 1';
  if (need('totalRooms') && !(Number.isInteger(body.totalRooms) && body.totalRooms >= 0)) errors.totalRooms = 'totalRooms must not be less than 0';
  if (Object.keys(errors).length) throw new ApiError(400, Object.values(errors)[0], errors);
}

// GET /hotels/:id/rooms
registerMock('GET', '/hotels/:id/rooms', (ctx) => {
  const found = findHotel(ctx.params.id);
  if (!found || found.isDeleted) throw new ApiError(404, `Hotel ${ctx.params.id} not found`);
  if (ctx.user?.role === 'hotel') {
    assertRegion(ctx, found.city);
    assertOwner(ctx, found.partnerId);
  }
  return structuredClone(roomsForHotel(ctx.params.id).map(refreshRoomType));
});

// POST /hotels/:id/rooms
registerMock('POST', '/hotels/:id/rooms', (ctx) => {
  const found = loadOwnHotel(ctx);
  const body = whitelist(ctx.body, ROOM_FIELDS);
  validateRoomType(body, { partial: false });
  if (roomTypes.some((r) => r.hotelId === found.id && r.type.toLowerCase() === (body.type ?? '').toLowerCase())) {
    throw fieldError('type', `A room type "${body.type}" already exists for this hotel.`);
  }
  const rt = {
    id: body.id ?? `rt-${found.id}-${Date.now()}`,
    hotelId: found.id,
    type: body.type.trim(),
    description: body.description ?? '',
    pricePerNight: body.pricePerNight,
    maxOccupancy: body.maxOccupancy,
    totalRooms: body.totalRooms ?? 0,
    availableRooms: body.totalRooms ?? 0,
    amenities: body.amenities ?? [],
    images: body.images ?? [],
  };
  roomTypes.push(rt);
  return structuredClone(rt);
});

// PATCH /hotels/:id/rooms/:roomId
registerMock('PATCH', '/hotels/:id/rooms/:roomId', (ctx) => {
  loadOwnHotel(ctx); // owner + region check on the parent hotel
  const rt = findRoomType(ctx.params.roomId);
  if (!rt || rt.hotelId !== ctx.params.id) throw new ApiError(404, `Room type ${ctx.params.roomId} not found in hotel ${ctx.params.id}`);
  const body = whitelist(ctx.body, ROOM_FIELDS);
  validateRoomType(body, { partial: true });
  if (body.totalRooms !== undefined) {
    const occupied = rt.totalRooms - rt.availableRooms;
    if (body.totalRooms < occupied) {
      throw fieldError('totalRooms', `Cannot set totalRooms below ${occupied} (currently occupied).`);
    }
  }
  const updatable = ['type', 'description', 'pricePerNight', 'maxOccupancy', 'totalRooms', 'amenities', 'images'];
  updatable.forEach((field) => { if (body[field] !== undefined) rt[field] = body[field]; });
  return structuredClone(refreshRoomType(rt));
});

// DELETE /hotels/:id/rooms/:roomId
registerMock('DELETE', '/hotels/:id/rooms/:roomId', (ctx) => {
  const found = loadOwnHotel(ctx);
  const rt = findRoomType(ctx.params.roomId);
  if (!rt || rt.hotelId !== found.id) throw new ApiError(404, `Room type ${ctx.params.roomId} not found in hotel ${ctx.params.id}`);

  const activeBookings = hotelBookings.filter(
    (b) => b.hotelId === found.id && b.roomType === rt.type && ['CONFIRMED', 'CHECKED_IN'].includes(b.status),
  );
  if (activeBookings.length > 0) {
    throw new ApiError(400, `Cannot delete room type with ${activeBookings.length} active booking(s).`);
  }

  const idx = roomTypes.indexOf(rt);
  if (idx !== -1) roomTypes.splice(idx, 1);
  refreshHotel(found);
  return { message: `Room type ${rt.id} deleted` };
});

// GET /hotels/:id/availability
registerMock('GET', '/hotels/:id/availability', (ctx) => {
  const found = findHotel(ctx.params.id);
  if (!found || found.isDeleted) throw new ApiError(404, `Hotel ${ctx.params.id} not found`);
  if (ctx.user?.role === 'hotel') {
    assertRegion(ctx, found.city);
    assertOwner(ctx, found.partnerId);
  }
  const rooms = roomsForHotel(found.id).map(refreshRoomType);

  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    const roomAvailability = rooms.map((r) => {
      const activeForDate = hotelBookings.filter((b) => {
        if (b.hotelId !== found.id || b.roomType !== r.type) return false;
        if (!['CONFIRMED', 'CHECKED_IN'].includes(b.status)) return false;
        return dateStr >= b.checkIn && dateStr < b.checkOut;
      });
      const bookedRooms = activeForDate.reduce((sum, b) => sum + (b.rooms ?? 1), 0);
      const available = Math.max(0, r.totalRooms - bookedRooms);
      return {
        roomTypeId: r.id,
        roomType: r.type,
        totalRooms: r.totalRooms,
        bookedRooms,
        availableRooms: available,
        isAvailable: available > 0,
      };
    });

    const totalRoomsCount = rooms.reduce((sum, r) => sum + r.totalRooms, 0);
    const totalBookedCount = roomAvailability.reduce((sum, r) => sum + r.bookedRooms, 0);

    days.push({
      date: dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      totalRooms: totalRoomsCount,
      bookedRooms: totalBookedCount,
      availableRooms: Math.max(0, totalRoomsCount - totalBookedCount),
      roomTypes: roomAvailability,
    });
  }

  return {
    hotelId: found.id,
    hotelName: found.name,
    calendar: days,
    roomSummary: rooms,
  };
});

// ── Hotel bookings (hotel-partner side: read + check-in/check-out) ────────────

// GET /bookings  — hotel partner sees their hotels' bookings; a traveller sees their own
registerMock('GET', '/bookings', (ctx) => {
  const user = requireUser(ctx);
  if (user.role === 'hotel') {
    const myHotels = new Set(hotels.filter((h) => h.partnerId === user.id && !h.isDeleted).map((h) => h.id));
    return structuredClone(hotelBookings.filter((b) => myHotels.has(b.hotelId)));
  }
  if (user.role === 'traveller') {
    return structuredClone(bookingsForTraveller(user.id));
  }
  throw new ApiError(403, 'Your account type cannot do this.');
});

// GET /bookings/:id
registerMock('GET', '/bookings/:id', (ctx) => {
  const user = requireUser(ctx);
  const booking = findHotelBooking(ctx.params.id);
  if (!booking) throw new ApiError(404, `Booking ${ctx.params.id} not found`);
  const hotel = findHotel(booking.hotelId);
  if (user.role === 'hotel') {
    assertRegion(ctx, hotel?.city ?? '');
    if (hotel?.partnerId !== user.id) throw new ApiError(403, 'This booking belongs to another hotel.');
  } else if (user.role === 'traveller' && booking.travellerId !== user.id) {
    throw new ApiError(403, 'You can only view your own bookings.');
  }
  return structuredClone({ ...booking, hotel: hotel ? structuredClone(hotel) : undefined });
});

// POST /bookings  (traveller creates a booking)
registerMock('POST', '/bookings', (ctx) => {
  const user = requireRole(ctx, 'traveller');
  const BOOKING_FIELDS = ['id', 'hotelId', 'guestName', 'email', 'phone', 'checkIn', 'checkOut', 'guests', 'roomType', 'notes', 'rooms', 'totalAmount', 'guestNames'];
  const body = whitelist(ctx.body, BOOKING_FIELDS);

  const errors = {};
  if (!body.hotelId) errors.hotelId = 'hotelId should not be empty';
  if (!body.guestName) errors.guestName = 'guestName should not be empty';
  if (!body.email) errors.email = 'email should not be empty';
  if (!body.phone) errors.phone = 'phone should not be empty';
  if (!body.checkIn) errors.checkIn = 'checkIn should not be empty';
  if (!body.checkOut) errors.checkOut = 'checkOut should not be empty';
  if (!(Number.isInteger(body.guests) && body.guests >= 1)) errors.guests = 'guests must be at least 1';
  if (!body.roomType) errors.roomType = 'roomType should not be empty';
  if (Object.keys(errors).length) throw new ApiError(400, Object.values(errors)[0], errors);

  const hotel = findHotel(body.hotelId);
  if (!hotel || hotel.isDeleted || hotel.status !== 'active') {
    throw new ApiError(404, `Hotel ${body.hotelId} not found or is unavailable`);
  }
  const rt = roomTypes.find((r) => r.hotelId === body.hotelId && r.type.toLowerCase() === (body.roomType ?? '').toLowerCase());
  if (rt && rt.availableRooms < (body.rooms ?? 1)) {
    throw new ApiError(400, `Room type "${body.roomType}" has no availability for the requested dates.`);
  }

  const nights = Math.max(1, (new Date(body.checkOut) - new Date(body.checkIn)) / 86400000);
  const booking = {
    id: body.id ?? newBookingId(),
    hotelId: body.hotelId,
    travellerId: user.id,
    guestName: body.guestName.trim(),
    email: body.email.trim(),
    phone: body.phone.trim(),
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    guests: body.guests,
    roomType: body.roomType.trim(),
    notes: body.notes ?? '',
    rooms: body.rooms ?? 1,
    totalAmount: body.totalAmount ?? ((rt?.pricePerNight ?? hotel.pricePerNight) * nights * (body.rooms ?? 1)),
    guestNames: body.guestNames ?? [body.guestName.trim()],
    status: 'CONFIRMED',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  hotelBookings.push(booking);
  // Availability updates immediately on confirmation
  if (rt) refreshRoomType(rt);
  refreshHotel(hotel);
  return structuredClone({ ...booking, hotel });
});

// PATCH /bookings/:id/cancel  (traveller OR hotel partner cancels)
registerMock('PATCH', '/bookings/:id/cancel', (ctx) => {
  const user = requireUser(ctx);
  const booking = findHotelBooking(ctx.params.id);
  if (!booking) throw new ApiError(404, `Booking ${ctx.params.id} not found`);

  if (user.role === 'hotel') {
    // Hotel partner cancelling a booking for their own property
    const hotel = findHotel(booking.hotelId);
    assertRegion(ctx, hotel?.city ?? '');
    if (hotel?.partnerId !== user.id) throw new ApiError(403, 'This booking belongs to another hotel partner.');
    if (!['CONFIRMED'].includes(booking.status)) throw new ApiError(400, `Only CONFIRMED bookings can be cancelled by the hotel (current: ${booking.status}).`);
  } else if (user.role === 'traveller') {
    if (booking.travellerId !== user.id) throw new ApiError(403, 'You can only cancel your own bookings.');
    if (['CHECKED_IN', 'CHECKED_OUT'].includes(booking.status)) throw new ApiError(400, `Cannot cancel a booking that is ${booking.status}.`);
  } else {
    throw new ApiError(403, 'Forbidden.');
  }

  if (booking.status === 'CANCELLED') throw new ApiError(400, 'Booking is already cancelled.');
  booking.status = 'CANCELLED';
  booking.updatedAt = nowIso();
  const hotel = findHotel(booking.hotelId);
  const rt = roomTypes.find((r) => r.hotelId === booking.hotelId && r.type === booking.roomType);
  if (rt) refreshRoomType(rt);
  if (hotel) refreshHotel(hotel);
  return structuredClone(booking);
});

// PATCH /bookings/:id/check-in  (hotel partner checks in a guest)
registerMock('PATCH', '/bookings/:id/check-in', (ctx) => {
  const user = requireRole(ctx, 'hotel');
  const booking = findHotelBooking(ctx.params.id);
  if (!booking) throw new ApiError(404, `Booking ${ctx.params.id} not found`);
  const hotel = findHotel(booking.hotelId);
  assertRegion(ctx, hotel?.city ?? '');
  if (hotel?.partnerId !== user.id) throw new ApiError(403, 'This booking belongs to another hotel partner.');
  if (booking.status !== 'CONFIRMED') throw new ApiError(400, `Only CONFIRMED bookings can be checked in (current: ${booking.status}).`);
  if (String(booking.checkOut ?? '').slice(0, 10) < dayOffset(0)) throw new ApiError(400, 'Bookings whose dates have already passed cannot be checked in.');
  booking.status = 'CHECKED_IN';
  booking.updatedAt = nowIso();
  return structuredClone(booking);
});

// PATCH /bookings/:id/check-out  (hotel partner checks out a guest)
registerMock('PATCH', '/bookings/:id/check-out', (ctx) => {
  const user = requireRole(ctx, 'hotel');
  const booking = findHotelBooking(ctx.params.id);
  if (!booking) throw new ApiError(404, `Booking ${ctx.params.id} not found`);
  const hotel = findHotel(booking.hotelId);
  assertRegion(ctx, hotel?.city ?? '');
  if (hotel?.partnerId !== user.id) throw new ApiError(403, 'This booking belongs to another hotel partner.');
  if (booking.status !== 'CHECKED_IN') throw new ApiError(400, `Only CHECKED_IN bookings can be checked out (current: ${booking.status}).`);
  if (String(booking.checkOut ?? '').slice(0, 10) < dayOffset(0)) throw new ApiError(400, 'Bookings whose dates have already passed cannot be checked out.');
  booking.status = 'CHECKED_OUT';
  booking.updatedAt = nowIso();
  booking.checkOut = dayOffset(0);
  const rt = roomTypes.find((r) => r.hotelId === booking.hotelId && r.type === booking.roomType);
  if (rt) refreshRoomType(rt);
  if (hotel) refreshHotel(hotel);
  return structuredClone(booking);
});

// ── Earnings (read-only; hotel partner only) ──────────────────────────────────
registerMock('GET', '/hotels/:id/earnings', (ctx) => {
  const found = loadOwnHotel(ctx); // owner + region check
  return structuredClone(earningsForHotel(found.id));
});

// GET /bookings/earnings — the full statement the Earnings page renders,
// computed live from the partner's own bookings (optional ?hotelId= filter)
registerMock('GET', '/bookings/earnings', (ctx) => {
  const user = requireRole(ctx, 'hotel');
  return structuredClone(earningsForPartner(user.id, ctx.query?.hotelId));
});

// ── Partner profile ────────────────────────────────────────────────────────────
// GET/PATCH /hotels/partner/profile — one profile per signed-in hotel partner
registerMock('GET', '/hotels/partner/profile', (ctx) => {
  const user = requireRole(ctx, 'hotel');
  return structuredClone(getPartnerProfile(user.id));
});

const PARTNER_PROFILE_FIELDS = ['hotelName', 'description', 'contactNumber', 'email', 'location', 'gst', 'bankAccount', 'payoutMethod', 'checkInTime', 'checkOutTime', 'cancellationPolicy', 'logo'];
registerMock('PATCH', '/hotels/partner/profile', (ctx) => {
  const user = requireRole(ctx, 'hotel');
  const body = whitelist(ctx.body, PARTNER_PROFILE_FIELDS);
  return structuredClone(savePartnerProfile(user.id, body));
});

// ── Reviews for Hotels & General Reviews ─────────────────────────────────────
// GET /hotels/:id/reviews (hotel reviews filtered to a property)
registerMock('GET', '/hotels/:id/reviews', (ctx) => {
  const found = loadOwnHotel(ctx);
  return structuredClone(
    hotelReviews
      .filter((r) => r.targetType === 'hotel' && r.targetId === found.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((r) => ({ ...r, authorName: r.authorName ?? r.userName })),
  );
});

// GET /reviews (list reviews for partner or traveller)
registerMock('GET', '/reviews', (ctx) => {
  if (ctx.user?.role === 'hotel') {
    const user = requireUser(ctx);
    const myHotelIds = new Set(hotels.filter((h) => h.partnerId === user.id && !h.isDeleted).map((h) => h.id));
    const hotelIdFilter = ctx.query?.hotelId;
    return structuredClone(
      hotelReviews
        .filter((r) => r.targetType === 'hotel' && myHotelIds.has(r.targetId) && (!hotelIdFilter || r.targetId === hotelIdFilter))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        // The Reviews/Dashboard pages read authorName + hotelName; derive both live from the
        // hotel record instead of duplicating them onto every seed review.
        .map((r) => ({ ...r, authorName: r.authorName ?? r.userName, hotelName: findHotel(r.targetId)?.name ?? '' })),
    );
  }
  if (ctx.user?.role === 'guide') {
    return structuredClone(partnerReviews.filter((r) => r.targetType === 'guide' && String(r.targetId) === String(ctx.user.id)));
  }
  if (ctx.user?.role === 'experience') {
    const mine = new Set(partnerExperiences.filter((e) => e.partnerId === ctx.user.id).map((e) => e.id));
    return structuredClone(partnerReviews.filter((r) => r.targetType === 'experience' && mine.has(r.targetId)));
  }
  return structuredClone(
    [...hotelReviews, ...partnerReviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  );
});

// POST /reviews (traveller submits a guest review)
registerMock('POST', '/reviews', (ctx) => {
  const REVIEW_FIELDS = ['targetType', 'targetId', 'hotelId', 'experienceId', 'userId', 'rating', 'comment', 'title', 'authorName', 'image'];
  const body = whitelist(ctx.body, REVIEW_FIELDS);

  const targetType = body.targetType || (body.hotelId ? 'hotel' : body.experienceId ? 'experience' : 'hotel');
  const targetId = body.targetId || body.hotelId || body.experienceId;
  const rating = Number(body.rating);
  const comment = (body.comment || '').trim();

  if (!targetId) throw new ApiError(400, 'targetId or hotelId is required');
  if (!rating || rating < 1 || rating > 5) throw new ApiError(400, 'rating must be an integer between 1 and 5');
  if (!comment) throw new ApiError(400, 'comment should not be empty');

  const newReview = {
    id: hotelReviews.length + partnerReviews.length + 500,
    userId: body.userId || 20005,
    userName: body.authorName || ctx.user?.name || 'Verified Traveller',
    authorName: body.authorName || ctx.user?.name || 'Verified Traveller',
    targetType,
    targetId: String(targetId),
    rating,
    comment,
    title: body.title || '',
    image: body.image || '',
    createdAt: nowIso(),
  };

  if (targetType === 'hotel') {
    hotelReviews.unshift(newReview);
  } else {
    partnerReviews.unshift(newReview);
  }

  return structuredClone(newReview);
});


// ── Upload (shared with M2; /upload/single and /upload/multiple) ──────────────
// The real backend: POST /upload/single → { success, message, data: { filename, path, ... } }
// Simulate: progress via a plain response (frontend drives progress itself), then success/failure.
// Three mock scenarios are distinguished by filename convention so the UI can demo all states:
//   • normal file   → success after simulated delay (already done by the registry's delay())
//   • too-big.jpg   → 400 "File too large"
//   • wrong.bmp     → 400 "Invalid file type"
//   • fail50.jpg    → 400 "Upload interrupted" (simulates midway failure)
// In real use M2/M3 pages call upload.api.js which calls request(); the mock intercepts it.

registerMock('POST', '/upload/single', (ctx) => {
  requireUser(ctx);
  const filename = ctx.body?.filename ?? '';
  const mimetype = ctx.body?.mimetype ?? 'image/jpeg';
  const sizeBytes = ctx.body?.sizeBytes ?? 0;

  const MAX_SIZE = 5 * 1024 * 1024;
  const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (sizeBytes > MAX_SIZE) {
    throw new ApiError(400, 'File too large. Maximum size is 5 MB.', { file: 'File too large. Maximum size is 5 MB.' });
  }
  if (!ALLOWED.includes(mimetype)) {
    throw new ApiError(400, 'Invalid file type. Only JPEG, PNG, GIF, WebP are allowed.', { file: 'Invalid file type. Only JPEG, PNG, GIF, WebP are allowed.' });
  }
  if (/fail50/i.test(filename)) {
    throw new ApiError(500, 'Upload interrupted: connection lost at 60%.', { file: 'Upload interrupted: connection lost at 60%.' });
  }

  const ext = filename.split('.').pop() || 'jpg';
  const uuid = `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    success: true,
    message: 'File uploaded successfully',
    data: {
      filename: `${uuid}.${ext}`,
      originalName: filename,
      mimetype,
      size: sizeBytes,
      path: `/uploads/images/${uuid}.${ext}`,
      url: `/uploads/images/${uuid}.${ext}`,
    },
  };
});

registerMock('POST', '/upload/multiple', (ctx) => {
  requireUser(ctx);
  const files = Array.isArray(ctx.body?.files) ? ctx.body.files : [];
  if (!files.length) throw new ApiError(400, 'No files uploaded.', { files: 'No files uploaded.' });

  const MAX_SIZE = 5 * 1024 * 1024;
  const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const data = files.map((file) => {
    if ((file.sizeBytes ?? 0) > MAX_SIZE) throw new ApiError(400, `File "${file.filename}" is too large.`, { file: `File "${file.filename}" is too large.` });
    if (!ALLOWED.includes(file.mimetype ?? '')) throw new ApiError(400, `Invalid type for "${file.filename}".`, { file: `Invalid type for "${file.filename}".` });
    const ext = (file.filename ?? 'img').split('.').pop() || 'jpg';
    const uuid = `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return { filename: `${uuid}.${ext}`, originalName: file.filename, mimetype: file.mimetype, size: file.sizeBytes, path: `/uploads/images/${uuid}.${ext}`, url: `/uploads/images/${uuid}.${ext}` };
  });

  return { success: true, message: 'Files uploaded successfully', data };
});
