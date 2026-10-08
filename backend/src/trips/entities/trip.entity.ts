import { StructuredItinerary } from '../../common/entities/itinerary.entity';

export enum TripStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  STARTED = 'started',
  COMPLETED = 'completed',
}

export enum TripTrackingStatus {
  NOT_STARTED = 'not_started',
  ONGOING = 'ongoing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

export class Trip {
  id!: string;
  travellerId!: string;
  planId!: string;
  guideId?: string;
  status!: TripStatus;
  itinerary!: StructuredItinerary;
  totalAmount!: number;
  currentDay!: number;
  currentStop!: string;
  currentLocation!: string;
  trackingStatus!: TripTrackingStatus;
  progressPercentage!: number;
  lastUpdatedAt!: string;
}
