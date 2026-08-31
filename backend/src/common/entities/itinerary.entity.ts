export enum ItineraryItemStatus {
  PLANNED = 'planned',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export class ItineraryFlight {
  id!: string;
  airline!: string;
  flightNumber!: string;
  fromAirport!: string;
  toAirport!: string;
  departureAt!: string;
  arrivalAt!: string;
  status!: ItineraryItemStatus;
  description?: string;
}

export class ItineraryTransport {
  id!: string;
  provider!: string;
  vehicleType!: string;
  pickupLocation!: string;
  dropoffLocation!: string;
  pickupAt!: string;
  status!: ItineraryItemStatus;
  description?: string;
}

export class ItineraryHotel {
  id!: string;
  hotelId!: string;
  name!: string;
  checkInDate!: string;
  checkOutDate!: string;
  roomType!: string;
  status!: ItineraryItemStatus;
  description?: string;
}

export class ItineraryExperience {
  id!: string;
  experienceId!: string;
  title!: string;
  location!: string;
  startsAt!: string;
  endsAt!: string;
  status!: ItineraryItemStatus;
  description?: string;
}

export class DayOneItinerary {
  flight?: ItineraryFlight | null;
  transport!: ItineraryTransport;
  hotel!: ItineraryHotel;
}

export class ExperienceDayItinerary {
  dayNumber!: number;
  experiences!: ItineraryExperience[];
}

export class StructuredItinerary {
  day1!: DayOneItinerary;
  days!: ExperienceDayItinerary[];
}
