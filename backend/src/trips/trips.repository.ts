import { Injectable } from '@nestjs/common';
import { normalizeStructuredItinerary } from '../common/utils/itinerary-mapper';
import { createId } from '../common/utils/id';
import { stripUndefined } from '../common/utils/strip-undefined';
import { Trip, TripStatus, TripTrackingStatus } from './entities/trip.entity';
import { loadSeedData } from '../common/utils/seed-loader';

@Injectable()
export class TripsRepository {
  private trips: Trip[] = loadSeedData<Trip>('trips.json');

  create(data: Omit<Trip, 'id'> & { id?: string }): Trip {
    if (data.id) {
      const existing = this.findById(data.id);
      if (existing) return existing;
    }

    const trip: Trip = {
      id: data.id || createId(),
      travellerId: data.travellerId,
      planId: data.planId,
      guideId: data.guideId,
      status: data.status || TripStatus.CONFIRMED,
      itinerary: data.itinerary,
      travellers: data.travellers,
      totalAmount: data.totalAmount,
      createdAt: data.createdAt ?? new Date().toISOString(),
      currentDay: data.currentDay ?? 1,
      currentStop: data.currentStop ?? 'Not started',
      currentLocation: data.currentLocation ?? '',
      trackingStatus: data.trackingStatus ?? TripTrackingStatus.NOT_STARTED,
      progressPercentage: data.progressPercentage ?? 0,
      lastUpdatedAt: data.lastUpdatedAt ?? new Date().toISOString(),
      startDate: data.startDate,
      endDate: data.endDate,
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
    const normalized = String(travellerId).trim().toLowerCase();
    const isAnjali =
      normalized === 't001' ||
      normalized === '20001' ||
      normalized === 'trav-usr-20001';

    return this.trips.filter((trip) => {
      const tripTraveller = String(trip.travellerId).trim().toLowerCase();
      if (tripTraveller === normalized) return true;
      if (
        isAnjali &&
        (tripTraveller === '20001' ||
          tripTraveller === 't001' ||
          tripTraveller === 'trav-usr-20001')
      ) {
        return true;
      }
      return false;
    });
  }

  findByGuide(guideId: string): Trip[] {
    return this.trips.filter((trip) => trip.guideId === guideId);
  }

  update(id: string, data: Partial<Trip>): Trip | undefined {
    const index = this.trips.findIndex((trip) => trip.id === id);
    if (index === -1) return undefined;

    const patch = stripUndefined(data);
    this.trips[index] = {
      ...this.trips[index],
      ...patch,
      itinerary: patch.itinerary || this.trips[index].itinerary,
    };

    return this.trips[index];
  }

  clearGuide(id: string): Trip | undefined {
    const index = this.trips.findIndex((trip) => trip.id === id);
    if (index === -1) return undefined;
    const {
      guideId: _guide,
      guideName: _name,
      guidePricePerPerson: _price,
      guideRequestedAt: _at,
      ...rest
    } = this.trips[index];
    this.trips[index] = rest as Trip;
    return this.trips[index];
  }

  delete(id: string): boolean {
    const index = this.trips.findIndex((trip) => trip.id === id);
    if (index === -1) return false;
    this.trips.splice(index, 1);
    return true;
  }
}
