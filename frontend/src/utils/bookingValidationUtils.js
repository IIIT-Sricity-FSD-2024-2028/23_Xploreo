import { validateBookingDates } from './checkoutUtils.js';

export function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function isValidIsoCalendarDate(value) {
  const str = String(value || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function calculateNightCount(checkIn, checkOut) {
  const inStr = String(checkIn || '').slice(0, 10);
  const outStr = String(checkOut || '').slice(0, 10);
  if (!isValidIsoCalendarDate(inStr) || !isValidIsoCalendarDate(outStr)) return 1;
  const diff = Math.round((Date.parse(`${outStr}T00:00:00Z`) - Date.parse(`${inStr}T00:00:00Z`)) / 86400000);
  return Math.max(1, diff);
}

export function validateHotelRoomBooking({
  hotel,
  room,
  roomsCount = 1,
  guestsCount = 1,
  checkIn,
  checkOut,
  today = getTodayIsoDate(),
} = {}) {
  const roomsNum = Number(roomsCount);
  const guestsNum = Number(guestsCount);
  const availableRooms = Number(room?.availableRooms ?? hotel?.availableRooms ?? 0);
  const totalRooms = Number(room?.totalRooms ?? hotel?.totalRooms ?? availableRooms);
  const maxOccupancy = Number(room?.maxOccupancy ?? 0);
  const maxAllowedGuests = maxOccupancy > 0 ? maxOccupancy * Math.max(1, roomsNum || 1) : 0;

  const details = {
    roomsCount: roomsNum,
    guestsCount: guestsNum,
    maxOccupancy,
    maxAllowedGuests,
    availableRooms,
    totalRooms,
  };

  if (hotel?.availability && hotel.availability !== 'available') {
    return { valid: false, error: 'This hotel property is currently unavailable for booking.', details };
  }

  if (!room) {
    return { valid: false, error: 'Please select a room type to continue.', details };
  }

  if (String(room.status || 'active').toLowerCase() === 'inactive') {
    return { valid: false, error: `${room.type || 'Selected room'} is currently inactive and cannot be booked.`, details };
  }

  if (!Number.isInteger(roomsNum) || roomsNum < 1) {
    return { valid: false, error: 'Please select at least 1 room.', details };
  }

  if (!Number.isInteger(guestsNum) || guestsNum < 1) {
    return { valid: false, error: 'At least 1 guest is required.', details };
  }

  if (availableRooms <= 0) {
    return { valid: false, error: `${room.type || 'Selected room'} is currently sold out.`, details };
  }

  if (roomsNum > availableRooms) {
    return {
      valid: false,
      error: `Only ${availableRooms} ${room.type || 'room'}${availableRooms === 1 ? '' : 's'} available right now.`,
      details,
    };
  }

  if (maxOccupancy > 0 && guestsNum > maxAllowedGuests) {
    return {
      valid: false,
      error: `Maximum ${maxAllowedGuests} guest${maxAllowedGuests === 1 ? '' : 's'} allowed for ${roomsNum} ${room.type || 'selected'} room${roomsNum === 1 ? '' : 's'} (${maxOccupancy} guests per room). Increase room count or reduce guests.`,
      details,
    };
  }

  const inStr = String(checkIn || '').trim().slice(0, 10);
  const outStr = String(checkOut || '').trim().slice(0, 10);
  if (!isValidIsoCalendarDate(inStr) || !isValidIsoCalendarDate(outStr)) {
    return { valid: false, error: 'Please provide valid check-in and check-out dates.', details };
  }

  const dateError = validateBookingDates({
    type: 'hotel',
    checkIn: inStr,
    checkOut: outStr,
    today,
  });
  if (dateError) {
    return { valid: false, error: dateError, details };
  }

  return { valid: true, error: '', details };
}

export function validateExperienceBooking({
  experience,
  slot,
  date,
  participants = 1,
  today = getTodayIsoDate(),
} = {}) {
  const participantsNum = Number(participants);
  const targetDate = String(date || slot?.date || '').trim().slice(0, 10);
  const slots = Array.isArray(experience?.slots) ? experience.slots : [];
  const resolvedSlot = slot || slots.find((s) => String(s.date).slice(0, 10) === targetDate) || null;
  const capacity = Number(resolvedSlot?.capacity ?? experience?.capacity ?? 0);
  const booked = Number(resolvedSlot?.booked ?? 0);
  const remainingSpots = Math.max(0, capacity - booked);

  const details = {
    participants: participantsNum,
    targetDate,
    capacity,
    booked,
    remainingSpots,
  };

  if (!experience) {
    return { valid: false, error: 'Experience details are required to complete booking.', details };
  }

  if (experience.availability && experience.availability !== 'available') {
    return { valid: false, error: 'This experience is currently unavailable for booking.', details };
  }

  if (!targetDate || !isValidIsoCalendarDate(targetDate)) {
    return { valid: false, error: 'Please select a valid experience session date.', details };
  }

  if (targetDate < today) {
    return { valid: false, error: 'Experiences cannot be booked for a past date.', details };
  }

  if (!Number.isInteger(participantsNum) || participantsNum < 1) {
    return { valid: false, error: 'At least 1 participant is required.', details };
  }

  if (slots.length > 0 && !resolvedSlot) {
    return { valid: false, error: `No session is scheduled on ${targetDate}.`, details };
  }

  if (resolvedSlot) {
    if (resolvedSlot.available === false) {
      return { valid: false, error: `The selected session on ${targetDate} is unavailable.`, details };
    }
    if (remainingSpots <= 0) {
      return { valid: false, error: `The selected session on ${targetDate} is sold out.`, details };
    }
    if (participantsNum > remainingSpots) {
      return {
        valid: false,
        error: `Only ${remainingSpots} spot${remainingSpots === 1 ? '' : 's'} remaining on ${targetDate}.`,
        details,
      };
    }
  } else if (capacity > 0 && participantsNum > capacity) {
    return {
      valid: false,
      error: `Maximum ${capacity} participant${capacity === 1 ? '' : 's'} allowed for this experience.`,
      details,
    };
  }

  return { valid: true, error: '', details };
}

export function validatePackageBooking({
  plan,
  guestsCount = 1,
  checkIn,
  checkOut,
  today = getTodayIsoDate(),
} = {}) {
  const guestsNum = Number(guestsCount);
  const startDate = String(checkIn || '').trim().slice(0, 10);
  const endDate = String(checkOut || '').trim().slice(0, 10);

  if (plan?.status) {
    const status = String(plan.status).toLowerCase();
    if (status === 'sold_out') {
      return { valid: false, error: 'This tour package is currently sold out.' };
    }
    if (status === 'draft' || status === 'unpublished') {
      return { valid: false, error: 'This tour package is not published yet.' };
    }
    if (status !== 'available') {
      return { valid: false, error: 'This tour package is currently unavailable for booking.' };
    }
  }

  // The server's booking quote (GET /plans/:id/capacity) says why a package cannot be booked:
  // inactive or other-region inventory, no session on a date, no capacity left, unknown capacity.
  if (plan?.bookingQuote && plan.bookingQuote.bookable === false) {
    return {
      valid: false,
      error: plan.bookingQuote.issues?.[0] || 'This tour package cannot be booked right now.',
    };
  }

  if (!Number.isInteger(guestsNum) || guestsNum < 1) {
    return { valid: false, error: 'At least 1 traveller is required.' };
  }

  const maxPackageGuests = Number(plan?.maxGuests ?? plan?.capacity ?? 0);
  if (maxPackageGuests > 0 && guestsNum > maxPackageGuests) {
    return { valid: false, error: `Maximum ${maxPackageGuests} travellers allowed for this package.` };
  }

  if (!startDate || !isValidIsoCalendarDate(startDate)) {
    return { valid: false, error: 'Please select a valid departure date.' };
  }

  if (startDate < today) {
    return { valid: false, error: 'Package departure date cannot be in the past.' };
  }

  if (endDate) {
    if (!isValidIsoCalendarDate(endDate)) {
      return { valid: false, error: 'Please select a valid return date.' };
    }
    if (endDate < startDate) {
      return { valid: false, error: 'Return date cannot be earlier than departure date.' };
    }
  }

  return { valid: true, error: '' };
}

/**
 * Parses a date string and optional time string into UTC epoch milliseconds
 * in Indian Standard Time (IST, UTC+05:30).
 * Returns null if the date is invalid or missing.
 */
export function parseScheduledMomentToMs(dateStr, timeStr = '00:00') {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str) return null;

  if (str.includes('T')) {
    const datePart = str.slice(0, 10);
    if (!isValidIsoCalendarDate(datePart)) return null;
    if (/(?:Z|[+-]\d{2}(?::?\d{2})?)$/.test(str)) {
      const ms = Date.parse(str);
      return Number.isNaN(ms) ? null : ms;
    }
    const ms = Date.parse(`${str}+05:30`);
    return Number.isNaN(ms) ? null : ms;
  }

  const dateMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return null;
  const datePart = dateMatch[1];
  if (!isValidIsoCalendarDate(datePart)) return null;

  let normTime = String(timeStr || '00:00').trim();
  const timeMatch = normTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    const hh = timeMatch[1].padStart(2, '0');
    const mm = timeMatch[2];
    const ss = timeMatch[3] || '00';
    normTime = `${hh}:${mm}:${ss}`;
  } else {
    normTime = '00:00:00';
  }

  const ms = Date.parse(`${datePart}T${normTime}+05:30`);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Shared booking cancellation eligibility validator.
 * Validates whether a booking (Hotel, Experience, or Trip/Package) is eligible for cancellation by the traveller.
 *
 * Rules:
 * 1. Future bookings: allowed according to existing policy.
 * 2. Today's bookings: allowed if scheduled start / check-in time has NOT passed. Disabled if passed.
 * 3. Past bookings: blocked under all circumstances for traveller flow.
 * 4. Already cancelled: blocked, button hidden or cancelled status displayed.
 * 5. In-progress / Checked-in / Completed: blocked.
 * 6. Missing / invalid date: blocked safely.
 *
 * @param {object} booking - Booking or trip entity
 * @param {'hotel'|'experience'|'trip'|'package'} [bookingType] - Explicit booking type (auto-detected if omitted)
 * @param {Date|number} [now] - Reference time (default: new Date())
 * @returns {{ canCancel: boolean, reason: string, message: string, scheduledMoment: number | null, scheduledDateStr?: string, scheduledTimeStr?: string }}
 */
export function getBookingCancellationEligibility(booking, bookingType, now = new Date()) {
  if (!booking || typeof booking !== 'object') {
    return {
      canCancel: false,
      reason: 'invalid_booking',
      message: 'This booking cannot be cancelled because its details are invalid.',
      scheduledMoment: null,
    };
  }

  const status = String(booking.status || '').toLowerCase();

  // Already cancelled
  if (status === 'cancelled') {
    return {
      canCancel: false,
      reason: 'already_cancelled',
      message: 'Booking is already cancelled.',
      scheduledMoment: null,
    };
  }

  // Completed or in-progress
  if (status === 'checked_in' || status === 'checked_out' || status === 'started' || status === 'completed') {
    const formattedStatus = status.replace('_', ' ');
    return {
      canCancel: false,
      reason: 'status_ineligible',
      message: `Cannot cancel a booking that is ${formattedStatus}.`,
      scheduledMoment: null,
    };
  }

  // Determine type if not explicitly passed
  let type = bookingType ? String(bookingType).toLowerCase() : '';
  if (!type) {
    if (booking.bookingType) {
      type = String(booking.bookingType).toLowerCase();
    } else if (booking.hotel || booking.roomType || booking.checkIn) {
      type = 'hotel';
    } else if (booking.planId || booking.itinerary) {
      type = 'trip';
    } else {
      type = 'experience';
    }
  }

  let scheduledMoment = null;
  let scheduledDateStr = '';
  let scheduledTimeStr = '';

  if (type === 'hotel') {
    scheduledDateStr = String(booking.checkIn || booking.checkInDate || booking.date || '').slice(0, 10);
    scheduledTimeStr = String(booking.checkInTime || booking.hotel?.checkInTime || '14:00');
    if (!scheduledDateStr || !isValidIsoCalendarDate(scheduledDateStr)) {
      return {
        canCancel: false,
        reason: 'invalid_date',
        message: 'This booking cannot be cancelled because its scheduled date is missing or invalid.',
        scheduledMoment: null,
      };
    }
    scheduledMoment = parseScheduledMomentToMs(scheduledDateStr, scheduledTimeStr);
  } else if (type === 'experience') {
    scheduledDateStr = String(booking.date || booking.sessionDate || '').slice(0, 10);
    scheduledTimeStr = String(
      booking.time ||
      booking.slotTime ||
      booking.slot?.time ||
      (Array.isArray(booking.experience?.slots) ? booking.experience.slots.find((s) => String(s.date).slice(0, 10) === scheduledDateStr)?.time : '') ||
      '09:00'
    );
    if (!scheduledDateStr || !isValidIsoCalendarDate(scheduledDateStr)) {
      return {
        canCancel: false,
        reason: 'invalid_date',
        message: 'This booking cannot be cancelled because its scheduled date is missing or invalid.',
        scheduledMoment: null,
      };
    }
    scheduledMoment = parseScheduledMomentToMs(scheduledDateStr, scheduledTimeStr);
  } else if (type === 'trip' || type === 'package') {
    const moments = [];
    const day1 = booking.itinerary?.day1;
    if (day1?.transport?.pickupAt) {
      const ms = parseScheduledMomentToMs(day1.transport.pickupAt, '10:00');
      if (ms) moments.push(ms);
    }
    if (day1?.flight?.departureAt) {
      const ms = parseScheduledMomentToMs(day1.flight.departureAt, '10:00');
      if (ms) moments.push(ms);
    }
    if (day1?.hotel?.checkInDate) {
      const hotelCheckInTime = day1.hotel.checkInTime || '14:00';
      const ms = parseScheduledMomentToMs(day1.hotel.checkInDate, hotelCheckInTime);
      if (ms) moments.push(ms);
    }
    if (Array.isArray(booking.itinerary?.days)) {
      for (const d of booking.itinerary.days) {
        if (Array.isArray(d.experiences)) {
          for (const e of d.experiences) {
            if (e.startsAt) {
              const ms = parseScheduledMomentToMs(e.startsAt, '09:00');
              if (ms) moments.push(ms);
            }
          }
        }
      }
    }
    if (moments.length === 0) {
      const fallbackDate = String(booking.startDate || booking.checkIn || booking.date || '').slice(0, 10);
      if (fallbackDate && isValidIsoCalendarDate(fallbackDate)) {
        const ms = parseScheduledMomentToMs(fallbackDate, '10:00');
        if (ms) moments.push(ms);
      }
    }

    if (moments.length === 0) {
      return {
        canCancel: false,
        reason: 'invalid_date',
        message: 'This booking cannot be cancelled because its scheduled date is missing or invalid.',
        scheduledMoment: null,
      };
    }

    scheduledMoment = Math.min(...moments);
  } else {
    const fallbackDate = String(booking.checkIn || booking.date || booking.startDate || '').slice(0, 10);
    if (!fallbackDate || !isValidIsoCalendarDate(fallbackDate)) {
      return {
        canCancel: false,
        reason: 'invalid_date',
        message: 'This booking cannot be cancelled because its scheduled date is missing or invalid.',
        scheduledMoment: null,
      };
    }
    scheduledMoment = parseScheduledMomentToMs(fallbackDate, '12:00');
  }

  if (!scheduledMoment) {
    return {
      canCancel: false,
      reason: 'invalid_date',
      message: 'This booking cannot be cancelled because its scheduled date is missing or invalid.',
      scheduledMoment: null,
    };
  }

  const nowMs = typeof now === 'number' ? now : (now instanceof Date ? now.getTime() : Date.now());

  if (scheduledMoment <= nowMs) {
    return {
      canCancel: false,
      reason: 'date_passed',
      message: 'This booking can no longer be cancelled because its scheduled date has passed.',
      scheduledMoment,
      scheduledDateStr,
      scheduledTimeStr,
    };
  }

  return {
    canCancel: true,
    reason: 'eligible',
    message: '',
    scheduledMoment,
    scheduledDateStr,
    scheduledTimeStr,
  };
}

export function isBookingCancellationEligible(booking, bookingType, now) {
  return getBookingCancellationEligibility(booking, bookingType, now).canCancel;
}

