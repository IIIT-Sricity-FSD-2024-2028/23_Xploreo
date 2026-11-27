import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../app.module';
import { JWT_SECRET } from '../auth/auth.service';
import { Role } from '../auth/entities/auth.entity';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BookingsRepository } from '../bookings/bookings.repository';
import { BookingStatus } from '../bookings/entities/booking.entity';
import { ExperienceBookingsRepository } from '../experience-bookings/experience-bookings.repository';
import { ExperienceBookingStatus } from '../experience-bookings/entities/experience-booking.entity';
import { FinanceService } from '../finance/finance.service';
import { HotelsRepository } from '../hotels/hotels.repository';
import { PlansRepository } from '../plans/plans.repository';
import { ItineraryItemStatus } from '../common/entities/itinerary.entity';
import { TripStatus, TripTrackingStatus } from './entities/trip.entity';
import { TripsRepository } from './trips.repository';

function futureIso(daysAhead: number): string {
  return new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

describe('Phase 2 – NTA Package Booking Distribution & Partner Status Sync', () => {
  let app: INestApplication;
  let plansRepo: PlansRepository;
  let tripsRepo: TripsRepository;
  let bookingsRepo: BookingsRepository;
  let expBookingsRepo: ExperienceBookingsRepository;
  let hotelsRepo: HotelsRepository;
  let financeService: FinanceService;

  let ntaJaipurToken: string;
  let ntaOtherJaipurToken: string;
  let travellerToken: string;
  let hotelPartnerToken: string;
  let otherHotelPartnerToken: string;
  let expPartnerToken: string;
  let otherExpPartnerToken: string;

  let planId: string;
  let tripId: string;
  let hotelBookingId: string;
  let expBookingId: string;

  const h = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    const reflector = app.get(Reflector);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalGuards(new AuthGuard(reflector), new RolesGuard(reflector));
    await app.init();

    plansRepo = moduleRef.get(PlansRepository);
    tripsRepo = moduleRef.get(TripsRepository);
    bookingsRepo = moduleRef.get(BookingsRepository);
    expBookingsRepo = moduleRef.get(ExperienceBookingsRepository);
    hotelsRepo = moduleRef.get(HotelsRepository);
    financeService = moduleRef.get(FinanceService);

    const login = async (username: string, password: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username, password })
        .expect(201);
      return (res.body.token ?? res.body.data?.token) as string;
    };

    ntaJaipurToken = await login('NTA001', 'NTA@123');
    travellerToken = await login('T001', 'TRA@123');
    hotelPartnerToken = await login('HP001', 'HP@123');

    ntaOtherJaipurToken = jwt.sign(
      { userId: 'NTA-JAI-OTHER', username: 'NTA-JAI-OTHER', role: Role.NONTECHADMIN, region: 'Jaipur' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    otherHotelPartnerToken = jwt.sign(
      { userId: 'HP-OTHER', username: 'HP-OTHER', role: Role.HOTEL },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    expPartnerToken = jwt.sign(
      { userId: 'XP001', username: 'XP001', role: Role.EXPERIENCE },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    otherExpPartnerToken = jwt.sign(
      { userId: 'XP-OTHER', username: 'XP-OTHER', role: Role.EXPERIENCE },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    const checkIn = todayIso();
    const checkOut = futureIso(3);

    const planRes = await request(app.getHttpServer())
      .post('/api/plans')
      .set(h(ntaJaipurToken))
      .send({
        id: 'plan-qa-phase2-001',
        title: 'QA Phase 2 Jaipur Package',
        description: 'End-to-end dispatch and sync test',
        originCity: 'Delhi',
        destination: 'Jaipur',
        durationNights: 3,
        pricePerPerson: 26000,
        includesFlight: false,
        status: 'available',
        itinerary: {
          day1: {
            flight: null,
            transport: {
              id: 'tr-p2-1',
              mode: 'car',
              provider: 'Xploreo',
              pickupLocation: 'Jaipur Airport',
              dropoffLocation: 'HP-JAI-001',
              pickupAt: `${checkIn}T09:00:00.000Z`,
              status: 'planned',
            },
            hotel: {
              id: 'ht-p2-1',
              hotelId: 'HP-JAI-001',
              name: 'Royal Heritage Haveli',
              checkInDate: checkIn,
              checkOutDate: checkOut,
              roomType: 'Deluxe Room',
              status: 'planned',
            },
          },
          days: [
            {
              dayNumber: 2,
              experiences: [
                {
                  id: 'ex-p2-1',
                  experienceId: 'exp-1',
                  title: 'Amber Fort Trek',
                  location: 'Jaipur',
                  startsAt: `${futureIso(1)}T07:00:00.000Z`,
                  endsAt: `${futureIso(1)}T10:00:00.000Z`,
                  status: 'planned',
                },
              ],
            },
          ],
        },
      })
      .expect(201);

    planId = planRes.body.id;

    const tripRes = await request(app.getHttpServer())
      .post('/api/trips')
      .set(h(travellerToken))
      .send({
        id: 'trip-qa-phase2-001',
        travellerId: 'T001',
        planId,
        travellers: 2,
      })
      .expect(201);

    tripId = tripRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('2 & 7. Another NTA cannot dispatch the package; unpaid/draft bookings cannot be dispatched', async () => {
    await request(app.getHttpServer())
      .post(`/api/trips/nta/packages/${tripId}/dispatch`)
      .set(h(ntaOtherJaipurToken))
      .expect(403);

    const plan = plansRepo.findById(planId)!;
    const draft = tripsRepo.create({
      id: 'trip-qa-phase2-draft',
      travellerId: 'T001',
      planId,
      status: TripStatus.DRAFT,
      itinerary: plan.itinerary,
      travellers: 1,
      totalAmount: 26000,
      currentDay: 1,
      currentStop: 'Not started',
      currentLocation: 'Jaipur',
      trackingStatus: TripTrackingStatus.NOT_STARTED,
      progressPercentage: 0,
      lastUpdatedAt: new Date().toISOString(),
    });

    await request(app.getHttpServer())
      .post(`/api/trips/nta/packages/${draft.id}/dispatch`)
      .set(h(ntaJaipurToken))
      .expect(400);
  });

  it('1, 3, 4, 5 & 6. NTA dispatches owned package idempotently; Hotel & Experience components created with trusted partner ownership', async () => {
    const res1 = await request(app.getHttpServer())
      .post(`/api/trips/nta/packages/${tripId}/dispatch`)
      .set(h(ntaJaipurToken))
      .expect(201);

    expect(res1.body.failedComponents).toEqual([]);
    expect(res1.body.dispatched.hotel).toMatchObject({
      hotelId: 'HP-JAI-001',
      partnerId: hotelsRepo.findById('HP-JAI-001')!.partnerId,
      created: true,
    });
    expect(res1.body.dispatched.experiences).toHaveLength(1);
    expect(res1.body.dispatched.experiences[0]).toMatchObject({
      experienceId: 'exp-1',
      partnerId: 'XP001',
      created: true,
    });

    hotelBookingId = res1.body.dispatched.hotel.bookingId;
    expBookingId = res1.body.dispatched.experiences[0].bookingId;

    const hotelBooking = bookingsRepo.findById(hotelBookingId)!;
    expect(hotelBooking.tripId).toBe(tripId);
    expect(hotelBooking.isPackageComponent).toBe(true);
    expect(hotelBooking.packagePlanId).toBe(planId);
    expect(hotelBooking.totalAmount).toBe(0);

    const expBooking = expBookingsRepo.findById(expBookingId)!;
    expect(expBooking.tripId).toBe(tripId);
    expect(expBooking.isPackageComponent).toBe(true);
    expect(expBooking.packagePlanId).toBe(planId);
    expect(expBooking.totalAmount).toBe(0);

    // Repeated dispatch must be idempotent (no duplicate records)
    const countHotelsBefore = bookingsRepo.findByTripId(tripId).length;
    const countExpsBefore = expBookingsRepo.findByTripId(tripId).length;

    const res2 = await request(app.getHttpServer())
      .post(`/api/trips/nta/packages/${tripId}/dispatch`)
      .set(h(ntaJaipurToken))
      .expect(201);

    expect(res2.body.dispatched.hotel.idempotent).toBe(true);
    expect(res2.body.dispatched.experiences[0].idempotent).toBe(true);
    expect(bookingsRepo.findByTripId(tripId).length).toBe(countHotelsBefore);
    expect(expBookingsRepo.findByTripId(tripId).length).toBe(countExpsBefore);
  });

  it('8 & 9. Hotel Partner and Experience Partner see only their own package components', async () => {
    const hpRes = await request(app.getHttpServer())
      .get('/api/bookings')
      .set(h(hotelPartnerToken))
      .expect(200);
    expect((hpRes.body as Array<Record<string, any>>).some((b) => b.id === hotelBookingId)).toBe(true);

    const otherHpRes = await request(app.getHttpServer())
      .get('/api/bookings')
      .set(h(otherHotelPartnerToken))
      .expect(200);
    expect((otherHpRes.body as Array<Record<string, any>>).some((b) => b.id === hotelBookingId)).toBe(false);

    const xpRes = await request(app.getHttpServer())
      .get('/api/experience-bookings')
      .set(h(expPartnerToken))
      .expect(200);
    expect((xpRes.body as Array<Record<string, any>>).some((b) => b.id === expBookingId)).toBe(true);

    const otherXpRes = await request(app.getHttpServer())
      .get('/api/experience-bookings')
      .set(h(otherExpPartnerToken))
      .expect(200);
    expect((otherXpRes.body as Array<Record<string, any>>).some((b) => b.id === expBookingId)).toBe(false);
  });

  it('10, 11 & 12. Partner status updates synchronize to Trip without premature completion until all components complete', async () => {
    // Hotel partner checks in and checks out (1 of 2 components completed -> Trip STARTED / 50%, NOT COMPLETED)
    await request(app.getHttpServer())
      .patch(`/api/bookings/${hotelBookingId}/check-in`)
      .set(h(hotelPartnerToken))
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/bookings/${hotelBookingId}/check-out`)
      .set(h(hotelPartnerToken))
      .expect(200);

    const midTrip = tripsRepo.findById(tripId)!;
    expect(midTrip.status).toBe(TripStatus.STARTED);
    expect(midTrip.progressPercentage).toBe(50);

    // Experience partner checks in -> Traveller completes experience -> Trip reaches 100% COMPLETED
    await request(app.getHttpServer())
      .patch(`/api/experience-bookings/${expBookingId}/status`)
      .set(h(expPartnerToken))
      .send({ status: ExperienceBookingStatus.CHECKED_IN })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/experience-bookings/${expBookingId}/status`)
      .set(h(travellerToken))
      .send({ status: ExperienceBookingStatus.COMPLETED })
      .expect(200);

    const finalTrip = tripsRepo.findById(tripId)!;
    expect(finalTrip.status).toBe(TripStatus.COMPLETED);
    expect(finalTrip.trackingStatus).toBe(TripTrackingStatus.COMPLETED);
    expect(finalTrip.progressPercentage).toBe(100);
    expect(finalTrip.totalAmount).toBe(52000);
  });

  it('13 & 14. Standalone bookings work and FinanceService does not double-count package components', async () => {
    const before = financeService.summary({ userId: 'SA001', role: Role.SUPERADMIN });

    const standalone = await request(app.getHttpServer())
      .post('/api/bookings')
      .set(h(travellerToken))
      .send({
        id: 'qa-phase2-standalone-hotel',
        hotelId: 'HP-JAI-001',
        guestName: 'Anjali Sharma',
        email: 'anjali@example.com',
        phone: '+91 9876543210',
        checkIn: futureIso(25),
        checkOut: futureIso(27),
        guests: 2,
        roomType: 'Maharaja Suite',
        rooms: 1,
      })
      .expect(201);

    const after = financeService.summary({ userId: 'SA001', role: Role.SUPERADMIN });
    expect(after.totals.upcoming - before.totals.upcoming).toBe(standalone.body.totalAmount);
  });

  it('Phase 2.1 (1-4): Maps Hotel CHECKED_IN/CHECKED_OUT and Experience END_REQUESTED/COMPLETED accurately', async () => {
    // Re-check the trip from the earlier test or verify itinerary statuses on tripId
    const tripAfter = tripsRepo.findById(tripId)!;
    expect(tripAfter.itinerary.day1.hotel.status).toBe(ItineraryItemStatus.CHECKED_OUT);
    expect(tripAfter.itinerary.days[0].experiences[0].status).toBe(ItineraryItemStatus.COMPLETED);

    // Create a fresh trip to verify intermediate CHECKED_IN and END_REQUESTED states
    const pRes = await request(app.getHttpServer())
      .post('/api/plans')
      .set(h(ntaJaipurToken))
      .send({
        id: 'plan-qa-p21-states',
        title: 'QA P2.1 States Plan',
        description: 'Status mapping check',
        originCity: 'Delhi',
        destination: 'Jaipur',
        durationNights: 2,
        pricePerPerson: 15000,
        includesFlight: false,
        itinerary: {
          day1: {
            flight: null,
            transport: {
              id: 'tr-p21-s',
              mode: 'car',
              provider: 'Xploreo',
              pickupLocation: 'Jaipur',
              dropoffLocation: 'HP-JAI-001',
              pickupAt: `${todayIso()}T09:00:00.000Z`,
              status: 'planned',
            },
            hotel: {
              id: 'ht-p21-s',
              hotelId: 'HP-JAI-001',
              name: 'Royal Heritage Haveli',
              checkInDate: todayIso(),
              checkOutDate: futureIso(2),
              roomType: 'Deluxe Room',
              status: 'planned',
            },
          },
          days: [
            {
              dayNumber: 2,
              experiences: [
                {
                  id: 'ex-p21-s',
                  experienceId: 'exp-1',
                  title: 'Amber Trek',
                  location: 'Jaipur',
                  startsAt: `${futureIso(1)}T07:00:00.000Z`,
                  endsAt: `${futureIso(1)}T10:00:00.000Z`,
                  status: 'planned',
                },
              ],
            },
          ],
        },
      })
      .expect(201);

    const tRes = await request(app.getHttpServer())
      .post('/api/trips')
      .set(h(travellerToken))
      .send({ id: 'trip-qa-p21-states', travellerId: 'T001', planId: pRes.body.id, travellers: 1 })
      .expect(201);

    const dRes = await request(app.getHttpServer())
      .post(`/api/trips/nta/packages/${tRes.body.id}/dispatch`)
      .set(h(ntaJaipurToken))
      .expect(201);

    const hId = dRes.body.dispatched.hotel.bookingId;
    const eId = dRes.body.dispatched.experiences[0].bookingId;

    await request(app.getHttpServer())
      .patch(`/api/bookings/${hId}/check-in`)
      .set(h(hotelPartnerToken))
      .expect(200);
    expect(tripsRepo.findById(tRes.body.id)!.itinerary.day1.hotel.status).toBe(
      ItineraryItemStatus.CHECKED_IN,
    );

    await request(app.getHttpServer())
      .patch(`/api/experience-bookings/${eId}/status`)
      .set(h(expPartnerToken))
      .send({ status: ExperienceBookingStatus.CHECKED_IN })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/experience-bookings/${eId}/status`)
      .set(h(expPartnerToken))
      .send({ status: ExperienceBookingStatus.END_REQUESTED })
      .expect(200);

    const midStateTrip = tripsRepo.findById(tRes.body.id)!;
    expect(midStateTrip.itinerary.days[0].experiences[0].status).toBe(
      ItineraryItemStatus.CHECKED_IN,
    );
    expect(midStateTrip.status).toBe(TripStatus.STARTED);
  });

  it('Phase 2.1 (5 & 6): Partial dispatch / missing component prevents premature parent trip completion', async () => {
    const pRes = await request(app.getHttpServer())
      .post('/api/plans')
      .set(h(ntaJaipurToken))
      .send({
        id: 'plan-qa-p21-partial',
        title: 'QA P2.1 Partial Dispatch Plan',
        description: '1 valid hotel + 1 invalid experience',
        originCity: 'Delhi',
        destination: 'Jaipur',
        durationNights: 2,
        pricePerPerson: 18000,
        includesFlight: false,
        itinerary: {
          day1: {
            flight: null,
            transport: {
              id: 'tr-p21-p',
              mode: 'car',
              provider: 'Xploreo',
              pickupLocation: 'Jaipur',
              dropoffLocation: 'HP-JAI-001',
              pickupAt: `${todayIso()}T09:00:00.000Z`,
              status: 'planned',
            },
            hotel: {
              id: 'ht-p21-p',
              hotelId: 'HP-JAI-001',
              name: 'Royal Heritage Haveli',
              checkInDate: todayIso(),
              checkOutDate: futureIso(2),
              roomType: 'Deluxe Room',
              status: 'planned',
            },
          },
          days: [
            {
              dayNumber: 2,
              experiences: [
                {
                  id: 'ex-p21-missing',
                  experienceId: 'exp-nonexistent-999',
                  title: 'Missing Experience',
                  location: 'Jaipur',
                  startsAt: `${futureIso(1)}T09:00:00.000Z`,
                  endsAt: `${futureIso(1)}T11:00:00.000Z`,
                  status: 'planned',
                },
              ],
            },
          ],
        },
      })
      .expect(201);

    const tRes = await request(app.getHttpServer())
      .post('/api/trips')
      .set(h(travellerToken))
      .send({ id: 'trip-qa-p21-partial', travellerId: 'T001', planId: pRes.body.id, travellers: 1 })
      .expect(201);

    const dRes = await request(app.getHttpServer())
      .post(`/api/trips/nta/packages/${tRes.body.id}/dispatch`)
      .set(h(ntaJaipurToken))
      .expect(201);

    expect(dRes.body.dispatched.hotel.created).toBe(true);
    expect(dRes.body.failedComponents).toHaveLength(1);

    const hId = dRes.body.dispatched.hotel.bookingId;
    await request(app.getHttpServer())
      .patch(`/api/bookings/${hId}/check-in`)
      .set(h(hotelPartnerToken))
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/bookings/${hId}/check-out`)
      .set(h(hotelPartnerToken))
      .expect(200);

    const partialTrip = tripsRepo.findById(tRes.body.id)!;
    expect(partialTrip.status).toBe(TripStatus.STARTED);
    expect(partialTrip.progressPercentage).toBe(50);
  });

  it('Phase 2.1 (7 & 8): Repeated experience on two different days creates two bookings; re-dispatch creates no duplicates', async () => {
    const pRes = await request(app.getHttpServer())
      .post('/api/plans')
      .set(h(ntaJaipurToken))
      .send({
        id: 'plan-qa-p21-repeat-exp',
        title: 'QA P2.1 Repeated Experience Plan',
        description: 'Same experience on Day 2 and Day 3',
        originCity: 'Jaipur',
        destination: 'Jaipur',
        durationNights: 3,
        pricePerPerson: 10000,
        includesFlight: false,
        itinerary: {
          day1: {
            flight: null,
            transport: {
              id: 'tr-p21-r',
              mode: 'car',
              provider: 'Xploreo',
              pickupLocation: 'Jaipur',
              dropoffLocation: 'Jaipur',
              pickupAt: `${futureIso(5)}T09:00:00.000Z`,
              status: 'planned',
            },
            hotel: {
              id: 'ht-p21-none',
              hotelId: '',
              name: 'None',
              checkInDate: futureIso(5),
              checkOutDate: futureIso(8),
              roomType: 'None',
              status: 'planned',
            },
          },
          days: [
            {
              dayNumber: 2,
              experiences: [
                {
                  id: 'ex-p21-d2',
                  experienceId: 'exp-1',
                  title: 'Amber Trek Day 2',
                  location: 'Jaipur',
                  startsAt: `${futureIso(6)}T07:00:00.000Z`,
                  endsAt: `${futureIso(6)}T10:00:00.000Z`,
                  status: 'planned',
                },
              ],
            },
            {
              dayNumber: 3,
              experiences: [
                {
                  id: 'ex-p21-d3',
                  experienceId: 'exp-1',
                  title: 'Amber Trek Day 3',
                  location: 'Jaipur',
                  startsAt: `${futureIso(7)}T07:00:00.000Z`,
                  endsAt: `${futureIso(7)}T10:00:00.000Z`,
                  status: 'planned',
                },
              ],
            },
          ],
        },
      })
      .expect(201);

    const tRes = await request(app.getHttpServer())
      .post('/api/trips')
      .set(h(travellerToken))
      .send({ id: 'trip-qa-p21-repeat-exp', travellerId: 'T001', planId: pRes.body.id, travellers: 1 })
      .expect(201);

    const d1 = await request(app.getHttpServer())
      .post(`/api/trips/nta/packages/${tRes.body.id}/dispatch`)
      .set(h(ntaJaipurToken))
      .expect(201);

    expect(d1.body.dispatched.experiences).toHaveLength(2);
    expect(d1.body.dispatched.experiences[0].bookingId).not.toBe(
      d1.body.dispatched.experiences[1].bookingId,
    );
    expect(expBookingsRepo.findByTripId(tRes.body.id)).toHaveLength(2);

    // Re-dispatch creates no duplicates
    const d2 = await request(app.getHttpServer())
      .post(`/api/trips/nta/packages/${tRes.body.id}/dispatch`)
      .set(h(ntaJaipurToken))
      .expect(201);
    expect(d2.body.dispatched.experiences[0].idempotent).toBe(true);
    expect(d2.body.dispatched.experiences[1].idempotent).toBe(true);
    expect(expBookingsRepo.findByTripId(tRes.body.id)).toHaveLength(2);
  });

  it('Phase 2.1 (9, 10, 11, 12 & 13): Cancelled hotel & experience components recreate with new retry IDs while preserving cancelled history; hotel-only & experience-only packages complete', async () => {
    // 1. Hotel-only package: dispatch -> cancel -> re-dispatch (new retry ID) -> check-in -> check-out -> COMPLETED
    const hPlanRes = await request(app.getHttpServer())
      .post('/api/plans')
      .set(h(ntaJaipurToken))
      .send({
        id: 'plan-qa-p21-honly',
        title: 'QA P2.1 Hotel Only',
        description: 'Hotel only',
        originCity: 'Delhi',
        destination: 'Jaipur',
        durationNights: 2,
        pricePerPerson: 11000,
        includesFlight: false,
        itinerary: {
          day1: {
            flight: null,
            transport: {
              id: 'tr-p21-ho',
              mode: 'car',
              provider: 'Xploreo',
              pickupLocation: 'Jaipur',
              dropoffLocation: 'HP-JAI-001',
              pickupAt: `${todayIso()}T09:00:00.000Z`,
              status: 'planned',
            },
            hotel: {
              id: 'ht-p21-ho',
              hotelId: 'HP-JAI-001',
              name: 'Royal Heritage Haveli',
              checkInDate: todayIso(),
              checkOutDate: futureIso(2),
              roomType: 'Deluxe Room',
              status: 'planned',
            },
          },
          days: [],
        },
      })
      .expect(201);

    const hTripRes = await request(app.getHttpServer())
      .post('/api/trips')
      .set(h(travellerToken))
      .send({ id: 'trip-qa-p21-honly', travellerId: 'T001', planId: hPlanRes.body.id, travellers: 1 })
      .expect(201);

    const hd1 = await request(app.getHttpServer())
      .post(`/api/trips/nta/packages/${hTripRes.body.id}/dispatch`)
      .set(h(ntaJaipurToken))
      .expect(201);
    const firstHotelId = hd1.body.dispatched.hotel.bookingId;

    // Cancel hotel component
    await request(app.getHttpServer())
      .patch(`/api/bookings/${firstHotelId}/cancel`)
      .set(h(hotelPartnerToken))
      .send({ reason: 'Room maintenance' })
      .expect(200);
    expect(bookingsRepo.findById(firstHotelId)!.status).toBe(BookingStatus.CANCELLED);

    // Re-dispatch -> creates fresh booking with new ID, preserving cancelled history
    const hd2 = await request(app.getHttpServer())
      .post(`/api/trips/nta/packages/${hTripRes.body.id}/dispatch`)
      .set(h(ntaJaipurToken))
      .expect(201);
    const retryHotelId = hd2.body.dispatched.hotel.bookingId;
    expect(retryHotelId).not.toBe(firstHotelId);
    expect(bookingsRepo.findById(firstHotelId)!.status).toBe(BookingStatus.CANCELLED);
    expect(bookingsRepo.findById(retryHotelId)!.status).toBe(BookingStatus.CONFIRMED);

    // Complete retried hotel-only package
    await request(app.getHttpServer())
      .patch(`/api/bookings/${retryHotelId}/check-in`)
      .set(h(hotelPartnerToken))
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/bookings/${retryHotelId}/check-out`)
      .set(h(hotelPartnerToken))
      .expect(200);
    expect(tripsRepo.findById(hTripRes.body.id)!.status).toBe(TripStatus.COMPLETED);

    // 2. Experience-only package: dispatch -> cancel -> re-dispatch (new retry ID) -> check-in -> complete -> COMPLETED
    const ePlanRes = await request(app.getHttpServer())
      .post('/api/plans')
      .set(h(ntaJaipurToken))
      .send({
        id: 'plan-qa-p21-eonly',
        title: 'QA P2.1 Exp Only',
        description: 'Experience only',
        originCity: 'Jaipur',
        destination: 'Jaipur',
        durationNights: 1,
        pricePerPerson: 5000,
        includesFlight: false,
        itinerary: {
          day1: {
            flight: null,
            transport: {
              id: 'tr-p21-eo',
              mode: 'car',
              provider: 'Xploreo',
              pickupLocation: 'Jaipur',
              dropoffLocation: 'Jaipur',
              pickupAt: `${futureIso(5)}T09:00:00.000Z`,
              status: 'planned',
            },
            hotel: {
              id: 'ht-p21-eo-none',
              hotelId: '',
              name: 'None',
              checkInDate: futureIso(5),
              checkOutDate: futureIso(6),
              roomType: 'None',
              status: 'planned',
            },
          },
          days: [
            {
              dayNumber: 2,
              experiences: [
                {
                  id: 'ex-p21-eo',
                  experienceId: 'exp-1',
                  title: 'Amber Trek',
                  location: 'Jaipur',
                  startsAt: `${futureIso(6)}T07:00:00.000Z`,
                  endsAt: `${futureIso(6)}T10:00:00.000Z`,
                  status: 'planned',
                },
              ],
            },
          ],
        },
      })
      .expect(201);

    const eTripRes = await request(app.getHttpServer())
      .post('/api/trips')
      .set(h(travellerToken))
      .send({ id: 'trip-qa-p21-eonly', travellerId: 'T001', planId: ePlanRes.body.id, travellers: 1 })
      .expect(201);

    const ed1 = await request(app.getHttpServer())
      .post(`/api/trips/nta/packages/${eTripRes.body.id}/dispatch`)
      .set(h(ntaJaipurToken))
      .expect(201);
    const firstExpId = ed1.body.dispatched.experiences[0].bookingId;

    await request(app.getHttpServer())
      .patch(`/api/experience-bookings/${firstExpId}/cancel`)
      .set(h(expPartnerToken))
      .send({ reason: 'Weather' })
      .expect(200);
    expect(expBookingsRepo.findById(firstExpId)!.status).toBe(ExperienceBookingStatus.CANCELLED);

    const ed2 = await request(app.getHttpServer())
      .post(`/api/trips/nta/packages/${eTripRes.body.id}/dispatch`)
      .set(h(ntaJaipurToken))
      .expect(201);
    const retryExpId = ed2.body.dispatched.experiences[0].bookingId;
    expect(retryExpId).not.toBe(firstExpId);
    expect(expBookingsRepo.findById(firstExpId)!.status).toBe(ExperienceBookingStatus.CANCELLED);
    expect(expBookingsRepo.findById(retryExpId)!.status).toBe(ExperienceBookingStatus.CONFIRMED);

    await request(app.getHttpServer())
      .patch(`/api/experience-bookings/${retryExpId}/status`)
      .set(h(expPartnerToken))
      .send({ status: ExperienceBookingStatus.CHECKED_IN })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/experience-bookings/${retryExpId}/status`)
      .set(h(travellerToken))
      .send({ status: ExperienceBookingStatus.COMPLETED })
      .expect(200);
    expect(tripsRepo.findById(eTripRes.body.id)!.status).toBe(TripStatus.COMPLETED);
  });
});
