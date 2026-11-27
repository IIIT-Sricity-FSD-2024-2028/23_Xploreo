import { StructuredItinerary } from '../common/entities/itinerary.entity';
import { Hotel } from '../hotels/entities/hotel.entity';
import { RoomType } from '../hotels/entities/room-type.entity';
import { Experience, ExperienceAvailability } from '../experiences/entities/experience.entity';

// Package inventory rules shared by plan create/update (PlansService) and package booking
// (TripsService). A package is one partner hotel (day1.hotel) plus experiences on days 2+.

export interface InventoryLookups {
  findHotel(id: string): Hotel | undefined;
  roomTypesFor(hotelId: string): RoomType[];
  findExperience(id: string): Experience | undefined;
}

/** Guests already holding a package booking (an active trip) on some of the same inventory. */
export interface BookedPackageTrip {
  itinerary: StructuredItinerary;
  travellers?: number;
}

export interface CapacityLimit {
  kind: 'hotel' | 'experience';
  id: string;
  name: string;
  date?: string;
  capacity: number | null;
  basis: string;
}

export interface PackageCapacity {
  maxGuests: number | null;
  bookable: boolean;
  issues: string[];
  limits: CapacityLimit[];
}

const norm = (value: unknown) => String(value ?? '').trim().toLowerCase();
const dayOf = (value: unknown) => /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? ''))?.[1];
const todayIso = () => new Date().toISOString().slice(0, 10);

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const allExperiences = (itinerary: StructuredItinerary) =>
  (itinerary?.days ?? []).flatMap((day) => day.experiences ?? []);

/**
 * Problems that make a package's itinerary invalid or unbookable: dates, and whether its hotel,
 * room type and experiences exist, are active and belong to the package destination.
 * Returns [] when everything checks out.
 */
export function findItineraryProblems(
  itinerary: StructuredItinerary,
  destination: string,
  lookups: InventoryLookups,
  options: { requireKnownRoomType?: boolean; requireFutureDates?: boolean } = {},
): string[] {
  const problems: string[] = [];
  const hotelRef = itinerary?.day1?.hotel;
  if (!hotelRef?.hotelId) {
    return ['The package has no partner hotel.'];
  }

  const checkIn = hotelRef.checkInDate;
  const checkOut = hotelRef.checkOutDate;
  const datesValid = isCalendarDate(checkIn) && isCalendarDate(checkOut);
  if (!datesValid) {
    problems.push('Hotel check-in and check-out must be valid dates (YYYY-MM-DD).');
  } else {
    if (checkOut <= checkIn) problems.push('Hotel check-out must be after check-in.');
    if (options.requireFutureDates && checkIn < todayIso()) {
      problems.push(`The package starts on ${checkIn}, which is in the past.`);
    }
  }

  const hotel = lookups.findHotel(hotelRef.hotelId);
  if (!hotel) {
    problems.push(`Hotel ${hotelRef.hotelId} does not exist.`);
  } else {
    if (hotel.status !== 'active') problems.push(`Hotel "${hotel.name}" is currently ${hotel.status}.`);
    if (norm(hotel.city) !== norm(destination)) {
      problems.push(`Hotel "${hotel.name}" is in ${hotel.city}, not ${destination}.`);
    }
    if (options.requireKnownRoomType) {
      const types = lookups.roomTypesFor(hotel.id);
      const match = types.find((r) => norm(r.type) === norm(hotelRef.roomType));
      if (types.length > 0 && !match) {
        problems.push(`Room type "${hotelRef.roomType}" is not offered by "${hotel.name}".`);
      } else if (match?.status === 'inactive') {
        problems.push(`Room type "${match.type}" at "${hotel.name}" is currently unavailable.`);
      }
    }
  }

  for (const ref of allExperiences(itinerary)) {
    const experience = lookups.findExperience(ref.experienceId);
    const label = experience?.title || ref.title || ref.experienceId;
    if (!experience) {
      problems.push(`Experience ${ref.experienceId} does not exist.`);
      continue;
    }
    if (experience.availability !== ExperienceAvailability.AVAILABLE) {
      problems.push(`Experience "${label}" is currently unavailable.`);
    }
    if (norm(experience.destination) !== norm(destination)) {
      problems.push(`Experience "${label}" is in ${experience.destination}, not ${destination}.`);
    }
    const startsMs = Date.parse(String(ref.startsAt));
    const endsMs = Date.parse(String(ref.endsAt));
    const date = dayOf(ref.startsAt);
    if (!date || Number.isNaN(startsMs) || Number.isNaN(endsMs)) {
      problems.push(`Experience "${label}" needs a valid start and end date-time.`);
      continue;
    }
    if (endsMs <= startsMs) problems.push(`Experience "${label}" must end after it starts.`);
    if (datesValid && (date < checkIn || date > checkOut)) {
      problems.push(`Experience "${label}" on ${date} falls outside the hotel stay (${checkIn} to ${checkOut}).`);
    }
    if (experience.slots?.length) {
      const slot = experience.slots.find((s) => dayOf(s.date) === date);
      if (!slot) problems.push(`Experience "${label}" has no session scheduled on ${date}.`);
      else if (!slot.available) problems.push(`The ${date} session of "${label}" is not available.`);
    }
  }

  return problems;
}

const ACTIVE_TRIP_GUESTS = (trip: BookedPackageTrip) => Math.max(1, Number(trip.travellers) || 1);

function staysOverlap(aIn: string, aOut: string, bIn?: string, bOut?: string): boolean {
  if (!bIn || !bOut) return false;
  return aIn < bOut && bIn < aOut;
}

/**
 * Maximum guests a package booking can take right now: the smallest remaining capacity of its
 * hotel and of each of its experience sessions, after guests of other active package trips on the
 * same inventory and dates. maxGuests is null when no resource publishes capacity data.
 *
 * Hotel capacity = maxOccupancy x availableRooms of the package's room type (the hotel booking
 * model). If the package names a room type the hotel does not offer, the hotel's active room types
 * are summed instead. Experience capacity = seats left in the session on the experience's date
 * (slot.capacity - slot.booked), or experience.capacity when it has no sessions.
 */
export function computePackageCapacity(
  itinerary: StructuredItinerary,
  destination: string,
  lookups: InventoryLookups,
  otherTrips: BookedPackageTrip[],
): PackageCapacity {
  const issues = findItineraryProblems(itinerary, destination, lookups, { requireFutureDates: true });
  const limits: CapacityLimit[] = [];
  const hotelRef = itinerary?.day1?.hotel;
  const hotel = hotelRef?.hotelId ? lookups.findHotel(hotelRef.hotelId) : undefined;

  if (hotel && hotelRef) {
    const types = lookups.roomTypesFor(hotel.id).filter((r) => r.status !== 'inactive');
    const match = types.find((r) => norm(r.type) === norm(hotelRef.roomType));
    let capacity: number | null = null;
    let basis = 'The hotel publishes no room-type capacity.';
    if (match) {
      capacity = Math.max(0, match.maxOccupancy * match.availableRooms);
      basis = `${match.availableRooms} "${match.type}" room(s) available × ${match.maxOccupancy} guest(s) per room`;
    } else if (types.length > 0) {
      capacity = types.reduce((sum, r) => sum + Math.max(0, r.maxOccupancy * r.availableRooms), 0);
      basis = `All available room types (the package room type "${hotelRef.roomType}" is not offered by the hotel)`;
    }
    if (capacity !== null) {
      const held = otherTrips
        .filter(
          (t) =>
            t.itinerary?.day1?.hotel?.hotelId === hotel.id &&
            staysOverlap(
              hotelRef.checkInDate,
              hotelRef.checkOutDate,
              dayOf(t.itinerary.day1.hotel.checkInDate),
              dayOf(t.itinerary.day1.hotel.checkOutDate),
            ),
        )
        .reduce((sum, t) => sum + ACTIVE_TRIP_GUESTS(t), 0);
      if (held > 0) basis += `, minus ${held} guest(s) on other package bookings for overlapping dates`;
      capacity = Math.max(0, capacity - held);
    }
    limits.push({ kind: 'hotel', id: hotel.id, name: hotel.name, capacity, basis });
  }

  for (const ref of allExperiences(itinerary)) {
    const experience = lookups.findExperience(ref.experienceId);
    if (!experience) continue;
    const date = dayOf(ref.startsAt);
    let capacity: number | null = null;
    let basis = 'The experience publishes no capacity.';
    if (experience.slots?.length) {
      const slot = experience.slots.find((s) => dayOf(s.date) === date);
      if (slot) {
        capacity = slot.available ? Math.max(0, slot.capacity - (slot.booked ?? 0)) : 0;
        basis = `Session on ${date}: ${slot.capacity} seat(s), ${slot.booked ?? 0} already booked`;
      } else {
        capacity = 0;
        basis = `No session scheduled on ${date}`;
      }
    } else if (Number(experience.capacity) > 0) {
      capacity = Number(experience.capacity);
      basis = 'Experience capacity (no sessions scheduled)';
    }
    if (capacity !== null) {
      const held = otherTrips
        .filter((t) =>
          allExperiences(t.itinerary).some(
            (e) => e.experienceId === experience.id && dayOf(e.startsAt) === date,
          ),
        )
        .reduce((sum, t) => sum + ACTIVE_TRIP_GUESTS(t), 0);
      if (held > 0) basis += `, minus ${held} guest(s) on other package bookings`;
      capacity = Math.max(0, capacity - held);
    }
    limits.push({ kind: 'experience', id: experience.id, name: experience.title, date, capacity, basis });
  }

  const known = limits.map((l) => l.capacity).filter((c): c is number => c !== null);
  const maxGuests = known.length > 0 ? Math.min(...known) : null;
  if (maxGuests === null) {
    issues.push('Capacity information is not available for this package.');
  } else if (maxGuests < 1) {
    issues.push('This package has no remaining capacity on its dates.');
  }

  return { maxGuests, bookable: issues.length === 0, issues, limits };
}
