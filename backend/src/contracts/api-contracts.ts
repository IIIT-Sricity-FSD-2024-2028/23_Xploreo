export enum AppRole {
  PARTNER = 'PARTNER',
  TRAVELLER_ACTOR = 'TRAVELLER',
  ADMIN = 'ADMIN',
  TECH_ADMIN = 'TECH_ADMIN',
  EXPERIENCE_PARTNER = 'experience',
  SUPERADMIN = 'superadmin',
  TRAVELLER = 'traveller',
  GUIDE = 'guide',
  TECHADMIN = 'techadmin',
  NONTECHADMIN = 'nontechadmin',
  HOTEL = 'hotel',
  EXPERIENCE = 'experience',
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface AppUser {
  id: string;
  username: string;
  role: AppRole;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
}

export interface AuthLoginRequest {
  username: string;
  password: string;
}

export interface AuthLoginResponse {
  user: AppUser;
  headers: {
    'x-user-id': string;
    'x-user-role': AppRole;
  };
}

export interface HotelRecord {
  id: string;
  name: string;
  city: string;
  location: string;
  description: string;
  stars: number;
  rating: number;
  reviewCount: number;
  pricePerNight: number;
  taxesAndFees: number;
  image: string;
  amenities: string[];
  status: 'active' | 'inactive';
}

export interface ExperienceSlot {
  id: string;
  date: string;
  time: string;
  booked: number;
  capacity: number;
  available: boolean;
}

export interface ExperienceRecord {
  id: string;
  title: string;
  description: string;
  destination: string;
  category: string;
  availability: 'available' | 'unavailable';
  price: number;
  durationHours: number;
  capacity: number;
  booked: number;
  image: string;
  nextSlot: string;
  slots: ExperienceSlot[];
}

export interface ItineraryFlightRecord {
  id: string;
  airline: string;
  flightNumber: string;
  fromAirport: string;
  toAirport: string;
  departureAt: string;
  arrivalAt: string;
  status: 'planned' | 'confirmed' | 'cancelled';
}

export interface ItineraryTransportRecord {
  id: string;
  provider: string;
  vehicleType: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupAt: string;
  status: 'planned' | 'confirmed' | 'cancelled';
}

export interface ItineraryHotelRecord {
  id: string;
  hotelId: string;
  name: string;
  checkInDate: string;
  checkOutDate: string;
  roomType: string;
  status: 'planned' | 'confirmed' | 'cancelled';
}

export interface ItineraryExperienceRecord {
  id: string;
  experienceId: string;
  title: string;
  location: string;
  startsAt: string;
  endsAt: string;
  status: 'planned' | 'confirmed' | 'cancelled';
}

export interface StructuredItineraryRecord {
  day1: {
    flight?: ItineraryFlightRecord | null;
    transport: ItineraryTransportRecord;
    hotel: ItineraryHotelRecord;
  };
  days: Array<{
    dayNumber: number;
    experiences: ItineraryExperienceRecord[];
  }>;
}

export interface PlanRecord {
  id: string;
  title: string;
  description: string;
  originCity: string;
  destination: string;
  durationNights: number;
  pricePerPerson: number;
  hotelStars: number;
  includesFlight: boolean;
  image: string;
  tags: string[];
  itinerary: StructuredItineraryRecord;
}

export interface TripRecord {
  id: string;
  travellerId: string;
  planId: string;
  guideId?: string;
  status: 'draft' | 'confirmed' | 'started' | 'completed';
  itinerary: StructuredItineraryRecord;
  totalAmount: number;
}

export interface GuideRequestRecord {
  id: string;
  travellerId: string;
  tripId: string;
  experienceId: string;
  guideId?: string;
  status: 'pending' | 'accepted' | 'rejected';
}
