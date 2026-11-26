import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GuideApplicationsRepository } from '../guide-applications/guide-applications.repository';
import { GuideRepository } from '../guide/guide.repository';
import { ReviewsRepository } from '../reviews/reviews.repository';
import { ReviewTargetType } from '../reviews/dto/create-review.dto';
import { Trip, TripStatus } from '../trips/entities/trip.entity';
import { findGuideConflicts, tripDateRange, tripEndAt } from '../trips/trip-dates';
import { TripsRepository } from '../trips/trips.repository';
import { ExperienceBookingsRepository } from '../experience-bookings/experience-bookings.repository';
import { ExperienceBookingStatus } from '../experience-bookings/entities/experience-booking.entity';
import { TripsService } from '../trips/trips.service';

type Actor = { userId?: string; role?: string; region?: string };

@Injectable()
export class TripGuidesService {
  constructor(
    private readonly tripsService: TripsService,
    private readonly tripsRepository: TripsRepository,
    private readonly applications: GuideApplicationsRepository,
    private readonly guides: GuideRepository,
    private readonly reviews: ReviewsRepository,
    private readonly experienceBookings: ExperienceBookingsRepository,
  ) {}

  /** Confirmed experience sessions with this guide that fall inside the trip's dates. */
  private busyOnExperience(trip: Trip, guideId: string): boolean {
    const { start, end } = tripDateRange(trip);
    if (!start || !end) return false;
    return this.experienceBookings.findAll().some((b) => {
      const date = String(b.date).slice(0, 10);
      return (
        b.guideId === guideId &&
        b.guideStatus === 'confirmed' &&
        b.status !== ExperienceBookingStatus.CANCELLED &&
        start <= date &&
        date <= end
      );
    });
  }

  /**
   * Guides a traveller may still pick for this trip: approved by the NTA for the trip's plan,
   * not already declined for this trip, and not holding a confirmed trip on overlapping dates.
   */
  availableGuides(tripId: string, actor?: Actor) {
    const trip = this.tripsService.findOne(tripId, actor);
    const allTrips = this.tripsRepository.findAll();
    const declined = new Set(trip.declinedGuideIds ?? []);

    return this.applications
      .findAcceptedByPlan(trip.planId)
      .filter((app) => !declined.has(app.guideId))
      .filter((app) => findGuideConflicts(trip, app.guideId, allTrips).length === 0)
      .filter((app) => !this.busyOnExperience(trip, app.guideId))
      .flatMap((app) => {
        const guide = this.guides.findById(app.guideId);
        if (!guide) return [];
        const { rating, reviewCount } = this.reviews.summaryFor(ReviewTargetType.GUIDE, app.guideId);
        return [
          {
            guideId: guide.userId,
            name: `${guide.fname} ${guide.lname}`.trim(),
            title: guide.prof_title,
            location: guide.location,
            yearsExp: guide.years_exp,
            languages: guide.lang_spoken,
            bio: guide.bio,
            pricePerPerson: app.guidePricePerPerson,
            rating,
            reviewCount,
          },
        ];
      })
      .sort((a, b) => b.rating - a.rating || a.pricePerPerson - b.pricePerPerson);
  }

  requestGuide(tripId: string, guideId: string, actor?: Actor): Trip {
    const trip = this.tripsService.findOne(tripId, actor);
    const endMs = tripEndAt(trip);
    if (typeof endMs === 'number' && endMs < Date.now()) {
      throw new BadRequestException('Cannot request a guide for a past trip');
    }
    const selectable =
      (trip.status === TripStatus.CONFIRMED && !trip.guideId) ||
      trip.status === TripStatus.REJECTED_BY_GUIDE;
    if (!selectable) {
      throw new BadRequestException(
        trip.guideId
          ? 'This trip already has a guide request. Cancel it before choosing another guide.'
          : `A guide cannot be requested while the trip is ${trip.status}.`,
      );
    }
    if ((trip.declinedGuideIds ?? []).includes(guideId)) {
      throw new BadRequestException('This guide already declined your trip. Please choose another guide.');
    }
    const approval = this.applications.findAccepted(guideId, trip.planId);
    if (!approval) {
      throw new BadRequestException('This guide is not approved for the trip’s plan.');
    }
    if (
      findGuideConflicts(trip, guideId, this.tripsRepository.findAll()).length > 0 ||
      this.busyOnExperience(trip, guideId)
    ) {
      const range = tripDateRange(trip);
      throw new BadRequestException(
        `This guide is already booked on ${range.start ?? 'your'}${range.end && range.end !== range.start ? ` – ${range.end}` : ''}. Please choose another guide.`,
      );
    }
    const guide = this.guides.findById(guideId);
    if (!guide) {
      throw new NotFoundException(`Guide ${guideId} not found`);
    }
    const conflicts = findGuideConflicts(trip, guideId, this.tripsRepository.findAll());
    if (conflicts.length > 0 || this.busyOnExperience(trip, guideId)) {
      throw new BadRequestException('Selected guide is not available on these trip dates');
    }
    const guideName = `${guide.fname} ${guide.lname}`.trim() || guideId;
    return this.tripsService.assignPendingGuide(trip.id, guideId, approval.guidePricePerPerson, guideName);
  }

  /** Traveller withdraws a still-pending request and goes back to choosing. */
  cancelRequest(tripId: string, actor?: Actor): Trip {
    const trip = this.tripsService.findOne(tripId, actor);
    if (trip.status !== TripStatus.PENDING_GUIDE_CONFIRM) {
      throw new BadRequestException('There is no pending guide request to cancel.');
    }
    const cleared = this.tripsRepository.clearGuide(trip.id);
    const updated = cleared && this.tripsRepository.update(trip.id, {
        status: TripStatus.CONFIRMED,
        guideNote: '',
        lastUpdatedAt: new Date().toISOString(),
      });
    if (!updated) throw new NotFoundException(`Trip ${tripId} not found`);
    return updated;
  }
}
