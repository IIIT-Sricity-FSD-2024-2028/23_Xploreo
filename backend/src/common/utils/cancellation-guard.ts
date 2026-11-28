import { BadRequestException } from '@nestjs/common';

/**
 * Validates that a string is a strict YYYY-MM-DD calendar date with real calendar day bounds.
 */
export function isValidCalendarDate(value: unknown): boolean {
  const str = String(value ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return (
    parsed.getUTCFullYear() === y &&
    parsed.getUTCMonth() === m - 1 &&
    parsed.getUTCDate() === d
  );
}

/**
 * Parses a date string and optional time string into UTC epoch milliseconds
 * in Indian Standard Time (IST, UTC+05:30).
 * Returns null if the date is invalid or missing.
 */
export function parseScheduledMomentToMs(
  dateStr?: string | null,
  timeStr: string = '00:00',
): number | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str) return null;

  if (str.includes('T')) {
    const datePart = str.slice(0, 10);
    if (!isValidCalendarDate(datePart)) return null;
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
  if (!isValidCalendarDate(datePart)) return null;

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
 * Resolves the scheduled start epoch millisecond for a booking or trip.
 */
export function getBookingScheduledMoment(
  booking: any,
  bookingType: 'hotel' | 'experience' | 'trip',
): { scheduledMoment: number | null; error?: string } {
  if (!booking || typeof booking !== 'object') {
    return { scheduledMoment: null, error: 'invalid_booking' };
  }

  if (bookingType === 'hotel') {
    const dateStr = String(booking.checkIn || booking.checkInDate || booking.date || '').slice(0, 10);
    const timeStr = String(booking.checkInTime || booking.hotel?.checkInTime || '14:00');
    if (!dateStr || !isValidCalendarDate(dateStr)) {
      return { scheduledMoment: null, error: 'invalid_date' };
    }
    const scheduledMoment = parseScheduledMomentToMs(dateStr, timeStr);
    return scheduledMoment ? { scheduledMoment } : { scheduledMoment: null, error: 'invalid_date' };
  }

  if (bookingType === 'experience') {
    const dateStr = String(booking.date || booking.sessionDate || '').slice(0, 10);
    const timeStr = String(
      booking.time ||
      booking.slotTime ||
      booking.slot?.time ||
      (Array.isArray(booking.experience?.slots)
        ? booking.experience.slots.find((s: any) => String(s.date).slice(0, 10) === dateStr)?.time
        : '') ||
      '09:00',
    );
    if (!dateStr || !isValidCalendarDate(dateStr)) {
      return { scheduledMoment: null, error: 'invalid_date' };
    }
    const scheduledMoment = parseScheduledMomentToMs(dateStr, timeStr);
    return scheduledMoment ? { scheduledMoment } : { scheduledMoment: null, error: 'invalid_date' };
  }

  if (bookingType === 'trip') {
    const moments: number[] = [];
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
      if (fallbackDate && isValidCalendarDate(fallbackDate)) {
        const ms = parseScheduledMomentToMs(fallbackDate, '10:00');
        if (ms) moments.push(ms);
      }
    }

    if (moments.length === 0) {
      return { scheduledMoment: null, error: 'invalid_date' };
    }

    return { scheduledMoment: Math.min(...moments) };
  }

  return { scheduledMoment: null, error: 'invalid_type' };
}

/**
 * Asserts that a booking is eligible for cancellation by a traveller.
 * Throws BadRequestException if ineligible.
 */
export function assertBookingCancellationEligible(
  booking: any,
  bookingType: 'hotel' | 'experience' | 'trip',
  now: Date | number = new Date(),
): void {
  if (!booking || typeof booking !== 'object') {
    throw new BadRequestException('This booking cannot be cancelled because its details are invalid.');
  }

  const rawStatus = String(booking.status || '').toLowerCase();

  if (rawStatus === 'cancelled') {
    throw new BadRequestException(
      bookingType === 'trip' ? 'Trip is already cancelled.' : 'Booking is already cancelled.',
    );
  }

  if (
    rawStatus === 'checked_in' ||
    rawStatus === 'checked_out' ||
    rawStatus === 'started' ||
    rawStatus === 'completed'
  ) {
    if (bookingType === 'trip') {
      throw new BadRequestException(`Cannot cancel a trip that is already ${booking.status}.`);
    }
    const displayStatus = rawStatus === 'checked_in' ? 'CHECKED_IN' : rawStatus === 'checked_out' ? 'CHECKED_OUT' : rawStatus.replace('_', ' ');
    throw new BadRequestException(`Cannot cancel a booking that is ${displayStatus}.`);
  }

  const { scheduledMoment, error } = getBookingScheduledMoment(booking, bookingType);
  if (error || scheduledMoment === null) {
    throw new BadRequestException(
      'This booking cannot be cancelled because its scheduled date is missing or invalid.',
    );
  }

  const nowMs = typeof now === 'number' ? now : (now instanceof Date ? now.getTime() : Date.now());

  if (scheduledMoment <= nowMs) {
    throw new BadRequestException(
      'This booking can no longer be cancelled because its scheduled date has passed.',
    );
  }
}
