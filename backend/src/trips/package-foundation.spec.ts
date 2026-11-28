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
import { ExperienceBookingsRepository } from '../experience-bookings/experience-bookings.repository';
import { ExperiencesRepository } from '../experiences/experiences.repository';
import { FinanceService } from '../finance/finance.service';
import { PlansRepository } from '../plans/plans.repository';
import { TripsRepository } from './trips.repository';

function futureIso(daysAhead: number): string {
  return new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
}

describe('Phase 1 – Backend Foundation for NTA-Centred Package Booking', () => {
  let app: INestApplication;
  let plansRepo: PlansRepository;
  let tripsRepo: TripsRepository;
  let bookingsRepo: BookingsRepository;
  let expBookingsRepo: ExperienceBookingsRepository;
  let experiencesRepo: ExperiencesRepository;
  let financeService: FinanceService;

  let ntaJaipurToken: string;
  let ntaOtherJaipurToken: string;
  let travellerToken: string;
  let superAdminToken: string;

  let createdPlanId: string;
  let createdTripId: string;

  const nta1Headers = () => ({
    Authorization: `Bearer ${ntaJaipurToken}`,
  });

  const nta2Headers = () => ({
    Authorization: `Bearer ${ntaOtherJaipurToken}`,
  });

  const travellerHeaders = () => ({
    Authorization: `Bearer ${travellerToken}`,
  });

  const superAdminHeaders = () => ({
    Authorization: `Bearer ${superAdminToken}`,
  });

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
    experiencesRepo = moduleRef.get(ExperiencesRepository);
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
    superAdminToken = await login('SA001', 'SA@123');

    const expEntity = experiencesRepo.findById('exp-3')!;
    experiencesRepo.update('exp-3', {
      slots: [
        ...(expEntity.slots ?? []),
        { id: 'slot-p1-11', date: futureIso(11), time: '07:00', booked: 0, capacity: 15, available: true },
        { id: 'slot-p1-13', date: futureIso(13), time: '09:00', booked: 0, capacity: 15, available: true },
        { id: 'slot-p1-20', date: futureIso(20), time: '09:00', booked: 0, capacity: 15, available: true },
      ],
    });

    // Second Jaipur NTA token to test cross-NTA isolation in the same region
    ntaOtherJaipurToken = jwt.sign(
      {
        userId: 'NTA-JAI-OTHER',
        username: 'NTA-JAI-OTHER',
        role: Role.NONTECHADMIN,
        region: 'Jaipur',
      },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('11. Existing JSON seed records load successfully and legacy plans remain usable', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/plans')
      .set(nta1Headers())
      .expect(200);

    const list = (res.body.data ?? []) as Array<{ id: string; createdByNtaId?: string }>;
    const legacyJaipurPlan = list.find((p) => p.id === 'plan-2');
    expect(legacyJaipurPlan).toBeDefined();
    expect(legacyJaipurPlan!.createdByNtaId).toBeUndefined();
  });

  it('1. NTA package creation records the authenticated creator (createdByNtaId)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/plans')
      .set(nta1Headers())
      .send({
        id: 'plan-qa-phase1-001',
        title: 'QA Jaipur Royal Package',
        description: 'Phase 1 ownership test package',
        originCity: 'Delhi',
        destination: 'Jaipur',
        durationNights: 3,
        pricePerPerson: 24000,
        hotelStars: 4,
        includesFlight: false,
        status: 'available',
        itinerary: {
          day1: {
            flight: null,
            transport: {
              id: 'tr-qa-1',
              provider: 'Xploreo Cabs',
              vehicleType: 'SUV',
              pickupLocation: 'Jaipur Airport',
              dropoffLocation: 'HP-JAI-001',
              pickupAt: `${futureIso(10)}T10:00:00.000Z`,
              status: 'planned',
            },
            hotel: {
              id: 'ht-qa-1',
              hotelId: 'HP-JAI-001',
              name: 'The Heritage Haveli & Spa, Jaipur',
              checkInDate: futureIso(10),
              checkOutDate: futureIso(13),
              roomType: 'Maharaja Suite',
              status: 'planned',
            },
          },
          days: [
            {
              dayNumber: 2,
              experiences: [
                {
                  id: 'ex-qa-1',
                  experienceId: 'exp-3',
                  title: 'Jaipur Heritage Walk',
                  location: 'Jaipur',
                  startsAt: `${futureIso(11)}T07:00:00.000Z`,
                  endsAt: `${futureIso(11)}T10:00:00.000Z`,
                  status: 'planned',
                },
              ],
            },
          ],
        },
      })
      .expect(201);

    createdPlanId = res.body.id;
    expect(res.body.createdByNtaId).toBe('NTA001');
  });

  it('2. Client cannot spoof createdByNtaId on POST /api/plans', async () => {
    await request(app.getHttpServer())
      .post('/api/plans')
      .set(nta1Headers())
      .send({
        title: 'Spoofed Creator Package',
        description: 'Should be rejected',
        originCity: 'Delhi',
        destination: 'Jaipur',
        durationNights: 2,
        pricePerPerson: 15000,
        createdByNtaId: 'NTA-SPOOFED',
        itinerary: {
          day1: {
            flight: null,
            transport: {
              id: 'tr-sp',
              provider: 'Xploreo',
              vehicleType: 'SUV',
              pickupLocation: 'Jaipur',
              dropoffLocation: 'HP-JAI-001',
              pickupAt: `${futureIso(10)}T09:00:00.000Z`,
              status: 'planned',
            },
            hotel: {
              id: 'ht-sp',
              hotelId: 'HP-JAI-001',
              name: 'The Heritage Haveli & Spa, Jaipur',
              checkInDate: futureIso(10),
              checkOutDate: futureIso(12),
              roomType: 'Maharaja Suite',
              status: 'planned',
            },
          },
          days: [],
        },
      })
      .expect(400);
  });

  it('3. Package updates preserve original createdByNtaId', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/plans/${createdPlanId}`)
      .set(nta1Headers())
      .send({ title: 'QA Jaipur Royal Package Updated' })
      .expect(200);

    expect(res.body.title).toBe('QA Jaipur Royal Package Updated');
    expect(res.body.createdByNtaId).toBe('NTA001');
  });

  it('4, 5 & 6. NTA retrieves owned package booking with Hotel & Experience components; another NTA cannot access it', async () => {
    const tripRes = await request(app.getHttpServer())
      .post('/api/trips')
      .set(travellerHeaders())
      .send({
        id: 'trip-qa-phase1-001',
        travellerId: 'T001',
        planId: createdPlanId,
        travellers: 2,
      })
      .expect(201);

    createdTripId = tripRes.body.id;

    // Owner NTA can list & inspect package booking + components (unassigned before Phase 2 dispatch)
    const ntaListRes = await request(app.getHttpServer())
      .get('/api/trips/nta/packages')
      .set(nta1Headers())
      .expect(200);

    const ownBooking = (ntaListRes.body as Array<Record<string, any>>).find(
      (b) => b.tripId === createdTripId,
    );
    expect(ownBooking).toBeDefined();
    expect(ownBooking!.createdByNtaId).toBe('NTA001');
    expect(ownBooking!.hotelComponents).toHaveLength(1);
    expect(ownBooking!.hotelComponents[0]).toMatchObject({
      hotelId: 'HP-JAI-001',
      assignmentStatus: 'unassigned',
      bookingId: null,
    });
    expect(ownBooking!.experienceComponents).toHaveLength(1);
    expect(ownBooking!.experienceComponents[0]).toMatchObject({
      experienceId: 'exp-3',
      assignmentStatus: 'unassigned',
      bookingId: null,
    });

    // Different NTA in the same region (Jaipur) cannot see or access this NTA's package booking
    const otherListRes = await request(app.getHttpServer())
      .get('/api/trips/nta/packages')
      .set(nta2Headers())
      .expect(200);
    expect(
      (otherListRes.body as Array<Record<string, any>>).some(
        (b) => b.tripId === createdTripId,
      ),
    ).toBe(false);

    await request(app.getHttpServer())
      .get(`/api/trips/nta/packages/${createdTripId}`)
      .set(nta2Headers())
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/plans/${createdPlanId}`)
      .set(nta2Headers())
      .expect(403);
  });

  it('7 & 8. Packages without hotel components (legacy/direct repo) or without experience components remain valid', async () => {
    // 239dfeed's assertBookableItinerary requires a partner hotel on POST /api/plans;
    // TripsService.toNtaPackageBooking still handles legacy/direct trips without hotelId.
    const expOnlyPlan = plansRepo.create({
      id: 'plan-qa-exp-only',
      title: 'QA Jaipur Experience Only',
      description: 'No hotel component',
      originCity: 'Jaipur',
      destination: 'Jaipur',
      durationNights: 2,
      pricePerPerson: 8000,
      includesFlight: false,
      createdByNtaId: 'NTA001',
      itinerary: {
        day1: {
          flight: null,
          transport: {
            id: 'tr-qa-exp',
            provider: 'Xploreo',
            vehicleType: 'SUV',
            pickupLocation: 'City Center',
            dropoffLocation: 'Amber',
            pickupAt: `${futureIso(12)}T09:00:00.000Z`,
            status: 'planned',
          },
          hotel: {
            id: 'ht-empty',
            hotelId: '',
            name: 'None',
            checkInDate: futureIso(12),
            checkOutDate: futureIso(14),
            roomType: 'None',
            status: 'planned',
          },
        },
        days: [
          {
            dayNumber: 2,
            experiences: [
              {
                id: 'ex-only-1',
                experienceId: 'exp-3',
                title: 'Amber Walk',
                location: 'Jaipur',
                startsAt: `${futureIso(13)}T09:00:00.000Z`,
                endsAt: `${futureIso(13)}T11:00:00.000Z`,
                status: 'planned',
              },
            ],
          },
        ],
      },
    });

    const expOnlyTrip = tripsRepo.create({
      id: 'trip-qa-exp-only',
      travellerId: 'T001',
      planId: expOnlyPlan.id,
      itinerary: expOnlyPlan.itinerary,
      travellers: 1,
      totalAmount: 8000,
      currentDay: 1,
      currentStop: 'Not started',
      currentLocation: 'Jaipur',
    } as any);

    const expOnlyDetail = await request(app.getHttpServer())
      .get(`/api/trips/nta/packages/${expOnlyTrip.id}`)
      .set(nta1Headers())
      .expect(200);
    expect(expOnlyDetail.body.hotelComponents).toEqual([]);
    expect(expOnlyDetail.body.experienceComponents).toHaveLength(1);

    // Package without experiences (valid hotel + empty days) via HTTP POST /api/plans + POST /api/trips
    const hotelOnlyPlanRes = await request(app.getHttpServer())
      .post('/api/plans')
      .set(nta1Headers())
      .send({
        id: 'plan-qa-hotel-only',
        title: 'QA Jaipur Stay Only',
        description: 'No experience component',
        originCity: 'Delhi',
        destination: 'Jaipur',
        durationNights: 2,
        pricePerPerson: 12000,
        includesFlight: false,
        itinerary: {
          day1: {
            flight: null,
            transport: {
              id: 'tr-qa-ho',
              provider: 'Xploreo',
              vehicleType: 'SUV',
              pickupLocation: 'Jaipur Airport',
              dropoffLocation: 'HP-JAI-001',
              pickupAt: `${futureIso(14)}T09:00:00.000Z`,
              status: 'planned',
            },
            hotel: {
              id: 'ht-qa-ho',
              hotelId: 'HP-JAI-001',
              name: 'The Heritage Haveli & Spa, Jaipur',
              checkInDate: futureIso(14),
              checkOutDate: futureIso(16),
              roomType: 'Maharaja Suite',
              status: 'planned',
            },
          },
          days: [],
        },
      })
      .expect(201);

    const hotelOnlyTrip = await request(app.getHttpServer())
      .post('/api/trips')
      .set(travellerHeaders())
      .send({
        id: 'trip-qa-hotel-only',
        travellerId: 'T001',
        planId: hotelOnlyPlanRes.body.id,
        travellers: 1,
      })
      .expect(201);

    const hotelOnlyDetail = await request(app.getHttpServer())
      .get(`/api/trips/nta/packages/${hotelOnlyTrip.body.id}`)
      .set(nta1Headers())
      .expect(200);
    expect(hotelOnlyDetail.body.experienceComponents).toEqual([]);
    expect(hotelOnlyDetail.body.hotelComponents).toHaveLength(1);
  });

  it('9 & 10. Existing standalone Hotel and Experience bookings continue working', async () => {
    const hotelRes = await request(app.getHttpServer())
      .post('/api/bookings')
      .set(travellerHeaders())
      .send({
        id: 'qa-standalone-hotel-001',
        hotelId: 'HP-JAI-001',
        guestName: 'Anjali Sharma',
        email: 'anjali@example.com',
        phone: '+91 9876543210',
        checkIn: futureIso(20),
        checkOut: futureIso(22),
        guests: 2,
        roomType: 'Maharaja Suite',
        rooms: 1,
      })
      .expect(201);

    expect(hotelRes.body.id).toBe('qa-standalone-hotel-001');
    expect(hotelRes.body.isPackageComponent).toBeUndefined();

    const expEntity = experiencesRepo.findById('exp-3')!;
    const futureExpDate = futureIso(20);
    experiencesRepo.update('exp-3', {
      slots: [
        ...(expEntity.slots ?? []),
        { id: 'slot-qa-future', date: futureExpDate, time: '09:00', booked: 0, capacity: 15, available: true },
      ],
    });

    const expRes = await request(app.getHttpServer())
      .post('/api/experience-bookings')
      .set(travellerHeaders())
      .send({
        id: 'qa-standalone-exp-001',
        experienceId: 'exp-3',
        guestName: 'Anjali Sharma',
        email: 'anjali@example.com',
        phone: '+91 9876543210',
        date: futureExpDate,
        participants: 2,
      })
      .expect(201);

    expect(expRes.body.id).toBe('qa-standalone-exp-001');
    expect(expRes.body.isPackageComponent).toBeUndefined();
  });

  it('13. FinanceService does not double-count linked package component bookings', async () => {
    const before = financeService.summary({ userId: 'SA001', role: Role.SUPERADMIN });

    // Simulate a linked package component hotel booking & experience booking (as Phase 2 will create)
    const linkedHotel = bookingsRepo.create({
      id: 'qa-pkg-comp-hotel-001',
      hotelId: 'HP-JAI-001',
      travellerId: 'T001',
      guestName: 'Anjali Sharma',
      email: 'anjali@example.com',
      phone: '+91 9876543210',
      checkIn: futureIso(10),
      checkOut: futureIso(13),
      guests: 2,
      roomType: 'Maharaja Suite',
      rooms: 1,
      guestNames: ['Anjali Sharma'],
      totalAmount: 15000,
      tripId: createdTripId,
      isPackageComponent: true,
      packagePlanId: createdPlanId,
    });

    const linkedExp = expBookingsRepo.create({
      id: 'qa-pkg-comp-exp-001',
      experienceId: 'exp-3',
      travellerId: 'T001',
      guestName: 'Anjali Sharma',
      email: 'anjali@example.com',
      phone: '+91 9876543210',
      date: futureIso(11),
      participants: 2,
      totalAmount: 3600,
      tripId: createdTripId,
      isPackageComponent: true,
      packagePlanId: createdPlanId,
    });

    // Verify component linkage is visible on NTA package booking detail
    tripsRepo.update(createdTripId, {
      hotelBookingId: linkedHotel.id,
      experienceBookingIds: [linkedExp.id],
    });

    const detailRes = await request(app.getHttpServer())
      .get(`/api/trips/nta/packages/${createdTripId}`)
      .set(superAdminHeaders())
      .expect(200);
    expect(detailRes.body.hotelComponents[0].assignmentStatus).toBe('assigned');
    expect(detailRes.body.hotelComponents[0].bookingId).toBe(linkedHotel.id);
    expect(detailRes.body.experienceComponents[0].assignmentStatus).toBe('assigned');
    expect(detailRes.body.experienceComponents[0].bookingId).toBe(linkedExp.id);

    // FinanceService totals must remain unchanged (parent Trip already holds the package revenue)
    const after = financeService.summary({ userId: 'SA001', role: Role.SUPERADMIN });
    expect(after.totals).toEqual(before.totals);
  });
});
