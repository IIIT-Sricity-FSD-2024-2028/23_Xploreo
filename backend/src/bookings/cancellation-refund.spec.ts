import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsRepository } from './bookings.repository';
import { BookingStatus } from './entities/booking.entity';
import { HotelsRepository } from '../hotels/hotels.repository';
import { HotelsService } from '../hotels/hotels.service';
import { RefundService } from '../common/refund/refund.service';
import { RefundStatus } from '../common/refund/refund.types';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { ExperienceBookingsService } from '../experience-bookings/experience-bookings.service';
import { ExperienceBookingsRepository } from '../experience-bookings/experience-bookings.repository';
import { ExperienceBookingStatus } from '../experience-bookings/entities/experience-booking.entity';
import { ExperiencesRepository } from '../experiences/experiences.repository';
import { GuideRepository } from '../guide/guide.repository';
import { TripsService } from '../trips/trips.service';
import { TripsRepository } from '../trips/trips.repository';
import { PlansRepository } from '../plans/plans.repository';
import { PartnerProfileRepository } from '../hotels/partner-profile.repository';
import { RoomTypesRepository } from '../hotels/room-types.repository';
import { TripStatus } from '../trips/entities/trip.entity';
import { Role } from '../auth/entities/auth.entity';
import { BookingsController } from './bookings.controller';
import { ExperienceBookingsController } from '../experience-bookings/experience-bookings.controller';
import { TripsController } from '../trips/trips.controller';
import { NotificationsController } from '../notifications/notifications.controller';

describe('Booking Cancellation & Honest Refund Processing Specification', () => {
  const futureIsoDate = (daysAhead: number) =>
    new Date(Date.now() + daysAhead * 24 * 3600 * 1000).toISOString().slice(0, 10);

  let bookingsRepo: BookingsRepository;
  let hotelsRepo: HotelsRepository;
  let roomsRepo: RoomTypesRepository;
  let partnerProfileRepo: PartnerProfileRepository;
  let hotelsService: HotelsService;
  let refundService: RefundService;
  let notificationsRepo: NotificationsRepository;
  let notificationsService: NotificationsService;
  let bookingsService: BookingsService;
  let bookingsController: BookingsController;

  let expBookingsRepo: ExperienceBookingsRepository;
  let experiencesRepo: ExperiencesRepository;
  let guideRepo: GuideRepository;
  let expBookingsService: ExperienceBookingsService;
  let expBookingsController: ExperienceBookingsController;

  let tripsRepo: TripsRepository;
  let plansRepo: PlansRepository;
  let tripsService: TripsService;
  let tripsController: TripsController;

  let notificationsController: NotificationsController;


  beforeEach(() => {
    bookingsRepo = new BookingsRepository();
    hotelsRepo = new HotelsRepository();
    roomsRepo = new RoomTypesRepository();
    partnerProfileRepo = new PartnerProfileRepository();
    hotelsService = new HotelsService(hotelsRepo, roomsRepo, bookingsRepo, partnerProfileRepo);
    refundService = new RefundService();
    notificationsRepo = new NotificationsRepository();
    notificationsService = new NotificationsService(notificationsRepo);

    bookingsService = new BookingsService(
      bookingsRepo,
      hotelsRepo,
      hotelsService,
      refundService,
      notificationsService,
    );

    expBookingsRepo = new ExperienceBookingsRepository();
    experiencesRepo = new ExperiencesRepository();
    guideRepo = new GuideRepository();
    expBookingsService = new ExperienceBookingsService(
      expBookingsRepo,
      experiencesRepo,
      guideRepo,
      refundService,
      notificationsService,
    );

    tripsRepo = new TripsRepository();
    plansRepo = new PlansRepository();
    tripsService = new TripsService(
      tripsRepo,
      plansRepo,
      guideRepo,
      refundService,
      notificationsService,
    );

    bookingsController = new BookingsController(bookingsService);
    expBookingsController = new ExperienceBookingsController(expBookingsService);
    tripsController = new TripsController(tripsService);
    notificationsController = new NotificationsController(notificationsService);
  });


  describe('1. Hotel Booking Cancellation & Refunds', () => {
    it.each([
      ['2026-11-14', false],
      ['2026-11-25', false],
      ['2026-11-26', true],
      ['2026-11-27', true],
    ])('handles hotel cancellation for checkout on %s at the India date boundary', (checkOut, canCancel) => {
      // The hotel calendar is already on November 26 while UTC is still on November 25.
      jest.useFakeTimers().setSystemTime(new Date('2026-11-25T18:35:00Z'));
      try {
        const booking = bookingsRepo.create({
          hotelId: 'hotel-hp001-1', travellerId: 'T001', guestName: 'Test Guest',
          email: 'guest@example.test', phone: '9000000000', checkIn: '2026-11-10',
          checkOut, guests: 1, roomType: 'Standard Room', totalAmount: 4000,
        });
        const cancel = () => bookingsService.cancel(booking.id, 'HP001', Role.HOTEL);

        if (canCancel) {
          expect(cancel().status).toBe(BookingStatus.CANCELLED);
        } else {
          expect(cancel).toThrow('Bookings whose dates have already passed cannot be cancelled.');
          expect(bookingsRepo.findRawById(booking.id)?.status).toBe(BookingStatus.CONFIRMED);
          expect(notificationsService.findByUser('T001')).toEqual([]);
        }
      } finally {
        jest.useRealTimers();
      }
    });

    it('should successfully cancel an eligible hotel booking, process simulated refund, and generate two notifications', () => {
      // Future date booking (eligible for free cancellation)
      const futureCheckIn = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const futureCheckOut = new Date(Date.now() + 13 * 24 * 3600 * 1000).toISOString().slice(0, 10);

      const created = bookingsRepo.create({
        hotelId: 'hotel-hp001-1',
        travellerId: 'T001',
        guestName: 'Anjali Sharma',
        email: 'anjali@xploreo.com',
        phone: '9123456780',
        checkIn: futureCheckIn,
        checkOut: futureCheckOut,
        guests: 2,
        roomType: 'Heritage Deluxe Room',
        rooms: 1,
        guestNames: ['Anjali Sharma'],
        totalAmount: 18000,
      });

      const cancelled = bookingsService.cancel(created.id, 'T001', Role.TRAVELLER, {
        reason: 'Change of schedule',
      });

      expect(cancelled.status).toBe(BookingStatus.CANCELLED);
      expect(cancelled.refundEligibility).toBe('ELIGIBLE');
      expect(cancelled.refundAmount).toBe(18000);
      expect(cancelled.refundStatus).toBe(RefundStatus.SUCCESS);
      expect(cancelled.refundReference).toBeDefined();
      expect(cancelled.refundReference).toContain('RF-SIM-');
      expect(cancelled.cancellationReason).toBe('Change of schedule');

      // Check persistent notifications for T001
      const notifs = notificationsService.findByUser('T001');
      expect(notifs.length).toBe(2);

      // 1st notification: Cancellation confirmation
      const cancelNotif = notifs.find((n) => n.title === 'Booking Cancelled');
      expect(cancelNotif).toBeDefined();
      expect(cancelNotif?.message).toContain(`Your booking #${created.id} has been cancelled successfully. Refund status: SUCCESS.`);

      // 2nd notification: Genuine refund confirmation
      const refundNotif = notifs.find((n) => n.title === 'Refund Processed');
      expect(refundNotif).toBeDefined();
      expect(refundNotif?.message).toContain(`Your refund of ₹18000 for booking #${created.id} has been processed successfully.`);
    });

    it('should mark refund as NOT_ELIGIBLE when cancellation is past the free cancellation window', () => {
      // Today's booking, start time not passed (2 hours ahead in IST) -> cancellation allowed, but non-refundable
      const future2h = new Date(Date.now() + 2 * 3600 * 1000);
      const istParts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
          .formatToParts(future2h)
          .map(({ type, value }) => [type, value]),
      );
      const imminentCheckIn = `${istParts.year}-${istParts.month}-${istParts.day}`;
      const imminentCheckInTime = `${istParts.hour}:${istParts.minute}`;
      const imminentCheckOut = new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 10);

      const created = bookingsRepo.create({
        hotelId: 'hotel-hp001-1',
        travellerId: 'T001',
        guestName: 'Anjali Sharma',
        email: 'anjali@xploreo.com',
        phone: '9123456780',
        checkIn: imminentCheckIn,
        checkInTime: imminentCheckInTime,
        checkOut: imminentCheckOut,
        guests: 1,
        roomType: 'Standard Room',
        rooms: 1,
        guestNames: ['Anjali Sharma'],
        totalAmount: 5000,
      });

      const cancelled = bookingsService.cancel(created.id, 'T001', Role.TRAVELLER, {
        reason: 'Late emergency',
      });

      expect(cancelled.status).toBe(BookingStatus.CANCELLED);
      expect(cancelled.refundEligibility).toBe('NOT_ELIGIBLE');
      expect(cancelled.refundAmount).toBe(0);
      expect(cancelled.refundStatus).toBe(RefundStatus.NOT_ELIGIBLE);
      expect(cancelled.refundReference).toBeUndefined();

      // Only 1 notification generated (no false refund success notification!)
      const notifs = notificationsService.findByUser('T001');
      expect(notifs.length).toBe(1);
      expect(notifs[0].title).toBe('Booking Cancelled');
      expect(notifs[0].message).toContain(`Your booking #${created.id} has been cancelled successfully. Refund status: NOT_ELIGIBLE.`);
    });

    it('should prevent duplicate cancellation requests', () => {
      const created = bookingsRepo.create({
        hotelId: 'hotel-hp001-1',
        travellerId: 'T001',
        guestName: 'Anjali Sharma',
        email: 'anjali@xploreo.com',
        phone: '9123456780',
        checkIn: futureIsoDate(10),
        checkOut: futureIsoDate(13),
        guests: 1,
        roomType: 'Standard',
        rooms: 1,
        guestNames: ['Anjali Sharma'],
        totalAmount: 8000,
      });

      // First cancel succeeds
      bookingsService.cancel(created.id, 'T001', Role.TRAVELLER);

      // Second cancel must throw BadRequestException
      expect(() => bookingsService.cancel(created.id, 'T001', Role.TRAVELLER)).toThrow(
        BadRequestException,
      );
    });

    it('should prevent unauthorized travellers from cancelling another user booking', () => {
      const created = bookingsRepo.create({
        hotelId: 'hotel-hp001-1',
        travellerId: 'VICTIM_USER',
        guestName: 'Victim User',
        email: 'victim@example.com',
        phone: '9000000000',
        checkIn: futureIsoDate(10),
        checkOut: futureIsoDate(13),
        guests: 1,
        roomType: 'Standard',
        rooms: 1,
        guestNames: ['Victim User'],
        totalAmount: 8000,
      });

      // Attacker attempts to cancel
      expect(() => bookingsService.cancel(created.id, 'ATTACKER_USER', Role.TRAVELLER)).toThrow(
        ForbiddenException,
      );
    });

    it('should isolate notifications so only the affected traveller receives notifications', () => {
      const created = bookingsRepo.create({
        hotelId: 'hotel-hp001-1',
        travellerId: 'T001',
        guestName: 'Anjali Sharma',
        email: 'anjali@xploreo.com',
        phone: '9123456780',
        checkIn: futureIsoDate(10),
        checkOut: futureIsoDate(13),
        guests: 1,
        roomType: 'Standard',
        rooms: 1,
        guestNames: ['Anjali Sharma'],
        totalAmount: 8000,
      });

      bookingsService.cancel(created.id, 'T001', Role.TRAVELLER);

      expect(notificationsService.findByUser('T001').length).toBe(2);
      expect(notificationsService.findByUser('OTHER_USER').length).toBe(0);
      expect(notificationsService.getUnreadCount('T001').unreadCount).toBe(2);
      expect(notificationsService.getUnreadCount('OTHER_USER').unreadCount).toBe(0);
    });

    it('should handle simulated refund failure and allow subsequent retry', () => {
      const created = bookingsRepo.create({
        hotelId: 'hotel-hp001-1',
        travellerId: 'T001',
        guestName: 'Anjali Sharma',
        email: 'anjali@xploreo.com',
        phone: '9123456780',
        checkIn: futureIsoDate(10),
        checkOut: futureIsoDate(13),
        guests: 1,
        roomType: 'Standard',
        rooms: 1,
        guestNames: ['Anjali Sharma'],
        totalAmount: 8000,
      });

      // Simulate gateway failure
      const cancelled = bookingsService.cancel(created.id, 'T001', Role.TRAVELLER, {
        simulatedOutcome: 'FAILURE',
      });

      expect(cancelled.status).toBe(BookingStatus.CANCELLED);
      expect(cancelled.refundStatus).toBe(RefundStatus.FAILED);

      // Notifications should report failed status
      const notifs = notificationsService.findByUser('T001');
      const failNotif = notifs.find((n) => n.title === 'Refund Processing Failed');
      expect(failNotif).toBeDefined();

      // Retry the refund
      const retried = bookingsService.retryRefund(created.id, 'T001', Role.TRAVELLER);
      expect(retried.refundStatus).toBe(RefundStatus.SUCCESS);
      expect(retried.refundReference).toBeDefined();

      // Duplicate retry should now be rejected
      expect(() => bookingsService.retryRefund(created.id, 'T001', Role.TRAVELLER)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('2. Experience Booking Cancellation & Refunds', () => {
    it('should cancel an experience booking, calculate refund, and create in-app notifications', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const created = expBookingsRepo.create({
        experienceId: 'exp-1',
        travellerId: 'T001',
        guestName: 'Anjali Sharma',
        email: 'anjali@xploreo.com',
        phone: '9123456780',
        date: futureDate,
        participants: 2,
        totalAmount: 1800,
      });

      const cancelled = expBookingsService.cancel(
        created.id,
        { userId: 'T001', role: Role.TRAVELLER },
        { reason: 'Weather concerns' },
      );

      expect(cancelled.status).toBe(ExperienceBookingStatus.CANCELLED);
      expect(cancelled.refundEligibility).toBe('ELIGIBLE');
      expect(cancelled.refundStatus).toBe(RefundStatus.SUCCESS);
      expect(cancelled.refundReference).toContain('RF-SIM-');
      expect(cancelled.cancellationReason).toBe('Weather concerns');

      const notifs = notificationsService.findByUser('T001');
      expect(notifs.length).toBe(2);
      const cancelNotif = notifs.find((n) => n.title === 'Booking Cancelled');
      const refundNotif = notifs.find((n) => n.title === 'Refund Processed');
      expect(cancelNotif?.message).toContain(`Your booking #${created.id} has been cancelled successfully. Refund status: SUCCESS.`);
      expect(refundNotif?.message).toContain(`Your refund of ₹${cancelled.refundAmount} for booking #${created.id} has been processed successfully.`);
    });

    it('should prevent cancelling a completed or already cancelled experience booking', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const created = expBookingsRepo.create({
        experienceId: 'exp-1',
        travellerId: 'T001',
        guestName: 'Anjali Sharma',
        email: 'anjali@xploreo.com',
        phone: '9123456780',
        date: futureDate,
        participants: 2,
        totalAmount: 1800,
      });

      expBookingsService.cancel(created.id, { userId: 'T001', role: Role.TRAVELLER });

      // Repeating cancel throws BadRequestException
      expect(() =>
        expBookingsService.cancel(created.id, { userId: 'T001', role: Role.TRAVELLER }),
      ).toThrow(BadRequestException);
    });
  });

  describe('3. Trip Booking Cancellation & Refunds', () => {
    const createConfirmedFutureTrip = () =>
      tripsRepo.create({
        travellerId: 'T001',
        planId: 'plan-1',
        guideId: 'G001',
        status: TripStatus.CONFIRMED,
        totalAmount: 47000,
        itinerary: {
          day1: {
            hotel: {
              id: 'ht-test-1',
              hotelId: 'hotel-hp001-2',
              name: 'Xploreo Backwater Resort',
              checkInDate: futureIsoDate(10),
              checkOutDate: futureIsoDate(15),
              roomType: 'Backwater Villa',
              status: 'confirmed',
            },
          },
        },
      });

    it('should cancel a trip booking, evaluate 48h policy, and process refund', () => {
      const trip = createConfirmedFutureTrip();
      expect(trip).toBeDefined();

      const cancelled = tripsService.cancel(
        trip.id,
        { userId: trip.travellerId, role: 'traveller' },
        { reason: 'Trip rescheduled' },
      );

      expect(cancelled.status).toBe(TripStatus.CANCELLED);
      expect(cancelled.refundEligibility).toBe('ELIGIBLE');
      expect(cancelled.refundStatus).toBe(RefundStatus.SUCCESS);
      expect(cancelled.refundReference).toContain('RF-SIM-');

      const notifs = notificationsService.findByUser(trip.travellerId);
      expect(notifs.length).toBe(2);
      const cancelNotif = notifs.find((n) => n.title === 'Trip Cancelled');
      expect(cancelNotif?.message).toContain(`Your booking #${trip.id} has been cancelled successfully. Refund status: SUCCESS.`);
    });

    it('should reject repeated cancellation of an already cancelled trip', () => {
      const trip = createConfirmedFutureTrip();

      if (trip.status !== TripStatus.CANCELLED) {
        tripsService.cancel(trip.id, { userId: trip.travellerId, role: 'traveller' });
      }

      expect(() =>
        tripsService.cancel(trip.id, { userId: trip.travellerId, role: 'traveller' }),
      ).toThrow(BadRequestException);
    });
  });

  describe('4. Cross-User Authorization & Security Guards (Scenario 9)', () => {
    it('should reject unauthorized cancellation of another traveller experience booking', () => {
      const created = expBookingsRepo.create({
        experienceId: 'exp-1',
        travellerId: 'LEGIT_USER',
        guestName: 'Legit User',
        email: 'legit@example.com',
        phone: '9123456780',
        date: futureIsoDate(10),
        participants: 2,
        totalAmount: 2000,
      });

      expect(() =>
        expBookingsService.cancel(created.id, { userId: 'ATTACKER_USER', role: Role.TRAVELLER }),
      ).toThrow(ForbiddenException);
    });

    it('should reject unauthorized refund retry for another traveller experience booking', () => {
      const created = expBookingsRepo.create({
        experienceId: 'exp-1',
        travellerId: 'LEGIT_USER',
        guestName: 'Legit User',
        email: 'legit@example.com',
        phone: '9123456780',
        date: futureIsoDate(10),
        participants: 2,
        totalAmount: 2000,
      });

      // Legit user cancels with simulated failure
      expBookingsService.cancel(created.id, { userId: 'LEGIT_USER', role: Role.TRAVELLER }, {
        simulatedOutcome: 'FAILURE',
      });

      // Attacker attempts to retry refund
      expect(() =>
        expBookingsService.retryRefund(created.id, { userId: 'ATTACKER_USER', role: Role.TRAVELLER }),
      ).toThrow(ForbiddenException);
    });

    it('should reject unauthorized cancellation of another traveller trip', () => {
      const trip = tripsRepo.create({
        travellerId: 'T001',
        planId: 'plan-1',
        guideId: 'G001',
        status: TripStatus.CONFIRMED,
        totalAmount: 47000,
        itinerary: { day1: { hotel: { checkInDate: futureIsoDate(10), checkOutDate: futureIsoDate(15) } } },
      });

      expect(() =>
        tripsService.cancel(trip.id, { userId: 'ATTACKER_USER', role: 'traveller' }),
      ).toThrow(ForbiddenException);
    });

    it('should reject unauthorized refund retry of another traveller trip', () => {
      const trip = tripsRepo.create({
        travellerId: 'T001',
        planId: 'plan-1',
        guideId: 'G001',
        status: TripStatus.CONFIRMED,
        totalAmount: 47000,
        itinerary: { day1: { hotel: { checkInDate: futureIsoDate(10), checkOutDate: futureIsoDate(15) } } },
      });

      // Owner cancels with failure
      tripsService.cancel(
        trip.id,
        { userId: trip.travellerId, role: 'traveller' },
        { simulatedOutcome: 'FAILURE' },
      );

      // Attacker attempts to retry
      expect(() =>
        tripsService.retryRefund(trip.id, { userId: 'ATTACKER_USER', role: 'traveller' }),
      ).toThrow(ForbiddenException);
    });

    it('should reject unauthorized markAsRead on notifications belonging to another user', () => {
      const notif = notificationsService.create({
        userId: 'USER_A',
        title: 'Booking Cancelled',
        message: 'Your booking has been cancelled.',
      });

      expect(() => notificationsService.markAsRead(notif.id, 'USER_B')).toThrow(NotFoundException);
    });
  });

  describe('5. Notification Bell Unread Counter & Read State Lifecycle (Scenarios 5 & 6)', () => {
    it('should accurately track unread counts across cancellations and refund confirmations', () => {
      expect(notificationsService.getUnreadCount('T001').unreadCount).toBe(0);

      // Create and cancel hotel booking
      const created = bookingsRepo.create({
        hotelId: 'hotel-hp001-1',
        travellerId: 'T001',
        guestName: 'Anjali Sharma',
        email: 'anjali@xploreo.com',
        phone: '9123456780',
        checkIn: futureIsoDate(10),
        checkOut: futureIsoDate(13),
        guests: 1,
        roomType: 'Standard',
        rooms: 1,
        guestNames: ['Anjali Sharma'],
        totalAmount: 8000,
      });

      bookingsService.cancel(created.id, 'T001', Role.TRAVELLER);

      // Successful refund generates 2 notifications
      expect(notificationsService.getUnreadCount('T001').unreadCount).toBe(2);

      const notifs = notificationsService.findByUser('T001');
      expect(notifs.length).toBe(2);

      // Mark first notification as read
      notificationsService.markAsRead(notifs[0].id, 'T001');
      expect(notificationsService.getUnreadCount('T001').unreadCount).toBe(1);

      // Mark all remaining as read
      const res = notificationsService.markAllAsRead('T001');
      expect(res.updated).toBe(1);
      expect(notificationsService.getUnreadCount('T001').unreadCount).toBe(0);
    });
  });

  describe('6. Controller Endpoint Execution & Contract Validation (Scenarios 11 & 12)', () => {
    it('should successfully execute BookingsController cancellation and retry endpoints', () => {
      const created = bookingsRepo.create({
        hotelId: 'hotel-hp001-1',
        travellerId: 'T001',
        guestName: 'Anjali Sharma',
        email: 'anjali@xploreo.com',
        phone: '9123456780',
        checkIn: futureIsoDate(10),
        checkOut: futureIsoDate(13),
        guests: 1,
        roomType: 'Standard',
        rooms: 1,
        guestNames: ['Anjali Sharma'],
        totalAmount: 8000,
      });

      const reqMock = { user: { userId: 'T001', role: Role.TRAVELLER } };
      const res = bookingsController.cancel(created.id, reqMock, { reason: 'Controller test', simulatedOutcome: 'FAILURE' });
      expect(res.status).toBe(BookingStatus.CANCELLED);
      expect(res.refundStatus).toBe(RefundStatus.FAILED);

      const retryRes = bookingsController.retryRefund(created.id, reqMock);
      expect(retryRes.refundStatus).toBe(RefundStatus.SUCCESS);
    });

    it('should successfully execute ExperienceBookingsController endpoints', () => {
      const created = expBookingsRepo.create({
        experienceId: 'exp-1',
        travellerId: 'T001',
        guestName: 'Anjali Sharma',
        email: 'anjali@xploreo.com',
        phone: '9123456780',
        date: futureIsoDate(10),
        participants: 2,
        totalAmount: 2000,
      });

      const reqMock = { user: { userId: 'T001', role: Role.TRAVELLER } };
      const res = expBookingsController.cancel(created.id, reqMock, { simulatedOutcome: 'FAILURE' });
      expect(res.status).toBe(ExperienceBookingStatus.CANCELLED);
      expect(res.refundStatus).toBe(RefundStatus.FAILED);

      const retryRes = expBookingsController.retryRefund(created.id, reqMock);
      expect(retryRes.refundStatus).toBe(RefundStatus.SUCCESS);
    });

    it('should successfully execute TripsController endpoints', () => {
      const trip = tripsRepo.create({
        travellerId: 'T001',
        planId: 'plan-1',
        guideId: 'G001',
        status: TripStatus.CONFIRMED,
        totalAmount: 47000,
        itinerary: { day1: { hotel: { checkInDate: futureIsoDate(10), checkOutDate: futureIsoDate(15) } } },
      });
      const reqMock = { user: { userId: trip.travellerId, role: Role.TRAVELLER } };

      const res = tripsController.cancel(trip.id, reqMock, { simulatedOutcome: 'FAILURE' });
      expect(res.status).toBe(TripStatus.CANCELLED);
      expect(res.refundStatus).toBe(RefundStatus.FAILED);

      const retryRes = tripsController.retryRefund(trip.id, reqMock);
      expect(retryRes.refundStatus).toBe(RefundStatus.SUCCESS);
    });

    it('should successfully execute NotificationsController endpoints', () => {
      const reqMock = { user: { userId: 'T001', role: Role.TRAVELLER } };

      notificationsService.create({
        userId: 'T001',
        title: 'Test Notification',
        message: 'Hello traveller',
      });

      const count = notificationsController.getUnreadCount(reqMock);
      expect(count.unreadCount).toBeGreaterThanOrEqual(1);

      const list = notificationsController.findAll(reqMock);
      expect(list.length).toBeGreaterThanOrEqual(1);

      const marked = notificationsController.markAsRead(list[0].id, reqMock);
      expect(marked.read).toBe(true);

      const allMarked = notificationsController.markAllAsRead(reqMock);
      expect(typeof allMarked.updated).toBe('number');
    });
  });

  describe('7. Server Restart & Memory Persistence Audit (Scenario 10)', () => {
    it('demonstrates that in-memory repository data does not survive a server restart', () => {
      // 1. Create runtime data in existing in-memory repository instances
      const created = bookingsRepo.create({
        hotelId: 'hotel-hp001-1',
        travellerId: 'T001',
        guestName: 'Anjali Sharma',
        email: 'anjali@xploreo.com',
        phone: '9123456780',
        checkIn: futureIsoDate(10),
        checkOut: futureIsoDate(13),
        guests: 1,
        roomType: 'Standard',
        rooms: 1,
        guestNames: ['Anjali Sharma'],
        totalAmount: 8000,
      });

      bookingsService.cancel(created.id, 'T001', Role.TRAVELLER);
      expect(notificationsService.findByUser('T001').length).toBeGreaterThan(0);

      // 2. Simulate Server Restart: New Repository Instances are created
      const restartedNotificationsRepo = new NotificationsRepository();
      const restartedBookingsRepo = new BookingsRepository();

      // Notifications created at runtime are lost upon server restart
      expect(restartedNotificationsRepo.findByUser('T001')).toEqual([]);
      expect(restartedNotificationsRepo.getUnreadCount('T001')).toBe(0);

      // Bookings created at runtime are not in the fresh seed
      expect(restartedBookingsRepo.findById(created.id)).toBeUndefined();
    });
  });

  describe('8. Consistent Cancellation Date & Time Validation Across All Booking Types', () => {
    const fixedNow = new Date('2026-11-28T12:00:00+05:30'); // 12:00 PM IST on Nov 28, 2026

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(fixedNow);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('Hotel Bookings', () => {
      it('Scenario 1 (Past booking): blocks cancellation when check-in date has passed', () => {
        const booking = bookingsRepo.create({
          hotelId: 'hotel-hp001-1',
          travellerId: 'T001',
          guestName: 'Anjali Sharma',
          email: 'anjali@xploreo.com',
          phone: '9123456780',
          checkIn: '2026-11-20',
          checkOut: '2026-11-23',
          guests: 1,
          roomType: 'Standard Room',
          rooms: 1,
          guestNames: ['Anjali Sharma'],
          totalAmount: 6000,
        });

        expect(() => bookingsService.cancel(booking.id, 'T001', Role.TRAVELLER)).toThrow(
          'This booking can no longer be cancelled because its scheduled date has passed.',
        );
      });

      it("Scenario 2 (Today's booking, start time NOT passed): allows cancellation", () => {
        const booking = bookingsRepo.create({
          hotelId: 'hotel-hp001-1',
          travellerId: 'T001',
          guestName: 'Anjali Sharma',
          email: 'anjali@xploreo.com',
          phone: '9123456780',
          checkIn: '2026-11-28',
          checkInTime: '15:00', // 3:00 PM IST > 12:00 PM IST
          checkOut: '2026-11-30',
          guests: 1,
          roomType: 'Standard Room',
          rooms: 1,
          guestNames: ['Anjali Sharma'],
          totalAmount: 6000,
        });

        const cancelled = bookingsService.cancel(booking.id, 'T001', Role.TRAVELLER);
        expect(cancelled.status).toBe(BookingStatus.CANCELLED);
      });

      it("Scenario 3 (Today's booking, start time passed): blocks cancellation", () => {
        const booking = bookingsRepo.create({
          hotelId: 'hotel-hp001-1',
          travellerId: 'T001',
          guestName: 'Anjali Sharma',
          email: 'anjali@xploreo.com',
          phone: '9123456780',
          checkIn: '2026-11-28',
          checkInTime: '10:00', // 10:00 AM IST < 12:00 PM IST
          checkOut: '2026-11-30',
          guests: 1,
          roomType: 'Standard Room',
          rooms: 1,
          guestNames: ['Anjali Sharma'],
          totalAmount: 6000,
        });

        expect(() => bookingsService.cancel(booking.id, 'T001', Role.TRAVELLER)).toThrow(
          'This booking can no longer be cancelled because its scheduled date has passed.',
        );
      });

      it('Scenario 4 (Future booking): allows cancellation according to policy', () => {
        const booking = bookingsRepo.create({
          hotelId: 'hotel-hp001-1',
          travellerId: 'T001',
          guestName: 'Anjali Sharma',
          email: 'anjali@xploreo.com',
          phone: '9123456780',
          checkIn: '2026-12-05',
          checkOut: '2026-12-08',
          guests: 1,
          roomType: 'Standard Room',
          rooms: 1,
          guestNames: ['Anjali Sharma'],
          totalAmount: 7000,
        });

        const cancelled = bookingsService.cancel(booking.id, 'T001', Role.TRAVELLER);
        expect(cancelled.status).toBe(BookingStatus.CANCELLED);
      });

      it('Scenario 5 (Already cancelled booking): blocks duplicate cancellation', () => {
        const booking = bookingsRepo.create({
          hotelId: 'hotel-hp001-1',
          travellerId: 'T001',
          guestName: 'Anjali Sharma',
          email: 'anjali@xploreo.com',
          phone: '9123456780',
          checkIn: '2026-12-10',
          checkOut: '2026-12-13',
          guests: 1,
          roomType: 'Standard Room',
          rooms: 1,
          guestNames: ['Anjali Sharma'],
          totalAmount: 7000,
        });

        bookingsService.cancel(booking.id, 'T001', Role.TRAVELLER);
        expect(() => bookingsService.cancel(booking.id, 'T001', Role.TRAVELLER)).toThrow(
          'Booking is already cancelled.',
        );
      });

      it('Scenario 6 (Invalid/missing booking date): blocks cancellation safely', () => {
        const booking = bookingsRepo.create({
          hotelId: 'hotel-hp001-1',
          travellerId: 'T001',
          guestName: 'Anjali Sharma',
          email: 'anjali@xploreo.com',
          phone: '9123456780',
          checkIn: 'invalid-date',
          checkOut: '2026-12-13',
          guests: 1,
          roomType: 'Standard Room',
          rooms: 1,
          guestNames: ['Anjali Sharma'],
          totalAmount: 7000,
        });

        expect(() => bookingsService.cancel(booking.id, 'T001', Role.TRAVELLER)).toThrow(
          'This booking cannot be cancelled because its scheduled date is missing or invalid.',
        );
      });
    });

    describe('Experience Bookings', () => {
      it('Scenario 1 (Past booking): blocks cancellation when experience date has passed', () => {
        const booking = expBookingsRepo.create({
          experienceId: 'exp-jaipur-cooking',
          travellerId: '20001',
          guestName: 'Anjali Sharma',
          email: 'anjali@xploreo.com',
          phone: '9123456780',
          date: '2026-11-20',
          participants: 2,
          totalAmount: 3600,
        });

        expect(() =>
          expBookingsService.cancel(booking.id, { userId: '20001', role: Role.TRAVELLER }),
        ).toThrow('This booking can no longer be cancelled because its scheduled date has passed.');
      });

      it("Scenario 2 (Today's booking, start time NOT passed): allows cancellation", () => {
        const booking = expBookingsRepo.create({
          experienceId: 'exp-jaipur-cooking',
          travellerId: '20001',
          guestName: 'Anjali Sharma',
          email: 'anjali@xploreo.com',
          phone: '9123456780',
          date: '2026-11-28',
          time: '16:00', // 4:00 PM IST > 12:00 PM IST
          participants: 2,
          totalAmount: 3600,
        });

        const cancelled = expBookingsService.cancel(booking.id, {
          userId: '20001',
          role: Role.TRAVELLER,
        });
        expect(cancelled.status).toBe(ExperienceBookingStatus.CANCELLED);
      });

      it("Scenario 3 (Today's booking, start time passed): blocks cancellation", () => {
        const booking = expBookingsRepo.create({
          experienceId: 'exp-jaipur-cooking',
          travellerId: '20001',
          guestName: 'Anjali Sharma',
          email: 'anjali@xploreo.com',
          phone: '9123456780',
          date: '2026-11-28',
          time: '10:00', // 10:00 AM IST < 12:00 PM IST
          participants: 2,
          totalAmount: 3600,
        });

        expect(() =>
          expBookingsService.cancel(booking.id, { userId: '20001', role: Role.TRAVELLER }),
        ).toThrow('This booking can no longer be cancelled because its scheduled date has passed.');
      });

      it('Scenario 4 (Future booking): allows cancellation according to policy', () => {
        const booking = expBookingsRepo.create({
          experienceId: 'exp-jaipur-cooking',
          travellerId: '20001',
          guestName: 'Anjali Sharma',
          email: 'anjali@xploreo.com',
          phone: '9123456780',
          date: '2026-12-05',
          participants: 2,
          totalAmount: 3600,
        });

        const cancelled = expBookingsService.cancel(booking.id, {
          userId: '20001',
          role: Role.TRAVELLER,
        });
        expect(cancelled.status).toBe(ExperienceBookingStatus.CANCELLED);
      });

      it('Scenario 5 (Already cancelled booking): blocks duplicate cancellation', () => {
        const booking = expBookingsRepo.create({
          experienceId: 'exp-jaipur-cooking',
          travellerId: '20001',
          guestName: 'Anjali Sharma',
          email: 'anjali@xploreo.com',
          phone: '9123456780',
          date: '2026-12-10',
          participants: 2,
          totalAmount: 3600,
        });

        expBookingsService.cancel(booking.id, { userId: '20001', role: Role.TRAVELLER });
        expect(() =>
          expBookingsService.cancel(booking.id, { userId: '20001', role: Role.TRAVELLER }),
        ).toThrow('Booking is already cancelled.');
      });

      it('Scenario 6 (Invalid/missing booking date): blocks cancellation safely', () => {
        const booking = expBookingsRepo.create({
          experienceId: 'exp-jaipur-cooking',
          travellerId: '20001',
          guestName: 'Anjali Sharma',
          email: 'anjali@xploreo.com',
          phone: '9123456780',
          date: '2026-02-31', // non-existent calendar date
          participants: 2,
          totalAmount: 3600,
        });

        expect(() =>
          expBookingsService.cancel(booking.id, { userId: '20001', role: Role.TRAVELLER }),
        ).toThrow('This booking cannot be cancelled because its scheduled date is missing or invalid.');
      });
    });

    describe('Holiday Package / Trip Bookings', () => {
      it('Scenario 1 (Past booking): blocks cancellation when trip start date has passed', () => {
        const trip = tripsRepo.create({
          travellerId: '20001',
          planId: 'plan-1',
          itinerary: {
            day1: {
              hotel: {
                checkInDate: '2026-11-20',
                checkInTime: '14:00',
              },
            },
          } as any,
        });

        expect(() =>
          tripsService.cancel(trip.id, { userId: '20001', role: 'traveller' }),
        ).toThrow('This booking can no longer be cancelled because its scheduled date has passed.');
      });

      it("Scenario 2 (Today's booking, start time NOT passed): allows cancellation", () => {
        const trip = tripsRepo.create({
          travellerId: '20001',
          planId: 'plan-1',
          itinerary: {
            day1: {
              hotel: {
                checkInDate: '2026-11-28',
                checkInTime: '15:00', // 3:00 PM IST > 12:00 PM IST
              },
            },
          } as any,
        });

        const cancelled = tripsService.cancel(trip.id, { userId: '20001', role: 'traveller' });
        expect(cancelled.status).toBe(TripStatus.CANCELLED);
      });

      it("Scenario 3 (Today's booking, start time passed): blocks cancellation", () => {
        const trip = tripsRepo.create({
          travellerId: '20001',
          planId: 'plan-1',
          itinerary: {
            day1: {
              hotel: {
                checkInDate: '2026-11-28',
                checkInTime: '09:00', // 9:00 AM IST < 12:00 PM IST
              },
            },
          } as any,
        });

        expect(() =>
          tripsService.cancel(trip.id, { userId: '20001', role: 'traveller' }),
        ).toThrow('This booking can no longer be cancelled because its scheduled date has passed.');
      });

      it('Scenario 4 (Future booking): allows cancellation according to policy', () => {
        const trip = tripsRepo.create({
          travellerId: '20001',
          planId: 'plan-1',
          itinerary: {
            day1: {
              hotel: {
                checkInDate: '2026-12-15',
                checkInTime: '14:00',
              },
            },
          } as any,
        });

        const cancelled = tripsService.cancel(trip.id, { userId: '20001', role: 'traveller' });
        expect(cancelled.status).toBe(TripStatus.CANCELLED);
      });

      it('Scenario 5 (Already cancelled booking): blocks duplicate cancellation', () => {
        const trip = tripsRepo.create({
          travellerId: '20001',
          planId: 'plan-1',
          itinerary: {
            day1: {
              hotel: {
                checkInDate: '2026-12-15',
                checkInTime: '14:00',
              },
            },
          } as any,
        });

        tripsService.cancel(trip.id, { userId: '20001', role: 'traveller' });
        expect(() =>
          tripsService.cancel(trip.id, { userId: '20001', role: 'traveller' }),
        ).toThrow('Trip is already cancelled.');
      });

      it('Scenario 6 (Invalid/missing booking date): blocks cancellation safely', () => {
        const trip = tripsRepo.create({
          travellerId: '20001',
          planId: 'plan-1',
          itinerary: {} as any,
        });

        expect(() =>
          tripsService.cancel(trip.id, { userId: '20001', role: 'traveller' }),
        ).toThrow('This booking cannot be cancelled because its scheduled date is missing or invalid.');
      });
    });

    describe('Direct Controller HTTP Endpoint Invocations', () => {
      it('rejects cancellation on POST/PATCH endpoints for past hotel stays', () => {
        const booking = bookingsRepo.create({
          hotelId: 'hotel-hp001-1',
          travellerId: 'T001',
          guestName: 'Anjali Sharma',
          email: 'anjali@xploreo.com',
          phone: '9123456780',
          checkIn: '2026-11-15',
          checkOut: '2026-11-18',
          guests: 1,
          roomType: 'Standard Room',
          rooms: 1,
          guestNames: ['Anjali Sharma'],
          totalAmount: 5000,
        });

        expect(() =>
          bookingsController.cancel(
            booking.id,
            { user: { id: 'T001', userId: 'T001', role: Role.TRAVELLER } },
            { reason: 'Trying to cancel past stay' },
          ),
        ).toThrow('This booking can no longer be cancelled because its scheduled date has passed.');
      });

      it('rejects cancellation on POST/PATCH endpoints for past experience bookings', () => {
        const booking = expBookingsRepo.create({
          experienceId: 'exp-jaipur-cooking',
          travellerId: '20001',
          guestName: 'Anjali Sharma',
          email: 'anjali@xploreo.com',
          phone: '9123456780',
          date: '2026-11-15',
          participants: 2,
          totalAmount: 3600,
        });

        expect(() =>
          expBookingsController.cancel(
            booking.id,
            { user: { id: '20001', userId: '20001', role: Role.TRAVELLER } },
            { reason: 'Trying to cancel past experience' },
          ),
        ).toThrow('This booking can no longer be cancelled because its scheduled date has passed.');
      });

      it('rejects cancellation on POST/PATCH endpoints for past trip packages', () => {
        const trip = tripsRepo.create({
          travellerId: '20001',
          planId: 'plan-1',
          itinerary: {
            day1: {
              hotel: {
                checkInDate: '2026-11-15',
              },
            },
          } as any,
        });

        expect(() =>
          tripsController.cancel(
            trip.id,
            { user: { id: '20001', userId: '20001', role: 'traveller' } },
            { reason: 'Trying to cancel past package' },
          ),
        ).toThrow('This booking can no longer be cancelled because its scheduled date has passed.');
      });
    });
  });
});

