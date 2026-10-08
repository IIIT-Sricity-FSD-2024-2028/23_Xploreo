import { BadRequestException } from '@nestjs/common';
import {
  ItineraryFlight,
  ItineraryHotel,
  ItineraryItemStatus,
  StructuredItinerary,
} from '../entities/itinerary.entity';

type LegacyItineraryItem = {
  day?: string;
  title?: string;
  detail?: string;
};

type ItineraryContext = {
  idPrefix: string;
  originCity?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  includesFlight?: boolean;
  hotelStars?: number;
  airline?: string;
  flightNumber?: string;
  fromAirportCode?: string;
  toAirportCode?: string;
  departureTime?: string;
  arrivalTime?: string;
};

export function normalizeStructuredItinerary(
  value: unknown,
  context: ItineraryContext,
): StructuredItinerary {
  if (isStructuredItinerary(value)) {
    return value;
  }

  const legacyItems = Array.isArray(value)
    ? (value as LegacyItineraryItem[])
    : [];
  return mapLegacyItinerary(legacyItems, context);
}

export function mergeStructuredItineraryPatch(
  current: StructuredItinerary,
  patch: unknown,
): StructuredItinerary {
  if (!isItineraryPatch(patch)) {
    if (patch && typeof patch === 'object' && !Array.isArray(patch)) {
      return current;
    }
    return normalizeStructuredItinerary(patch, {
      idPrefix: current.day1.transport.id,
    });
  }

  const flightPatch = Object.prototype.hasOwnProperty.call(patch, 'flight')
    ? patch.flight
    : patch.day1?.flight;
  const hotelPatch = Object.prototype.hasOwnProperty.call(patch, 'hotel')
    ? patch.hotel
    : patch.day1?.hotel;
  const daysPatch = Object.prototype.hasOwnProperty.call(patch, 'days')
    ? patch.days
    : undefined;

  if (
    flightPatch !== null &&
    flightPatch !== undefined &&
    !isValidFlight(flightPatch)
  ) {
    throw new BadRequestException('Invalid itinerary flight payload');
  }
  if (hotelPatch !== undefined && !isValidHotel(hotelPatch)) {
    throw new BadRequestException('Invalid itinerary hotel payload');
  }
  if (daysPatch !== undefined && !isValidExperienceDays(daysPatch)) {
    throw new BadRequestException('Invalid itinerary days payload');
  }

  return {
    ...current,
    day1: {
      ...current.day1,
      flight: flightPatch === undefined ? current.day1.flight : flightPatch,
      hotel: hotelPatch === undefined ? current.day1.hotel : hotelPatch,
    },
    days: daysPatch === undefined ? current.days : daysPatch,
  };
}

function isItineraryPatch(value: unknown): value is {
  flight?: ItineraryFlight | null;
  hotel?: ItineraryHotel;
  days?: StructuredItinerary['days'];
  day1?: { flight?: ItineraryFlight | null; hotel?: ItineraryHotel };
} {
  if (isStructuredItinerary(value)) {
    return false;
  }

  return Boolean(
    value &&
    typeof value === 'object' &&
    ('flight' in value ||
      'hotel' in value ||
      'days' in value ||
      'day1' in value),
  );
}

function isValidFlight(value: unknown): value is ItineraryFlight {
  if (!value || typeof value !== 'object') return false;
  const flight = value as Record<string, unknown>;
  return (
    [
      'id',
      'airline',
      'flightNumber',
      'fromAirport',
      'toAirport',
      'departureAt',
      'arrivalAt',
      'status',
    ].every((key) => typeof flight[key] === 'string') &&
    !Number.isNaN(new Date(String(flight.departureAt)).getTime()) &&
    !Number.isNaN(new Date(String(flight.arrivalAt)).getTime()) &&
    new Date(String(flight.arrivalAt)).getTime() >
      new Date(String(flight.departureAt)).getTime()
  );
}

function isValidHotel(value: unknown): value is ItineraryHotel {
  if (!value || typeof value !== 'object') return false;
  const hotel = value as Record<string, unknown>;
  return [
    'id',
    'hotelId',
    'name',
    'checkInDate',
    'checkOutDate',
    'roomType',
    'status',
  ].every((key) => typeof hotel[key] === 'string');
}

function isValidExperienceDays(
  value: unknown,
): value is StructuredItinerary['days'] {
  if (!Array.isArray(value)) return false;

  return value.every((day) => {
    if (!day || typeof day !== 'object') return false;
    const record = day as Record<string, unknown>;
    if (typeof record.dayNumber !== 'number' || record.dayNumber < 2)
      return false;
    if (!Array.isArray(record.experiences)) return false;

    return record.experiences.every((experience) => {
      if (!experience || typeof experience !== 'object') return false;
      const exp = experience as Record<string, unknown>;
      return [
        'id',
        'experienceId',
        'title',
        'location',
        'startsAt',
        'endsAt',
        'status',
      ].every((key) => typeof exp[key] === 'string');
    });
  });
}

function isStructuredItinerary(value: unknown): value is StructuredItinerary {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'day1' in value &&
    (value as Record<string, unknown>).day1 &&
    typeof (value as Record<string, unknown>).day1 === 'object' &&
    Array.isArray((value as Record<string, unknown>).days),
  );
}

function mapLegacyItinerary(
  items: LegacyItineraryItem[],
  context: ItineraryContext,
): StructuredItinerary {
  const startDate = context.startDate || new Date().toISOString().slice(0, 10);
  const endDate = context.endDate || startDate;
  const destination = context.destination || 'Destination';
  const originCity = context.originCity || 'Origin';

  const day1Item = items.find((item) => getDayNumber(item.day) === 1);
  const flight = context.includesFlight
    ? {
        id: `${context.idPrefix}-flight-1`,
        airline: context.airline || 'TBD',
        flightNumber: context.flightNumber || 'TBD',
        fromAirport: context.fromAirportCode || originCity,
        toAirport: context.toAirportCode || destination,
        departureAt: context.departureTime
          ? `${startDate}T${context.departureTime}:00.000Z`
          : `${startDate}T09:00:00.000Z`,
        arrivalAt: context.arrivalTime
          ? `${startDate}T${context.arrivalTime}:00.000Z`
          : `${startDate}T11:00:00.000Z`,
        status: ItineraryItemStatus.PLANNED,
        description: `Flight from ${context.fromAirportCode || originCity} to ${context.toAirportCode || destination}`,
      }
    : null;

  const experienceDays = items
    .filter((item) => getDayNumber(item.day) >= 2)
    .reduce<StructuredItinerary['days']>((days, item, index) => {
      const dayNumber = getDayNumber(item.day);
      let dayGroup = days.find((entry) => entry.dayNumber === dayNumber);

      if (!dayGroup) {
        dayGroup = { dayNumber, experiences: [] };
        days.push(dayGroup);
      }

      dayGroup.experiences.push({
        id: `${context.idPrefix}-experience-${index + 1}`,
        experienceId: `${context.idPrefix}-legacy-experience-${index + 1}`,
        title: item.title || `Day ${dayNumber} Experience`,
        location: destination,
        startsAt: `${startDate}T10:00:00.000Z`,
        endsAt: `${startDate}T12:00:00.000Z`,
        status: ItineraryItemStatus.PLANNED,
        description: item.detail,
      });

      return days;
    }, []);

  return {
    day1: {
      flight,
      transport: {
        id: `${context.idPrefix}-transport-1`,
        provider: 'TBD',
        vehicleType: 'TBD',
        pickupLocation: originCity,
        dropoffLocation: destination,
        pickupAt: `${startDate}T11:00:00.000Z`,
        status: ItineraryItemStatus.PLANNED,
        description: day1Item?.detail || 'Arrival and transfer',
      },
      hotel: {
        id: `${context.idPrefix}-hotel-1`,
        hotelId: `${context.idPrefix}-hotel`,
        name: `${destination} ${context.hotelStars || ''} Star Stay`.trim(),
        checkInDate: startDate,
        checkOutDate: endDate,
        roomType: 'Standard Room',
        status: ItineraryItemStatus.PLANNED,
      },
    },
    days: experienceDays,
  };
}

function getDayNumber(day: string | undefined): number {
  const match = String(day || '').match(/\d+/);
  return match ? Number(match[0]) : 1;
}
