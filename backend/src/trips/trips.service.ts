import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StructuredItinerary } from '../common/entities/itinerary.entity';
import { mergeStructuredItineraryPatch } from '../common/utils/itinerary-mapper';
import { PlansRepository } from '../plans/plans.repository';
import { GuideRepository } from '../guide/guide.repository';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripTrackingDto } from './dto/update-trip-tracking.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Trip, TripStatus, TripTrackingStatus } from './entities/trip.entity';
import { TripsRepository } from './trips.repository';
import { RefundService } from '../common/refund/refund.service';
import { RefundStatus } from '../common/refund/refund.types';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { CancelBookingDto } from '../bookings/dto/cancel-booking.dto';
import {
  findGuideConflicts,
  rangesOverlap,
  START_WINDOW_HOURS,
  tripDateRange,
  tripEndAt,
  tripStartAt,
} from './trip-dates';

@Injectable()
export class TripsService {
  constructor(
    private readonly tripsRepository: TripsRepository,
    private readonly plansRepository: PlansRepository,
    private readonly guideRepository: GuideRepository,
    private readonly refundService: RefundService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Once a guideId is attached to a trip (the traveller legitimately picked that guide), expose
  // their contact info on the trip itself — bypasses the stricter traveller-contact redaction
  // rule since this relationship is already established through the trip's own guide-request flow.
  private guideContactFor(trip: Trip) {
    if (!trip.guideId) return undefined;
    const guide = this.guideRepository.findById(trip.guideId);
    if (!guide) return undefined;
    return {
      userId: guide.userId,
      name: `${guide.fname} ${guide.lname}`.trim(),
      phone: guide.phone,
      email: guide.email,
      profTitle: guide.prof_title,
      yearsExp: guide.years_exp,
      languages: guide.lang_spoken,
      bio: guide.bio,
    };
  }

  private withGuide<T extends Trip>(trip: T): T & { guide?: ReturnType<TripsService['guideContactFor']> } {
    return { ...trip, guide: this.guideContactFor(trip) };
  }

  create(dto: CreateTripDto, actor?: { userId?: string; role?: string; region?: string }) {
    let plan = this.plansRepository.findById(dto.planId);
    if (!plan) {
      const allPlans = this.plansRepository.findAll().data;
      plan =
        allPlans.find(
          (p) =>
            p.id === dto.planId ||
            p.destination.toLowerCase() === dto.planId.toLowerCase(),
        ) || allPlans[0];
    }
    if (!plan) throw new NotFoundException(`Plan ${dto.planId} not found`);

    if (actor?.role === 'nontechadmin') {
      const ntaRegion = (actor.region || '').trim().toLowerCase();
      if (ntaRegion && plan.destination.trim().toLowerCase() !== ntaRegion) {
        throw new ForbiddenException(
          `Cannot create trip for destination '${plan.destination}': outside your assigned region '${actor.region}'`,
        );
      }
    }

    if (!tripDateRange({ itinerary: (dto.itinerary || plan.itinerary) as StructuredItinerary }).start) {
      throw new BadRequestException('A trip needs a start date before it can be booked');
    }

    const effectiveTravellerId =
      actor?.role === 'traveller' && actor.userId ? actor.userId : dto.travellerId;

    const itinerary = dto.itinerary || plan.itinerary;

    const trip = this.tripsRepository.create({
      id: dto.id,
      travellerId: effectiveTravellerId,
      planId: plan.id,
      status: TripStatus.CONFIRMED,
      itinerary,
      totalAmount: this.calculateTotalAmount(itinerary, plan.pricePerPerson),
      currentDay: 1,
      currentStop: 'Not started',
      currentLocation: itinerary.day1?.transport?.pickupLocation || plan.originCity,
      trackingStatus: TripTrackingStatus.NOT_STARTED,
      progressPercentage: 0,
      lastUpdatedAt: new Date().toISOString(),
    });

    return trip;
  }

  // ── Guide-assignment lifecycle ──
  // A booked trip starts without a guide. The traveller requests an NTA-approved guide
  // (see TripGuidesService) -> PENDING_GUIDE_CONFIRM; the guide confirms -> CONFIRMED, or declines
  // -> REJECTED_BY_GUIDE, which keeps the trip (no refund) and lets the traveller pick someone else.
  assignPendingGuide(
    tripId: string,
    guideId: string,
    guidePricePerPerson?: number,
    guideName?: string,
  ): Trip {
    const updated = this.tripsRepository.update(tripId, {
      guideId,
      status: TripStatus.PENDING_GUIDE_CONFIRM,
      guideName,
      guidePricePerPerson,
      guideRequestedAt: new Date().toISOString(),
      guideNote: '',
      lastUpdatedAt: new Date().toISOString(),
    });
    if (!updated) throw new NotFoundException(`Trip ${tripId} not found`);
    return updated;
  }

  confirmByGuide(tripId: string, guideId: string | undefined): Trip {
    const trip = this.findOne(tripId);
    if (!guideId || trip.guideId !== guideId) {
      throw new ForbiddenException('You are not assigned to this booking');
    }
    if (trip.status !== TripStatus.PENDING_GUIDE_CONFIRM) {
      throw new BadRequestException(
        `Only pending assignments can be confirmed (current: ${trip.status})`,
      );
    }
    // A guide cannot be double-booked: another confirmed trip on overlapping dates blocks this.
    if (findGuideConflicts(trip, guideId, this.tripsRepository.findAll()).length > 0) {
      throw new BadRequestException(
        'You already have a confirmed trip on these dates. Decline this request instead.',
      );
    }
    const updated = this.tripsRepository.update(tripId, {
      status: TripStatus.CONFIRMED,
      guideNote: '',
      lastUpdatedAt: new Date().toISOString(),
    });
    if (!updated) throw new NotFoundException(`Trip ${tripId} not found`);

    // Now that the guide is taken for these dates, other travellers' pending requests for the same
    // guide and dates can no longer be honoured — send them back so those travellers re-pick.
    const range = tripDateRange(updated);
    for (const other of this.tripsRepository.findAll()) {
      if (
        other.id !== tripId &&
        other.guideId === guideId &&
        other.status === TripStatus.PENDING_GUIDE_CONFIRM &&
        rangesOverlap(range, tripDateRange(other))
      ) {
        this.declineGuide(other, 'Guide is no longer available on your travel dates.');
      }
    }
    return updated;
  }

  rejectByGuide(tripId: string, guideId: string | undefined): Trip {
    const trip = this.findOne(tripId);
    if (!guideId || trip.guideId !== guideId) {
      throw new ForbiddenException('You are not assigned to this booking');
    }
    if (trip.status !== TripStatus.PENDING_GUIDE_CONFIRM && trip.status !== TripStatus.CONFIRMED) {
      throw new BadRequestException(`Cannot reject at this stage (current: ${trip.status})`);
    }
    return this.declineGuide(trip, 'Guide not confirmed — the guide could not take this trip.');
  }

  /** Marks the current guide as having declined; the trip itself stays booked. */
  declineGuide(trip: Trip, note: string): Trip {
    const declined = new Set(trip.declinedGuideIds ?? []);
    if (trip.guideId) declined.add(trip.guideId);
    const updated = this.tripsRepository.update(trip.id, {
      status: TripStatus.REJECTED_BY_GUIDE,
      guideNote: note,
      declinedGuideIds: [...declined],
      lastUpdatedAt: new Date().toISOString(),
    });
    if (!updated) throw new NotFoundException(`Trip ${trip.id} not found`);
    return updated;
  }

  /** NTA withdrew a guide's approval for a plan: send back open requests; count confirmed ones. */
  releaseGuideForPlan(guideId: string, planId: string): { released: number } {
    let released = 0;
    for (const trip of this.tripsRepository.findAll()) {
      if (trip.guideId !== guideId || trip.planId !== planId) continue;
      if (trip.status === TripStatus.PENDING_GUIDE_CONFIRM) {
        this.declineGuide(trip, 'Guide is no longer approved for this plan.');
        released += 1;
      }
    }
    return { released };
  }

  confirmedTripsForGuidePlan(guideId: string, planId: string): number {
    return this.tripsRepository
      .findByGuide(guideId)
      .filter((t) => t.planId === planId && t.status === TripStatus.CONFIRMED).length;
  }

  findAssignmentsForGuide(guideId: string): Trip[] {
    const visible = [
      TripStatus.PENDING_GUIDE_CONFIRM,
      TripStatus.CONFIRMED,
      TripStatus.STARTED,
      TripStatus.COMPLETED,
      TripStatus.REJECTED_BY_GUIDE,
    ];
    const own = this.tripsRepository.findByGuide(guideId).filter((t) => visible.includes(t.status));
    // Trips this guide declined but the traveller has since re-assigned stay visible as "Rejected".
    const ownIds = new Set(own.map((t) => t.id));
    const declined = this.tripsRepository
      .findAll()
      .filter((t) => !ownIds.has(t.id) && (t.declinedGuideIds ?? []).includes(guideId))
      .map((t) => ({ ...t, guideId, status: TripStatus.REJECTED_BY_GUIDE }));
    return [...own, ...declined];
  }

  findAll(actor?: { userId?: string; role?: string; region?: string }) {
    const allTrips = this.tripsRepository.findAll();
    if (actor?.role === 'nontechadmin') {
      const ntaRegion = (actor.region || '').trim().toLowerCase();
      if (!ntaRegion) return [];
      return allTrips
        .filter((t) => {
          const plan = this.plansRepository.findById(t.planId);
          const destination = plan?.destination || t.currentLocation || '';
          return destination.trim().toLowerCase() === ntaRegion;
        })
        .map((t) => this.withGuide(t));
    }
    return allTrips.map((t) => this.withGuide(t));
  }

  findOne(id: string, actor?: { userId?: string; role?: string; region?: string }) {
    const trip = this.tripsRepository.findById(id);
    if (!trip) throw new NotFoundException(`Trip ${id} not found`);

    if (actor) {
      const isSuperAdmin = actor.role === 'superadmin';
      const isOwnerTraveller = actor.role === 'traveller' && trip.travellerId === actor.userId;
      const isAssignedGuide = actor.role === 'guide' && trip.guideId === actor.userId;
      const isRegionalNTA = actor.role === 'nontechadmin';

      if (isRegionalNTA) {
        const plan = this.plansRepository.findById(trip.planId);
        const destination = plan?.destination || trip.currentLocation || '';
        const ntaRegion = (actor.region || '').trim().toLowerCase();
        if (ntaRegion && destination.trim().toLowerCase() !== ntaRegion) {
          throw new ForbiddenException(
            `Cannot access trip in destination '${destination}': outside your assigned region '${actor.region}'`,
          );
        }
      } else if (!isSuperAdmin && !isOwnerTraveller && !isAssignedGuide) {
        throw new ForbiddenException('You are not authorized to view this trip.');
      }
    }

    return this.withGuide(trip);
  }

  findByTraveller(travellerId: string, actor?: { userId?: string; role?: string }) {
    if (actor?.role === 'traveller' && actor.userId !== travellerId) {
      throw new ForbiddenException('You can only view your own trips.');
    }
    return this.tripsRepository.findByTraveller(travellerId).map((t) => this.withGuide(t));
  }

  findByGuide(guideId: string, actor?: { userId?: string; role?: string }) {
    if (actor?.role === 'guide' && actor.userId !== guideId) {
      throw new ForbiddenException('You can only view your own guide trips.');
    }
    return this.tripsRepository.findByGuide(guideId).map((t) => this.withGuide(t));
  }

  update(id: string, dto: UpdateTripDto, actor?: { userId?: string; role?: string; region?: string }) {
    const trip = this.findOne(id, actor);
    const plan = this.plansRepository.findById(trip.planId);
    if (!plan) throw new NotFoundException(`Plan ${trip.planId} not found`);

    if (dto.status) {
      this.assertStatusTransition(trip, dto.status, actor);
    }

    // Guides are attached through the request/confirm flow (approval + date checks), never by a
    // direct edit of the trip.
    if (
      dto.guideId &&
      dto.guideId !== trip.guideId &&
      actor?.role !== 'superadmin' &&
      actor?.role !== 'nontechadmin'
    ) {
      throw new ForbiddenException('Use the guide request flow to choose a guide');
    }

    const itinerary = dto.itinerary
      ? mergeStructuredItineraryPatch(trip.itinerary, dto.itinerary)
      : trip.itinerary;

    const updated = this.tripsRepository.update(id, {
      guideId: dto.guideId ?? trip.guideId,
      status: dto.status ?? trip.status,
      itinerary,
      totalAmount: dto.totalAmount ?? this.calculateTotalAmount(itinerary, plan.pricePerPerson),
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
      throw new ForbiddenException('Only the assigned guide can update tracking');
    }

    if (role === 'guide') {
      this.assertGuideMayTrack(trip, dto);
    }

    const trackingStatus = dto.trackingStatus ?? trip.trackingStatus;
    const progressPercentage =
      trackingStatus === TripTrackingStatus.COMPLETED
        ? 100
        : dto.progressPercentage ?? trip.progressPercentage;

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

  // Tracking rules for the assigned guide: only a confirmed trip can be run, a tour can only be
  // started shortly before it is due (and not after its last day), and it moves strictly
  // not_started -> ongoing/paused -> completed.
  private assertGuideMayTrack(trip: Trip, dto: UpdateTripTrackingDto) {
    if (trip.status !== TripStatus.CONFIRMED && trip.status !== TripStatus.STARTED) {
      throw new BadRequestException(
        `This trip is not confirmed (current: ${trip.status}), so it cannot be run yet.`,
      );
    }
    const next = dto.trackingStatus;
    if (!next || next === trip.trackingStatus) return;

    if (trip.trackingStatus === TripTrackingStatus.NOT_STARTED) {
      if (next !== TripTrackingStatus.ONGOING) {
        throw new BadRequestException('A tour must be started before it can be paused or completed.');
      }
      const startAt = tripStartAt(trip);
      const endAt = tripEndAt(trip);
      if (startAt === undefined) {
        throw new BadRequestException('This trip has no start date, so it cannot be started.');
      }
      const opensAt = startAt - START_WINDOW_HOURS * 3_600_000;
      if (Date.now() < opensAt) {
        throw new BadRequestException(
          `Too early to start. This tour can be started from ${new Date(opensAt).toISOString()} (${START_WINDOW_HOURS} hours before its start time).`,
        );
      }
      if (endAt !== undefined && Date.now() > endAt) {
        throw new BadRequestException('The dates of this trip have passed, so it can no longer be started.');
      }
      return;
    }
    if (trip.trackingStatus === TripTrackingStatus.COMPLETED) {
      throw new BadRequestException('This tour is already completed.');
    }
    if (next === TripTrackingStatus.NOT_STARTED) {
      throw new BadRequestException('A started tour cannot be reset.');
    }
  }

  experienceExistsOnTrip(tripId: string, experienceId: string): boolean {
    const trip = this.findOne(tripId);
    return trip.itinerary.days.some((day) =>
      day.experiences.some((experience) => experience.experienceId === experienceId),
    );
  }

  remove(id: string) {
    const deleted = this.tripsRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Trip ${id} not found`);
    return { message: `Trip ${id} deleted` };
  }

  private calculateTotalAmount(itinerary: StructuredItinerary, basePrice: number): number {
    const flightAmount = itinerary.day1.flight ? 12000 : 0;
    const hotelAmount = itinerary.day1.hotel ? 18000 : 0;
    const experienceAmount = itinerary.days.reduce(
      (sum, day) => sum + day.experiences.length * 3500,
      0,
    );

    return Math.max(basePrice, flightAmount + hotelAmount + experienceAmount);
  }

  cancel(
    id: string,
    actor?: { userId?: string; role?: string; region?: string },
    dto?: CancelBookingDto,
  ) {
    const trip = this.findOne(id, actor);
    if (!trip) throw new NotFoundException(`Trip ${id} not found`);

    const isOwner = actor?.role === 'traveller' && trip.travellerId === actor.userId;
    const isAdmin = actor?.role === 'superadmin' || actor?.role === 'nontechadmin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Not authorized to cancel this trip.');
    }

    if (trip.status === TripStatus.CANCELLED) {
      throw new BadRequestException('Trip is already cancelled.');
    }

    if (trip.status === TripStatus.STARTED || trip.status === TripStatus.COMPLETED) {
      throw new BadRequestException(`Cannot cancel a trip that is already ${trip.status}.`);
    }

    const startDate = trip.itinerary?.day1?.hotel?.checkInDate || trip.itinerary?.day1?.transport?.pickupAt;
    const calc = this.refundService.calculateTripRefund(trip.totalAmount, startDate, isAdmin);
    const refundResult = this.refundService.processSimulatedRefund(
      calc,
      trip.refundStatus,
      dto?.simulatedOutcome,
    );

    const reason = dto?.reason?.trim() || (isAdmin ? 'Cancelled by administration' : 'Cancelled by traveller');

    const updated = this.tripsRepository.update(id, {
      status: TripStatus.CANCELLED,
      cancelledAt: new Date().toISOString(),
      cancellationReason: reason,
      refundEligibility: refundResult.refundEligibility,
      refundAmount: refundResult.refundAmount,
      refundStatus: refundResult.refundStatus,
      refundReference: refundResult.refundReference,
      refundedAt: refundResult.refundedAt,
      cancellationPolicyNote: refundResult.policyNote,
    });

    if (trip.travellerId) {
      this.notificationsService.create({
        userId: trip.travellerId,
        title: 'Trip Cancelled',
        message: `Your booking #${trip.id} has been cancelled successfully. Refund status: ${refundResult.refundStatus}.`,
        type: NotificationType.BOOKING_CANCELLED,
        bookingId: trip.id,
        bookingType: 'trip',
        refundStatus: refundResult.refundStatus,
        refundAmount: refundResult.refundAmount,
      });

      if (refundResult.refundStatus === RefundStatus.SUCCESS) {
        this.notificationsService.create({
          userId: trip.travellerId,
          title: 'Refund Processed',
          message: `Your refund of ₹${refundResult.refundAmount} for booking #${trip.id} has been processed successfully.`,
          type: NotificationType.REFUND_PROCESSED,
          bookingId: trip.id,
          bookingType: 'trip',
          refundStatus: RefundStatus.SUCCESS,
          refundAmount: refundResult.refundAmount,
        });
      } else if (refundResult.refundStatus === RefundStatus.FAILED) {
        this.notificationsService.create({
          userId: trip.travellerId,
          title: 'Refund Processing Failed',
          message: `Your refund of ₹${refundResult.refundAmount} for booking #${trip.id} could not be processed automatically. Please submit a support ticket for assistance.`,
          type: NotificationType.REFUND_FAILED,
          bookingId: trip.id,
          bookingType: 'trip',
          refundStatus: RefundStatus.FAILED,
          refundAmount: refundResult.refundAmount,
        });
      }
    }

    return this.withGuide(updated!);
  }

  retryRefund(id: string, actor?: { userId?: string; role?: string }) {
    const trip = this.tripsRepository.findById(id);
    if (!trip) throw new NotFoundException(`Trip ${id} not found`);

    if (actor?.role === 'traveller' && trip.travellerId !== actor.userId) {
      throw new ForbiddenException('You can only retry refunds for your own trips.');
    }

    if (trip.status !== TripStatus.CANCELLED) {
      throw new BadRequestException('Only cancelled trips can have refunds processed.');
    }

    if (trip.refundStatus === RefundStatus.SUCCESS) {
      throw new BadRequestException('Refund has already been processed successfully.');
    }

    if (trip.refundEligibility !== 'ELIGIBLE' || !trip.refundAmount) {
      throw new BadRequestException('This trip is not eligible for a refund under the cancellation policy.');
    }

    const calc = {
      isEligible: true,
      refundAmount: trip.refundAmount,
      policyNote: trip.cancellationPolicyNote || 'Eligible refund retry',
    };

    const refundResult = this.refundService.processSimulatedRefund(calc, trip.refundStatus, 'SUCCESS');

    const updated = this.tripsRepository.update(id, {
      refundStatus: refundResult.refundStatus,
      refundReference: refundResult.refundReference,
      refundedAt: refundResult.refundedAt,
    });

    if (trip.travellerId && refundResult.refundStatus === RefundStatus.SUCCESS) {
      this.notificationsService.create({
        userId: trip.travellerId,
        title: 'Refund Processed',
        message: `Your refund of ₹${refundResult.refundAmount} for booking #${trip.id} has been processed successfully.`,
        type: NotificationType.REFUND_PROCESSED,
        bookingId: trip.id,
        bookingType: 'trip',
        refundStatus: RefundStatus.SUCCESS,
        refundAmount: refundResult.refundAmount,
      });
    }

    return this.withGuide(updated!);
  }

  private assertStatusTransition(
    trip: Trip,
    status: TripStatus,
    actor?: { userId?: string; role?: string },
  ) {
    if (status === trip.status) return;

    const allowedTransitions: Record<TripStatus, TripStatus[]> = {
      [TripStatus.DRAFT]: [TripStatus.CONFIRMED, TripStatus.CANCELLED],
      [TripStatus.PENDING_GUIDE_CONFIRM]: [TripStatus.CANCELLED],
      [TripStatus.CONFIRMED]: [TripStatus.STARTED, TripStatus.CANCELLED],
      [TripStatus.STARTED]: [TripStatus.COMPLETED],
      [TripStatus.COMPLETED]: [],
      [TripStatus.REJECTED_BY_GUIDE]: [TripStatus.CANCELLED],
      [TripStatus.CANCELLED]: [],
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
        throw new ForbiddenException('Traveller can only confirm their own trip');
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
