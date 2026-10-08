import { Injectable } from '@nestjs/common';
import { normalizeStructuredItinerary } from '../common/utils/itinerary-mapper';
import { createId } from '../common/utils/id';
import { Trip, TripStatus, TripTrackingStatus } from './entities/trip.entity';

@Injectable()
export class TripsRepository {
  private trips: Trip[] = [
    {
      id: 'trip-kerala-1',
      travellerId: '20001',
      planId: 'plan-1',
      guideId: '10001',
      status: TripStatus.CONFIRMED,
      itinerary: normalizeStructuredItinerary(
        [
          {
            day: 'Day 1',
            title: 'Arrival in Kochi',
            detail: 'Transfer to Alleppey and check in to houseboat.',
          },
          {
            day: 'Day 2',
            title: 'Backwater Cruise',
            detail: 'Full day cruise through the canals.',
          },
        ],
        {
          idPrefix: 'trip-kerala-1',
          originCity: 'Bangalore',
          destination: 'Alleppey',
          startDate: '2026-05-12',
          endDate: '2026-05-17',
          includesFlight: true,
          hotelStars: 4,
        },
      ),
      totalAmount: 47000,
      currentDay: 1,
      currentStop: 'Not started',
      currentLocation: 'Bangalore',
      trackingStatus: TripTrackingStatus.NOT_STARTED,
      progressPercentage: 0,
      lastUpdatedAt: new Date().toISOString(),
    },
    {
      id: 'trip-jaipur-1',
      travellerId: '20002',
      planId: 'plan-2',
      guideId: '10001',
      status: TripStatus.STARTED,
      itinerary: normalizeStructuredItinerary(
        [
          {
            day: 'Day 1',
            title: 'Jaipur Arrival',
            detail: 'Check in and visit City Palace.',
          },
          {
            day: 'Day 2',
            title: 'Amber Fort',
            detail: 'Explore the grand Amber Fort.',
          },
        ],
        {
          idPrefix: 'trip-jaipur-1',
          originCity: 'Delhi',
          destination: 'Jaipur',
          startDate: '2026-05-18',
          endDate: '2026-05-25',
          includesFlight: false,
          hotelStars: 5,
        },
      ),
      totalAmount: 38500,
      currentDay: 1,
      currentStop: 'Jaipur Arrival',
      currentLocation: 'Jaipur',
      trackingStatus: TripTrackingStatus.ONGOING,
      progressPercentage: 25,
      lastUpdatedAt: new Date().toISOString(),
    },
    {
      id: 'trip-kerala-completed',
      travellerId: '20003',
      planId: 'plan-1',
      guideId: '10001',
      status: TripStatus.COMPLETED,
      itinerary: normalizeStructuredItinerary(
        [
          {
            day: 'Day 1',
            title: 'Arrival in Kochi',
            detail: 'Transfer to Alleppey and check in to houseboat.',
          },
          {
            day: 'Day 2',
            title: 'Backwater Cruise',
            detail: 'Full day cruise through the canals.',
          },
        ],
        {
          idPrefix: 'trip-kerala-completed',
          originCity: 'Bangalore',
          destination: 'Alleppey',
          startDate: '2026-04-12',
          endDate: '2026-04-17',
          includesFlight: true,
          hotelStars: 4,
        },
      ),
      totalAmount: 47000,
      currentDay: 2,
      currentStop: 'Completed',
      currentLocation: 'Alleppey',
      trackingStatus: TripTrackingStatus.COMPLETED,
      progressPercentage: 100,
      lastUpdatedAt: new Date().toISOString(),
    },
    {
      id: 'trip-guide-request-1',
      travellerId: '20004',
      planId: 'plan-1',
      status: TripStatus.DRAFT,
      itinerary: normalizeStructuredItinerary(
        [
          {
            day: 'Day 1',
            title: 'Arrival in Kochi',
            detail: 'Transfer to Alleppey and check in to houseboat.',
          },
          {
            day: 'Day 2',
            title: 'Backwater Cruise',
            detail: 'Full day cruise through the canals.',
          },
        ],
        {
          idPrefix: 'trip-guide-request-1',
          originCity: 'Bangalore',
          destination: 'Alleppey',
          startDate: '2026-06-03',
          endDate: '2026-06-08',
          includesFlight: true,
          hotelStars: 4,
        },
      ),
      totalAmount: 47000,
      currentDay: 1,
      currentStop: 'Not started',
      currentLocation: 'Bangalore',
      trackingStatus: TripTrackingStatus.NOT_STARTED,
      progressPercentage: 0,
      lastUpdatedAt: new Date().toISOString(),
    },
  ];

  create(data: Omit<Trip, 'id'> & { id?: string }): Trip {
    const trip: Trip = {
      id: data.id || createId(),
      travellerId: data.travellerId,
      planId: data.planId,
      guideId: data.guideId,
      status: data.status || TripStatus.DRAFT,
      itinerary: data.itinerary,
      totalAmount: data.totalAmount,
      currentDay: data.currentDay ?? 1,
      currentStop: data.currentStop ?? 'Not started',
      currentLocation: data.currentLocation ?? '',
      trackingStatus: data.trackingStatus ?? TripTrackingStatus.NOT_STARTED,
      progressPercentage: data.progressPercentage ?? 0,
      lastUpdatedAt: data.lastUpdatedAt ?? new Date().toISOString(),
    };

    this.trips.push(trip);
    return trip;
  }

  findAll(): Trip[] {
    return [...this.trips];
  }

  findById(id: string): Trip | undefined {
    return this.trips.find((trip) => trip.id === id);
  }

  findByTraveller(travellerId: string): Trip[] {
    return this.trips.filter((trip) => trip.travellerId === travellerId);
  }

  findByGuide(guideId: string): Trip[] {
    return this.trips.filter((trip) => trip.guideId === guideId);
  }

  update(id: string, data: Partial<Trip>): Trip | undefined {
    const index = this.trips.findIndex((trip) => trip.id === id);
    if (index === -1) return undefined;

    this.trips[index] = {
      ...this.trips[index],
      ...data,
      itinerary: data.itinerary || this.trips[index].itinerary,
    };

    return this.trips[index];
  }

  delete(id: string): boolean {
    const index = this.trips.findIndex((trip) => trip.id === id);
    if (index === -1) return false;
    this.trips.splice(index, 1);
    return true;
  }
}
