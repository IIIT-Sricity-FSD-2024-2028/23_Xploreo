import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { HotelsRepository } from '../hotels/hotels.repository';
import { RoomTypesRepository } from '../hotels/room-types.repository';
import { ExperiencesRepository } from '../experiences/experiences.repository';
import { Plan } from '../plans/entities/plan.entity';
import {
  computePackageCapacity,
  InventoryLookups,
  PackageCapacity,
} from '../plans/package-inventory';
import { ItineraryItemStatus, StructuredItinerary } from '../common/entities/itinerary.entity';
import { mergeStructuredItineraryPatch } from '../common/utils/itinerary-mapper';
import { AuthRepository } from '../auth/auth.repository';
import { PlansRepository } from '../plans/plans.repository';
import { GuideRepository } from '../guide/guide.repository';
import { BookingsRepository } from '../bookings/bookings.repository';
import { BookingStatus } from '../bookings/entities/booking.entity';
import { ExperienceBookingsRepository } from '../experience-bookings/experience-bookings.repository';
import { ExperienceBookingStatus } from '../experience-bookings/entities/experience-booking.entity';
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
import { assertBookingCancellationEligible } from '../common/utils/cancellation-guard';
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
    @Optional() private readonly hotelsRepository?: HotelsRepository,
    @Optional() private readonly roomTypesRepository?: RoomTypesRepository,
    @Optional() private readonly experiencesRepository?: ExperiencesRepository,
    @Optional() private readonly bookingsRepository?: BookingsRepository,
    @Optional() private readonly experienceBookingsRepository?: ExperienceBookingsRepository,
    @Optional() private readonly authRepository?: AuthRepository,
  ) {}

  private inventoryLookups(): InventoryLookups | null {
    if (!this.hotelsRepository || !this.roomTypesRepository || !this.experiencesRepository) return null;
    return {
      findHotel: (id) => this.hotelsRepository!.findById(id),
      roomTypesFor: (hotelId) => this.roomTypesRepository!.findByHotelId(hotelId),
      findExperience: (id) => this.experiencesRepository!.findById(id),
    };
  }

  // Trips that still hold their hotel and experience places (not cancelled, not finished).
  private tripsHoldingInventory(excludeId?: string): Trip[] {
    return this.tripsRepository
      .findAll()
      .filter(
        (t) =>
          t.id !== excludeId &&
          t.status !== TripStatus.CANCELLED &&
          t.status !== TripStatus.COMPLETED,
      );
  }

  private packageCapacity(plan: Plan, itinerary: StructuredItinerary): PackageCapacity | null {
    const lookups = this.inventoryLookups();
    if (!lookups) return null;
    return computePackageCapacity(itinerary, plan.destination, lookups, this.tripsHoldingInventory());
  }

  /**
   * GET /plans/:id/capacity — what the traveller can book on a package right now: maximum guests
   * (and which resource limits it), whether it is bookable, and the per-person amount a booking
   * records (the same calculation create() uses).
   */
  quoteForPlan(planId: string, actor?: { userId?: string; role?: string; region?: string }) {
    const plan = this.plansRepository.findById(planId);
    const status = (plan?.status || 'available').toLowerCase();
    const isStaff = actor?.role === 'nontechadmin' || actor?.role === 'superadmin';
    if (!plan || (!isStaff && (status === 'draft' || status === 'unavailable'))) {
      throw new NotFoundException(`Plan ${planId} not found`);
    }
    if (actor?.role === 'nontechadmin') {
      const ntaRegion = (actor.region || '').trim().toLowerCase();
      if (ntaRegion && plan.destination.trim().toLowerCase() !== ntaRegion) {
        throw new ForbiddenException(
          `Cannot access package in destination '${plan.destination}': outside your assigned region '${actor.region}'`,
        );
      }
    }
    const capacity = this.packageCapacity(plan, plan.itinerary) ?? {
      maxGuests: null,
      bookable: false,
      issues: ['Capacity information is not available for this package.'],
      limits: [],
    };
    const issues = [...capacity.issues];
    if (status !== 'available') issues.unshift(`This package is ${status.replace('_', ' ')}.`);
    return {
      planId: plan.id,
      ...capacity,
      bookable: issues.length === 0,
      issues,
      pricePerPerson: this.calculateTotalAmount(plan.itinerary, plan.pricePerPerson, 1),
    };
  }

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
    const range = tripDateRange(trip);
    return {
      ...trip,
      startDate: trip.startDate || range.start,
      endDate: trip.endDate || range.end,
      guide: this.guideContactFor(trip),
    };
  }

  create(dto: CreateTripDto, actor?: { userId?: string; role?: string; region?: string }) {
    let plan = this.plansRepository.findById(dto.planId);
    if (!plan) {
      const allPlans = this.plansRepository.findAll().data;
      plan = allPlans.find(
        (p) =>
          p.id === dto.planId ||
          p.destination.toLowerCase() === dto.planId.toLowerCase(),
      );
    }
    if (!plan) throw new NotFoundException(`Plan ${dto.planId} not found`);
    if (dto.id && this.tripsRepository.findById(dto.id)) {
      throw new BadRequestException(`Trip ${dto.id} already exists`);
    }

    const planStatus = (plan.status || 'available').toLowerCase();
    if (planStatus === 'sold_out') {
      throw new BadRequestException(`Cannot book package '${plan.title}': package is sold out.`);
    }
    if (planStatus === 'draft' || planStatus === 'unpublished') {
      throw new BadRequestException(`Cannot book package '${plan.title}': package is not published.`);
    }
    if (planStatus === 'unavailable') {
      throw new BadRequestException(`Cannot book package '${plan.title}': package is currently unavailable.`);
    }
    if (planStatus !== 'available') {
      throw new BadRequestException(`Cannot book package '${plan.title}': booking is not permitted.`);
    }

    if (actor?.role === 'nontechadmin') {
      const ntaRegion = (actor.region || '').trim().toLowerCase();
      if (ntaRegion && plan.destination.trim().toLowerCase() !== ntaRegion) {
        throw new ForbiddenException(
          `Cannot create trip for destination '${plan.destination}': outside your assigned region '${actor.region}'`,
        );
      }
    }

    const itinerary = (dto.itinerary || plan.itinerary) as StructuredItinerary;
    const dateRange = tripDateRange({ itinerary });
    if (!dateRange.start) {
      throw new BadRequestException('A trip needs a start date before it can be booked');
    }
    const startMs = Date.parse(dateRange.start);
    const todayUtc = new Date().toISOString().slice(0, 10);
    const todayStartMs = Date.parse(`${todayUtc}T00:00:00.000Z`);
    if (!Number.isFinite(startMs) || startMs < todayStartMs) {
      throw new BadRequestException('Trip start date cannot be in the past');
    }
    if (dateRange.end) {
      const endMs = Date.parse(dateRange.end);
      if (!Number.isFinite(endMs) || endMs < startMs) {
        throw new BadRequestException('Trip end date must be on or after start date');
      }
    }

    const effectiveTravellerId =
      actor?.role === 'traveller' && actor.userId ? actor.userId : dto.travellerId;
    const travellersCount = Math.max(1, Number(dto.travellers ?? 1));

    // Whatever hotel and experiences the booking carries (the package's own, or ones the
    // traveller selected) must still exist, be active, belong to the package destination, sit on
    // coherent bookable dates, and have room for this many guests.
    const capacity = this.packageCapacity(plan, itinerary);
    if (capacity) {
      if (capacity.issues.length > 0) {
        throw new BadRequestException(
          `Cannot book '${plan.title}': ${capacity.issues.join(' ')}`,
        );
      }
      if (capacity.maxGuests !== null && travellersCount > capacity.maxGuests) {
        const tightest = capacity.limits.find((l) => l.capacity === capacity.maxGuests);
        throw new BadRequestException(
          `Only ${capacity.maxGuests} guest(s) can be booked on '${plan.title}'` +
            (tightest ? ` (limited by ${tightest.kind} "${tightest.name}": ${tightest.basis}).` : '.'),
        );
      }
    }

    const trip = this.tripsRepository.create({
      id: dto.id,
      travellerId: effectiveTravellerId,
      planId: plan.id,
      status: TripStatus.CONFIRMED,
      itinerary,
      travellers: travellersCount,
      totalAmount: this.calculateTotalAmount(itinerary, plan.pricePerPerson, travellersCount),
      currentDay: 1,
      currentStop: 'Not started',
      currentLocation: itinerary.day1?.transport?.pickupLocation || plan.originCity,
      trackingStatus: TripTrackingStatus.NOT_STARTED,
      progressPercentage: 0,
      lastUpdatedAt: new Date().toISOString(),
      startDate: dateRange.start,
      endDate: dateRange.end,
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
      // The NTA's booking view also needs the package title and destination of each trip.
      return allTrips
        .map((t) => ({ trip: t, plan: this.plansRepository.findById(t.planId) }))
        .filter(({ trip, plan }) => {
          const destination = plan?.destination || trip.currentLocation || '';
          if (destination.trim().toLowerCase() !== ntaRegion) return false;
          if (plan?.createdByNtaId && plan.createdByNtaId !== actor.userId) return false;
          return true;
        })
        .map(({ trip, plan }) => ({
          ...this.withGuide(trip),
          planTitle: plan?.title,
          destination: plan?.destination || trip.currentLocation,
        }));
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
        if (plan?.createdByNtaId && plan.createdByNtaId !== actor.userId) {
          throw new ForbiddenException(
            `Cannot access trip '${trip.id}': package is owned by another NTA`,
          );
        }
      } else if (!isSuperAdmin && !isOwnerTraveller && !isAssignedGuide) {
        throw new ForbiddenException('You are not authorized to view this trip.');
      }
    }

    return {
      ...this.withGuide(trip),
      planTitle: this.plansRepository.findById(trip.planId)?.title,
      destination:
        this.plansRepository.findById(trip.planId)?.destination ||
        trip.currentLocation,
    };
  }

  findNtaPackageBookings(actor?: { userId?: string; role?: string; region?: string }) {
    if (actor?.role !== 'nontechadmin' && actor?.role !== 'superadmin') {
      throw new ForbiddenException('Only NTA or SuperAdmin can view package distribution bookings.');
    }
    return this.findAll(actor).map((trip) => this.toNtaPackageBooking(trip));
  }

  getNtaPackageBookingDetail(
    id: string,
    actor?: { userId?: string; role?: string; region?: string },
  ) {
    if (actor?.role !== 'nontechadmin' && actor?.role !== 'superadmin') {
      throw new ForbiddenException('Only NTA or SuperAdmin can view package distribution bookings.');
    }
    const trip = this.findOne(id, actor);
    return this.toNtaPackageBooking(trip);
  }

  private toNtaPackageBooking(trip: Trip) {
    const plan = this.plansRepository.findById(trip.planId);
    const linkedHotelBookings = this.bookingsRepository?.findByTripId(trip.id) ?? [];
    const linkedExpBookings = this.experienceBookingsRepository?.findByTripId(trip.id) ?? [];

    const itineraryHotel = trip.itinerary?.day1?.hotel;
    const hotelComponents =
      itineraryHotel && itineraryHotel.hotelId
        ? (() => {
            const hotel = this.hotelsRepository?.findById(itineraryHotel.hotelId);
            const activeBooking =
              (trip.hotelBookingId
                ? linkedHotelBookings.find(
                    (b) => b.id === trip.hotelBookingId && b.status !== BookingStatus.CANCELLED,
                  )
                : undefined) ??
              linkedHotelBookings.find(
                (b) =>
                  b.hotelId === itineraryHotel.hotelId &&
                  b.status !== BookingStatus.CANCELLED,
              );
            const assignedBooking =
              activeBooking ??
              linkedHotelBookings.find((b) => b.hotelId === itineraryHotel.hotelId);
            return [
              {
                itineraryItemId: itineraryHotel.id,
                hotelId: itineraryHotel.hotelId,
                hotelName: hotel?.name ?? itineraryHotel.name,
                partnerId: hotel?.partnerId ?? null,
                checkInDate: itineraryHotel.checkInDate,
                checkOutDate: itineraryHotel.checkOutDate,
                roomType: itineraryHotel.roomType,
                itineraryStatus: itineraryHotel.status,
                bookingId: assignedBooking?.id ?? null,
                assignmentStatus: activeBooking ? 'assigned' : 'unassigned',
                bookingStatus: assignedBooking?.status ?? null,
              },
            ];
          })()
        : [];

    const experienceComponents = (trip.itinerary?.days ?? []).flatMap((day) =>
      (day.experiences ?? [])
        .filter((exp) => Boolean(exp?.experienceId))
        .map((exp) => {
          const experience = this.experiencesRepository?.findById(exp.experienceId);
          const scheduledDate = String(
            exp.startsAt || itineraryHotel?.checkInDate || '',
          ).slice(0, 10);
          const activeBooking = linkedExpBookings.find(
            (b) =>
              b.experienceId === exp.experienceId &&
              (!scheduledDate || String(b.date).slice(0, 10) === scheduledDate) &&
              b.status !== ExperienceBookingStatus.CANCELLED,
          );
          const assignedBooking =
            activeBooking ??
            linkedExpBookings.find(
              (b) =>
                b.experienceId === exp.experienceId &&
                (!scheduledDate || String(b.date).slice(0, 10) === scheduledDate),
            );
          return {
            dayNumber: day.dayNumber,
            itineraryItemId: exp.id,
            experienceId: exp.experienceId,
            title: experience?.title ?? exp.title,
            partnerId: experience?.partnerId ?? null,
            location: exp.location,
            startsAt: exp.startsAt,
            endsAt: exp.endsAt,
            itineraryStatus: exp.status,
            bookingId: assignedBooking?.id ?? null,
            assignmentStatus: activeBooking ? 'assigned' : 'unassigned',
            bookingStatus: assignedBooking?.status ?? null,
          };
        }),
    );

    return {
      tripId: trip.id,
      travellerId: trip.travellerId,
      planId: trip.planId,
      packageTitle: plan?.title ?? trip.planId,
      destination: plan?.destination ?? trip.currentLocation ?? '',
      createdByNtaId: plan?.createdByNtaId ?? null,
      travellers: trip.travellers ?? 1,
      totalAmount: trip.totalAmount,
      overallStatus: trip.status,
      trackingStatus: trip.trackingStatus,
      hotelComponents,
      experienceComponents,
    };
  }

  dispatchNtaPackageBooking(
    id: string,
    actor?: { userId?: string; role?: string; region?: string },
  ) {
    if (actor?.role !== 'nontechadmin' && actor?.role !== 'superadmin') {
      throw new ForbiddenException('Only NTA or SuperAdmin can dispatch package bookings.');
    }

    const trip = this.findOne(id, actor);
    const plan = this.plansRepository.findById(trip.planId);
    if (!plan) {
      throw new NotFoundException(`Plan ${trip.planId} not found`);
    }

    if (
      trip.status === TripStatus.DRAFT ||
      trip.status === TripStatus.CANCELLED ||
      trip.status === TripStatus.REJECTED_BY_GUIDE
    ) {
      throw new BadRequestException(
        `Cannot dispatch package booking in status '${trip.status}'. Only paid/confirmed bookings can be dispatched.`,
      );
    }

    const traveller = this.authRepository?.findById(trip.travellerId);
    const guestName = traveller?.name || `Traveller ${trip.travellerId}`;
    const email = traveller?.email || `${trip.travellerId}@xploreo.com`;
    const phone = traveller?.phone || '9000000000';
    const travellersCount = Math.max(1, trip.travellers ?? 1);

    const nextItinerary: StructuredItinerary = {
      ...trip.itinerary,
      day1: {
        ...trip.itinerary.day1,
        hotel: trip.itinerary.day1?.hotel ? { ...trip.itinerary.day1.hotel } : trip.itinerary.day1?.hotel,
      },
      days: (trip.itinerary.days ?? []).map((d) => ({
        ...d,
        experiences: (d.experiences ?? []).map((e) => ({ ...e })),
      })),
    };

    const failedComponents: Array<{ componentType: 'hotel' | 'experience'; targetId: string; error: string }> = [];
    let hotelBookingId = trip.hotelBookingId;
    let dispatchedHotel: Record<string, unknown> | null = null;

    // 1. Hotel component dispatch (idempotent)
    const itineraryHotel = nextItinerary.day1?.hotel;
    if (itineraryHotel && itineraryHotel.hotelId) {
      try {
        const hotel = this.hotelsRepository?.findById(itineraryHotel.hotelId);
        if (!hotel || hotel.status !== 'active') {
          throw new NotFoundException(`Hotel ${itineraryHotel.hotelId} not found or inactive`);
        }

        const existingHotelBooking = (this.bookingsRepository?.findByTripId(trip.id) ?? []).find(
          (b) => b.hotelId === hotel.id && b.status !== BookingStatus.CANCELLED,
        );

        if (existingHotelBooking) {
          hotelBookingId = existingHotelBooking.id;
          itineraryHotel.status = ItineraryItemStatus.CONFIRMED;
          dispatchedHotel = {
            bookingId: existingHotelBooking.id,
            hotelId: hotel.id,
            partnerId: hotel.partnerId,
            created: false,
            idempotent: true,
          };
        } else if (this.bookingsRepository) {
          const checkIn = itineraryHotel.checkInDate || new Date().toISOString().slice(0, 10);
          const checkOut =
            itineraryHotel.checkOutDate ||
            new Date(Date.parse(checkIn) + 86_400_000).toISOString().slice(0, 10);

          const baseHotelBookingId = `pkg-htl-${trip.id}-${hotel.id}`;
          let nextHotelBookingId = baseHotelBookingId;
          let hotelRetry = 1;
          while (this.bookingsRepository.findById(nextHotelBookingId)) {
            nextHotelBookingId = `${baseHotelBookingId}-r${hotelRetry++}`;
          }

          const created = this.bookingsRepository.create({
            id: nextHotelBookingId,
            hotelId: hotel.id,
            travellerId: trip.travellerId,
            guestName,
            email,
            phone,
            checkIn,
            checkOut,
            guests: travellersCount,
            roomType: itineraryHotel.roomType || 'Standard Room',
            rooms: 1,
            guestNames: [guestName],
            notes: `Package component for Trip ${trip.id} (${plan.title})`,
            totalAmount: 0,
            tripId: trip.id,
            isPackageComponent: true,
            packagePlanId: plan.id,
          });
          hotelBookingId = created.id;
          itineraryHotel.status = ItineraryItemStatus.CONFIRMED;
          dispatchedHotel = {
            bookingId: created.id,
            hotelId: hotel.id,
            partnerId: hotel.partnerId,
            created: true,
            idempotent: false,
          };
        }
      } catch (err) {
        failedComponents.push({
          componentType: 'hotel',
          targetId: itineraryHotel.hotelId,
          error: err instanceof Error ? err.message : 'Failed to dispatch hotel component',
        });
      }
    }

    // 2. Experience component dispatch (idempotent)
    const expBookingIdSet = new Set<string>(trip.experienceBookingIds ?? []);
    const dispatchedExperiences: Array<Record<string, unknown>> = [];
    const existingExpBookings = this.experienceBookingsRepository?.findByTripId(trip.id) ?? [];

    for (const day of nextItinerary.days) {
      for (const exp of day.experiences ?? []) {
        if (!exp?.experienceId) continue;
        try {
          const experience = this.experiencesRepository?.findById(exp.experienceId);
          if (!experience) {
            throw new NotFoundException(`Experience ${exp.experienceId} not found`);
          }

          const scheduledDate = String(
            exp.startsAt || itineraryHotel?.checkInDate || new Date().toISOString(),
          ).slice(0, 10);

          const existingExp = existingExpBookings.find(
            (b) =>
              b.experienceId === experience.id &&
              String(b.date).slice(0, 10) === scheduledDate &&
              b.status !== ExperienceBookingStatus.CANCELLED,
          );

          if (existingExp) {
            expBookingIdSet.add(existingExp.id);
            exp.status = this.mapExperienceStatusToItinerary(existingExp.status);
            dispatchedExperiences.push({
              dayNumber: day.dayNumber,
              bookingId: existingExp.id,
              experienceId: experience.id,
              partnerId: experience.partnerId,
              created: false,
              idempotent: true,
            });
          } else if (this.experienceBookingsRepository) {
            const baseExpBookingId = `pkg-exp-${trip.id}-${day.dayNumber}-${experience.id}`;
            let nextExpBookingId = baseExpBookingId;
            let expRetry = 1;
            while (this.experienceBookingsRepository.findById(nextExpBookingId)) {
              nextExpBookingId = `${baseExpBookingId}-r${expRetry++}`;
            }

            const timeMatch =
              /(?:T|\s)(\d{2}:\d{2})/.exec(String(exp.startsAt || '')) ??
              /^(\d{2}:\d{2})$/.exec(String(exp.startsAt || '').trim());
            const slotTime = experience.slots?.find(
              (s) => String(s.date).slice(0, 10) === scheduledDate,
            )?.time;
            const scheduledTime = timeMatch?.[1] || slotTime || undefined;

            const created = this.experienceBookingsRepository.create({
              id: nextExpBookingId,
              experienceId: experience.id,
              travellerId: trip.travellerId,
              guestName,
              email,
              phone,
              date: scheduledDate,
              time: scheduledTime,
              participants: travellersCount,
              totalAmount: 0,
              tripId: trip.id,
              isPackageComponent: true,
              packagePlanId: plan.id,
            });
            existingExpBookings.push(created);
            expBookingIdSet.add(created.id);
            exp.status = ItineraryItemStatus.CONFIRMED;
            dispatchedExperiences.push({
              dayNumber: day.dayNumber,
              bookingId: created.id,
              experienceId: experience.id,
              partnerId: experience.partnerId,
              created: true,
              idempotent: false,
            });
          }
        } catch (err) {
          failedComponents.push({
            componentType: 'experience',
            targetId: exp.experienceId,
            error: err instanceof Error ? err.message : 'Failed to dispatch experience component',
          });
        }
      }
    }

    const updatedTrip =
      this.tripsRepository.update(trip.id, {
        itinerary: nextItinerary,
        hotelBookingId,
        experienceBookingIds: [...expBookingIdSet],
        lastUpdatedAt: new Date().toISOString(),
      }) ?? trip;

    return {
      trip: this.withGuide(updatedTrip),
      packageBooking: this.toNtaPackageBooking(updatedTrip),
      dispatched: {
        hotel: dispatchedHotel,
        experiences: dispatchedExperiences,
      },
      failedComponents,
    };
  }

  private mapHotelStatusToItinerary(status: BookingStatus): ItineraryItemStatus {
    switch (status) {
      case BookingStatus.CHECKED_IN:
        return ItineraryItemStatus.CHECKED_IN;
      case BookingStatus.CHECKED_OUT:
        return ItineraryItemStatus.CHECKED_OUT;
      case BookingStatus.CANCELLED:
        return ItineraryItemStatus.CANCELLED;
      case BookingStatus.CONFIRMED:
      default:
        return ItineraryItemStatus.CONFIRMED;
    }
  }

  private mapExperienceStatusToItinerary(
    status: ExperienceBookingStatus,
  ): ItineraryItemStatus {
    switch (status) {
      case ExperienceBookingStatus.CHECKED_IN:
      case ExperienceBookingStatus.END_REQUESTED:
        return ItineraryItemStatus.CHECKED_IN;
      case ExperienceBookingStatus.COMPLETED:
        return ItineraryItemStatus.COMPLETED;
      case ExperienceBookingStatus.CANCELLED:
        return ItineraryItemStatus.CANCELLED;
      case ExperienceBookingStatus.CONFIRMED:
      default:
        return ItineraryItemStatus.CONFIRMED;
    }
  }

  syncComponentStatus(
    tripId: string,
    event:
      | { kind: 'hotel'; hotelId: string; bookingStatus: BookingStatus }
      | {
          kind: 'experience';
          experienceId: string;
          bookingDate?: string;
          bookingId?: string;
          bookingStatus: ExperienceBookingStatus;
        },
  ) {
    const trip = this.tripsRepository.findById(tripId);
    if (!trip) return undefined;

    const nextItinerary: StructuredItinerary = {
      ...trip.itinerary,
      day1: {
        ...trip.itinerary.day1,
        hotel: trip.itinerary.day1?.hotel ? { ...trip.itinerary.day1.hotel } : trip.itinerary.day1?.hotel,
      },
      days: (trip.itinerary.days ?? []).map((d) => ({
        ...d,
        experiences: (d.experiences ?? []).map((e) => ({ ...e })),
      })),
    };

    if (event.kind === 'hotel' && nextItinerary.day1?.hotel?.hotelId === event.hotelId) {
      nextItinerary.day1.hotel.status = this.mapHotelStatusToItinerary(event.bookingStatus);
    }

    if (event.kind === 'experience') {
      const targetDate = event.bookingDate ? String(event.bookingDate).slice(0, 10) : '';
      for (const day of nextItinerary.days) {
        for (const exp of day.experiences ?? []) {
          if (exp.experienceId !== event.experienceId) continue;
          const expDate = String(exp.startsAt || nextItinerary.day1?.hotel?.checkInDate || '').slice(0, 10);
          if (!targetDate || !expDate || expDate === targetDate) {
            exp.status = this.mapExperienceStatusToItinerary(event.bookingStatus);
          }
        }
      }
    }

    // Derive overall package progress against ALL expected itinerary components (never only dispatched rows)
    const hotelBookings = this.bookingsRepository?.findByTripId(trip.id) ?? [];
    const expBookings = this.experienceBookingsRepository?.findByTripId(trip.id) ?? [];

    let expectedTotal = 0;
    let completedCount = 0;
    let anyInProgress = false;

    const itineraryHotel = nextItinerary.day1?.hotel;
    if (itineraryHotel && itineraryHotel.hotelId) {
      expectedTotal += 1;
      const activeHotel = hotelBookings.find(
        (b) => b.hotelId === itineraryHotel.hotelId && b.status !== BookingStatus.CANCELLED,
      );
      if (activeHotel?.status === BookingStatus.CHECKED_OUT) {
        completedCount += 1;
      } else if (activeHotel?.status === BookingStatus.CHECKED_IN) {
        anyInProgress = true;
      }
    }

    for (const day of nextItinerary.days ?? []) {
      for (const exp of day.experiences ?? []) {
        if (!exp?.experienceId) continue;
        expectedTotal += 1;
        const expDate = String(exp.startsAt || itineraryHotel?.checkInDate || '').slice(0, 10);
        const activeExp = expBookings.find(
          (b) =>
            b.experienceId === exp.experienceId &&
            (!expDate || String(b.date).slice(0, 10) === expDate) &&
            b.status !== ExperienceBookingStatus.CANCELLED,
        );
        if (activeExp?.status === ExperienceBookingStatus.COMPLETED) {
          completedCount += 1;
        } else if (
          activeExp?.status === ExperienceBookingStatus.CHECKED_IN ||
          activeExp?.status === ExperienceBookingStatus.END_REQUESTED
        ) {
          anyInProgress = true;
        }
      }
    }

    let nextStatus = trip.status;
    let nextTrackingStatus = trip.trackingStatus;
    let nextProgress = trip.progressPercentage;

    if (expectedTotal > 0) {
      nextProgress = Math.round((completedCount / expectedTotal) * 100);
      if (completedCount === expectedTotal) {
        nextStatus = TripStatus.COMPLETED;
        nextTrackingStatus = TripTrackingStatus.COMPLETED;
      } else if (anyInProgress || completedCount > 0) {
        if (nextStatus === TripStatus.CONFIRMED) {
          nextStatus = TripStatus.STARTED;
        }
        nextTrackingStatus = TripTrackingStatus.ONGOING;
      }
    }

    const updated = this.tripsRepository.update(trip.id, {
      itinerary: nextItinerary,
      status: nextStatus,
      trackingStatus: nextTrackingStatus,
      progressPercentage: nextProgress,
      lastUpdatedAt: new Date().toISOString(),
    });

    if (trip.travellerId) {
      const label = event.kind === 'hotel' ? 'Hotel stay' : 'Experience';
      const isCancelled =
        event.bookingStatus === BookingStatus.CANCELLED ||
        event.bookingStatus === ExperienceBookingStatus.CANCELLED;
      this.notificationsService.create({
        userId: trip.travellerId,
        title: 'Package Component Updated',
        message: `${label} in your package #${trip.id} is now ${String(event.bookingStatus).toLowerCase().replace('_', ' ')}.`,
        type: isCancelled ? NotificationType.BOOKING_CANCELLED : NotificationType.INFO,
        bookingId: trip.id,
        bookingType: 'trip',
      });
    }

    return updated;
  }

  findByTraveller(travellerId: string, actor?: { userId?: string; role?: string }) {
    if (actor?.role === 'traveller' && actor.userId !== travellerId) {
      throw new ForbiddenException('You can only view your own trips.');
    }
    return this.tripsRepository.findByTraveller(travellerId).map((t) => {
      const plan = this.plansRepository.findById(t.planId);
      return {
        ...this.withGuide(t),
        planTitle: plan?.title,
        destination: plan?.destination || t.currentLocation,
      };
    });
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
    if (dto.guideId && dto.guideId !== trip.guideId) {
      this.assertGuideAvailableForTrip(dto.guideId, trip);
    }

    if (actor?.role === 'guide' && dto.itinerary) {
      throw new ForbiddenException('Guides cannot modify trip itinerary');
    }

    const itinerary = dto.itinerary
      ? mergeStructuredItineraryPatch(trip.itinerary, dto.itinerary)
      : trip.itinerary;

    let totalAmount = trip.totalAmount;
    if (dto.itinerary) {
      const travellersCount = this.resolveTravellerCount(trip, plan.pricePerPerson);
      totalAmount = this.calculateTotalAmount(itinerary, plan.pricePerPerson, travellersCount);
    }

    const updated = this.tripsRepository.update(id, {
      guideId: dto.guideId ?? trip.guideId,
      status: dto.status ?? trip.status,
      itinerary,
      totalAmount,
    });

    if (!updated) throw new NotFoundException(`Trip ${id} not found`);
    return updated;
  }

  assignGuide(tripId: string, guideId: string): Trip {
    const trip = this.findOne(tripId);
    this.assertGuideAvailableForTrip(guideId, trip);
    const updated = this.tripsRepository.update(trip.id, {
      guideId,
      status: TripStatus.CONFIRMED,
    });
    if (!updated) throw new NotFoundException(`Trip ${tripId} not found`);
    return updated;
  }

  private assertGuideAvailableForTrip(guideId: string, trip: Trip): void {
    const guide = this.guideRepository.findById(guideId);
    if (!guide) {
      throw new NotFoundException(`Guide ${guideId} not found`);
    }
    const conflicts = findGuideConflicts(
      trip,
      guideId,
      this.tripsRepository.findAll(),
    );
    if (conflicts.length > 0) {
      throw new BadRequestException(
        `Guide ${guideId} already has a conflicting assignment during ${trip.id}`,
      );
    }
  }

  updateTracking(
    id: string,
    dto: UpdateTripTrackingDto,
    actor?: { userId?: string; role?: string },
  ) {
    const role = actor?.role;
    // An NTA may only touch trips in their own region (findOne enforces it with the actor).
    const trip = role === 'nontechadmin' ? this.findOne(id, actor) : this.findOne(id);
    const isAdmin = role === 'superadmin' || role === 'nontechadmin';
    const isAssignedGuide = role === 'guide' && trip.guideId === actor?.userId;

    if (!isAdmin && !isAssignedGuide) {
      throw new ForbiddenException('Only the assigned guide can update tracking');
    }
    // Starting, pausing and completing a tour (which also moves the trip to started/completed)
    // belong to the assigned guide, not to the NTA.
    if (
      role === 'nontechadmin' &&
      dto.trackingStatus !== undefined &&
      dto.trackingStatus !== trip.trackingStatus
    ) {
      throw new ForbiddenException('Only the assigned guide can start, pause or complete a tour.');
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

  private resolveTravellerCount(trip: Trip, basePrice: number): number {
    if (typeof trip.travellers === 'number' && trip.travellers >= 1) {
      return trip.travellers;
    }
    const perPersonBefore = this.calculateTotalAmount(trip.itinerary, basePrice, 1);
    if (perPersonBefore > 0 && trip.totalAmount > 0) {
      return Math.max(1, Math.round(trip.totalAmount / perPersonBefore));
    }
    return 1;
  }

  private calculateTotalAmount(
    itinerary: StructuredItinerary,
    basePrice: number,
    travellers = 1,
  ): number {
    const flightAmount = itinerary.day1.flight ? 12000 : 0;
    const hotelAmount = itinerary.day1.hotel ? 18000 : 0;
    const experienceAmount = itinerary.days.reduce(
      (sum, day) => sum + day.experiences.length * 3500,
      0,
    );

    const perPerson = Math.max(basePrice, flightAmount + hotelAmount + experienceAmount);
    return perPerson * Math.max(1, Number(travellers) || 1);
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

    if (isOwner) {
      assertBookingCancellationEligible(trip, 'trip');
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
