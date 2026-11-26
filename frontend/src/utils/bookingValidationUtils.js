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
