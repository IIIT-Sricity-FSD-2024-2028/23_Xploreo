import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StructuredItinerary } from '../common/entities/itinerary.entity';
import { mergeStructuredItineraryPatch } from '../common/utils/itinerary-mapper';
import { PlansRepository } from '../plans/plans.repository';
import { BookingsRepository } from '../bookings/bookings.repository';
import { ExperienceBookingsRepository } from '../experience-bookings/experience-bookings.repository';
import { HotelsRepository } from '../hotels/hotels.repository';
import { ExperiencesRepository } from '../experiences/experiences.repository';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripTrackingDto } from './dto/update-trip-tracking.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Trip, TripStatus, TripTrackingStatus } from './entities/trip.entity';
import { TripsRepository } from './trips.repository';

@Injectable()
export class TripsService {
  constructor(
    private readonly tripsRepository: TripsRepository,
    private readonly plansRepository: PlansRepository,
    private readonly bookingsRepository: BookingsRepository,
    private readonly experienceBookingsRepository: ExperienceBookingsRepository,
    private readonly hotelsRepository: HotelsRepository,
    private readonly experiencesRepository: ExperiencesRepository,
  ) {}

  create(dto: CreateTripDto) {
    const plan = this.plansRepository.findById(dto.planId);
    if (!plan) throw new NotFoundException(`Plan ${dto.planId} not found`);

    const itinerary = dto.itinerary || plan.itinerary;

    const trip = this.tripsRepository.create({
      id: dto.id,
      travellerId: dto.travellerId,
      planId: dto.planId,
      status: TripStatus.DRAFT,
      itinerary,
      totalAmount: this.calculateTotalAmount(itinerary, plan.pricePerPerson),
      currentDay: 1,
      currentStop: 'Not started',
      currentLocation:
        itinerary.day1?.transport?.pickupLocation || plan.originCity,
      trackingStatus: TripTrackingStatus.NOT_STARTED,
      progressPercentage: 0,
      lastUpdatedAt: new Date().toISOString(),
    });

    // Create hotel booking entries
    if (itinerary?.day1?.hotel?.hotelId) {
      const hotelId = itinerary.day1.hotel.hotelId;
      const hotel = this.hotelsRepository.findById(hotelId);
      const checkIn =
        itinerary.day1.hotel.checkInDate ||
        new Date().toISOString().slice(0, 10);
      const checkOut =
        itinerary.day1.hotel.checkOutDate ||
        new Date(Date.now() + 86400000 * (plan.durationNights || 1))
          .toISOString()
          .slice(0, 10);
      const nights = plan.durationNights || 1;
      const totalAmount = hotel
        ? nights * (hotel.pricePerNight + hotel.taxesAndFees)
        : 18000;

      this.bookingsRepository.create({
        hotelId,
        travellerId: dto.travellerId,
        guestName: `Traveller ${dto.travellerId}`,
        email: `${dto.travellerId}@xploreo.com`,
        phone: '+91 9876543210',
        checkIn,
        checkOut,
        guests: 2,
        roomType: itinerary.day1.hotel.roomType || 'Standard Room',
        notes: `Booked via Package: ${plan.title}`,
        totalAmount,
      });

      if (hotel && hotel.availableRooms > 0) {
        this.hotelsRepository.update(hotel.id, {
          availableRooms: hotel.availableRooms - 1,
        });
      }
    }

    // Create experience booking entries
    if (Array.isArray(itinerary?.days)) {
      for (const day of itinerary.days) {
        if (Array.isArray(day.experiences)) {
          for (const exp of day.experiences) {
            if (exp.experienceId) {
              const experience = this.experiencesRepository.findById(
                exp.experienceId,
              );
              const date =
                exp.startsAt?.split('T')[0] ||
                new Date().toISOString().slice(0, 10);
              const totalAmount = experience ? experience.price * 2 : 3500;

              this.experienceBookingsRepository.create({
                experienceId: exp.experienceId,
                travellerId: dto.travellerId,
                guestName: `Traveller ${dto.travellerId}`,
                email: `${dto.travellerId}@xploreo.com`,
                phone: '+91 9876543210',
                date,
                time: exp.startsAt?.includes('T')
                  ? exp.startsAt.split('T')[1]?.slice(0, 5)
                  : '10:00',
                participants: 2,
                totalAmount,
              });

              if (experience) {
                this.experiencesRepository.update(experience.id, {
                  booked: (experience.booked || 0) + 2,
                });
              }
            }
          }
        }
      }
    }

    return trip;
  }

  findAll() {
    return this.tripsRepository.findAll();
  }

  findOne(id: string) {
    const trip = this.tripsRepository.findById(id);
    if (!trip) throw new NotFoundException(`Trip ${id} not found`);
    return trip;
  }

  findByTraveller(travellerId: string) {
    return this.tripsRepository.findByTraveller(travellerId);
  }

  findByGuide(guideId: string) {
    return this.tripsRepository.findByGuide(guideId);
  }

  update(
    id: string,
    dto: UpdateTripDto,
    actor?: { userId?: string; role?: string },
  ) {
    const trip = this.findOne(id);
    const plan = this.plansRepository.findById(trip.planId);
    if (!plan) throw new NotFoundException(`Plan ${trip.planId} not found`);

    if (dto.status) {
      this.assertStatusTransition(trip, dto.status, actor);
    }

    if (
      dto.guideId &&
      actor?.role === 'guide' &&
      dto.guideId !== actor.userId
    ) {
      throw new ForbiddenException('Guide can only assign their own guideId');
    }

    const itinerary = dto.itinerary
      ? mergeStructuredItineraryPatch(trip.itinerary, dto.itinerary)
      : trip.itinerary;

    const updated = this.tripsRepository.update(id, {
      guideId: dto.guideId ?? trip.guideId,
      status: dto.status ?? trip.status,
      itinerary,
      totalAmount:
        dto.totalAmount ??
        this.calculateTotalAmount(itinerary, plan.pricePerPerson),
    });

    if (!updated) throw new NotFoundException(`Trip ${id} not found`);
    return updated;
  }

  assignGuide(tripId: string, guideId: string): Trip {
    const trip = this.findOne(tripId);
    const updated = this.tripsRepository.update(trip.id, {
      guideId,
      status: TripStatus.CONFIRMED,
    });
    if (!updated) throw new NotFoundException(`Trip ${tripId} not found`);
    return updated;
  }

  updateTracking(
    id: string,
    dto: UpdateTripTrackingDto,
    actor?: { userId?: string; role?: string },
  ) {
    const trip = this.findOne(id);
    const role = actor?.role;
    const isAdmin = role === 'superadmin' || role === 'nontechadmin';
    const isAssignedGuide = role === 'guide' && trip.guideId === actor?.userId;

    if (!isAdmin && !isAssignedGuide) {
      throw new ForbiddenException(
        'Only the assigned guide can update tracking',
      );
    }

    const trackingStatus = dto.trackingStatus ?? trip.trackingStatus;
    const progressPercentage =
      trackingStatus === TripTrackingStatus.COMPLETED
        ? 100
        : (dto.progressPercentage ?? trip.progressPercentage);

    const status =
      trackingStatus === TripTrackingStatus.COMPLETED
        ? TripStatus.COMPLETED
        : trackingStatus === TripTrackingStatus.ONGOING
          ? TripStatus.STARTED
          : trip.status;

    const updated = this.tripsRepository.update(id, {
      status,
      currentDay: dto.currentDay ?? trip.currentDay,
      currentStop: dto.currentStop ?? trip.currentStop,
      currentLocation: dto.currentLocation ?? trip.currentLocation,
      trackingStatus,
      progressPercentage,
      lastUpdatedAt: new Date().toISOString(),
    });

    if (!updated) throw new NotFoundException(`Trip ${id} not found`);
    return updated;
  }

  experienceExistsOnTrip(tripId: string, experienceId: string): boolean {
    const trip = this.findOne(tripId);
    return trip.itinerary.days.some((day) =>
      day.experiences.some(
        (experience) => experience.experienceId === experienceId,
      ),
    );
  }

  remove(id: string) {
    const deleted = this.tripsRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Trip ${id} not found`);
    return { message: `Trip ${id} deleted` };
  }

  private calculateTotalAmount(
    itinerary: StructuredItinerary,
    basePrice: number,
  ): number {
    const flightAmount = itinerary.day1.flight ? 12000 : 0;
    const hotelAmount = itinerary.day1.hotel ? 18000 : 0;
    const experienceAmount = itinerary.days.reduce(
      (sum, day) => sum + day.experiences.length * 3500,
      0,
    );

    return Math.max(basePrice, flightAmount + hotelAmount + experienceAmount);
  }

  private assertStatusTransition(
    trip: Trip,
    status: TripStatus,
    actor?: { userId?: string; role?: string },
  ) {
    if (status === trip.status) return;

    const allowedTransitions: Record<TripStatus, TripStatus[]> = {
      [TripStatus.DRAFT]: [TripStatus.CONFIRMED],
      [TripStatus.CONFIRMED]: [TripStatus.STARTED],
      [TripStatus.STARTED]: [TripStatus.COMPLETED],
      [TripStatus.COMPLETED]: [],
    };

    if (!allowedTransitions[trip.status].includes(status)) {
      throw new BadRequestException(
        `Invalid trip status transition from ${trip.status} to ${status}`,
      );
    }

    if (
      status === TripStatus.CONFIRMED &&
      (actor?.role === 'traveller' || actor?.role === 'TRAVELLER')
    ) {
      if (trip.travellerId !== actor.userId) {
        throw new ForbiddenException(
          'Traveller can only confirm their own trip',
        );
      }
      return;
    }

    if (status === TripStatus.STARTED || status === TripStatus.COMPLETED) {
      if (actor?.role !== 'guide') {
        throw new ForbiddenException('Only guides can progress assigned trips');
      }
      if (!trip.guideId || trip.guideId !== actor.userId) {
        throw new ForbiddenException('Guide is not assigned to this trip');
      }
    }
  }
}
