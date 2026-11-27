import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlansRepository } from '../plans/plans.repository';
import { TripsRepository } from './trips.repository';
import { TripStatus, TripTrackingStatus } from './entities/trip.entity';

function futureIso(daysAhead: number): string {
  return new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
}

describe('BUG-03 – Trip Price Manipulation Prevention (PATCH /api/trips/:id)', () => {
  let app: INestApplication;
  let plansRepo: PlansRepository;
  let tripsRepo: TripsRepository;

  let travellerToken: string;
  let otherTravellerToken: string;
  let guideToken: string;
  let ntaToken: string;
  let superAdminToken: string;

  let jaipurPlanId: string;
  let jaipurPlanPrice: number;
  let createdTripId: string;
  let groupTripId: string;

  const travellerHeaders = () => ({
    Authorization: `Bearer ${travellerToken}`,
    'x-user-role': 'traveller',
    'x-user-id': 'T001',
  });

  const otherTravellerHeaders = () => ({
    Authorization: `Bearer ${otherTravellerToken}`,
    'x-user-role': 'traveller',
    'x-user-id': 'T-BUG03-OTHER',
  });

  const guideHeaders = () => ({
    Authorization: `Bearer ${guideToken}`,
    'x-user-role': 'guide',
    'x-user-id': 'G003',
  });

  const ntaHeaders = () => ({
    Authorization: `Bearer ${ntaToken}`,
    'x-user-role': 'nontechadmin',
    'x-user-id': 'NTA001',
  });

  const superAdminHeaders = () => ({
    Authorization: `Bearer ${superAdminToken}`,
    'x-user-role': 'superadmin',
    'x-user-id': 'SA001',
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

    const login = async (username: string, password: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username, password })
        .expect(201);
      return res.body.token ?? res.body.data?.token;
    };

    travellerToken = await login('T001', 'TRA@123');
    guideToken = await login('G003', 'GUD@123');
    ntaToken = await login('NTA001', 'NTA@123');
    superAdminToken = await login('SA001', 'SA@123');

    // Register a second QA traveller for cross-user ownership test (Case H)
    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'T-BUG03-OTHER',
        password: 'TRA@123',
        name: 'QA Other Traveller',
        email: 'qa.other.bug03@xploreo.com',
        phone: '9876501234',
        role: 'traveller',
      });
    otherTravellerToken = regRes.body.token ?? (await login('T-BUG03-OTHER', 'TRA@123'));

    const jaipurPlan = plansRepo
      .findAll({ page: 1, limit: 100 })
      .data.find((p) => p.destination === 'Jaipur' && p.status === 'available');
    expect(jaipurPlan).toBeDefined();
    jaipurPlanId = jaipurPlan!.id;
    jaipurPlanPrice = jaipurPlan!.pricePerPerson;
  });

  afterAll(async () => {
    await app.close();
  });

  it('K. Normal trip creation calculates authoritative price server-side', async () => {
    const plan = plansRepo.findById(jaipurPlanId)!;
    const itinerary = structuredClone(plan.itinerary);
    itinerary.day1.hotel = {
      ...(itinerary.day1.hotel || { name: 'Jaipur Heritage' }),
      checkInDate: futureIso(10),
      checkOutDate: futureIso(12),
    };

    const res = await request(app.getHttpServer())
      .post('/api/trips')
      .set(travellerHeaders())
      .send({
        id: 'qa-bug03-spec-single',
        travellerId: 'T001',
        planId: jaipurPlanId,
        travellers: 1,
        itinerary,
      })
      .expect(201);

    createdTripId = res.body.id;
    expect(res.body.totalAmount).toBe(jaipurPlanPrice);
    expect(res.body.travellers).toBe(1);
  });

  it('A. Traveller submits PATCH with totalAmount: 1 -> 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .patch(`/api/trips/${createdTripId}`)
      .set(travellerHeaders())
      .send({ totalAmount: 1 })
      .expect(400);

    expect(tripsRepo.findById(createdTripId)!.totalAmount).toBe(jaipurPlanPrice);
  });

  it('B. Traveller submits totalAmount: 0 -> 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .patch(`/api/trips/${createdTripId}`)
      .set(travellerHeaders())
      .send({ totalAmount: 0 })
      .expect(400);

    expect(tripsRepo.findById(createdTripId)!.totalAmount).toBe(jaipurPlanPrice);
  });

  it('C. Traveller submits totalAmount: 1.5 -> 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .patch(`/api/trips/${createdTripId}`)
      .set(travellerHeaders())
      .send({ totalAmount: 1.5 })
      .expect(400);

    expect(tripsRepo.findById(createdTripId)!.totalAmount).toBe(jaipurPlanPrice);
  });

  it('D. Traveller submits totalAmount: 999999999 -> 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .patch(`/api/trips/${createdTripId}`)
      .set(travellerHeaders())
      .send({ totalAmount: 999999999 })
      .expect(400);

    expect(tripsRepo.findById(createdTripId)!.totalAmount).toBe(jaipurPlanPrice);
  });

  it('E. Traveller updates itinerary without totalAmount -> authoritative amount preserved/recalculated', async () => {
    const plan = plansRepo.findById(jaipurPlanId)!;
    const res = await request(app.getHttpServer())
      .patch(`/api/trips/${createdTripId}`)
      .set(travellerHeaders())
      .send({
        itinerary: {
          days: plan.itinerary.days,
        },
      })
      .expect(200);

    expect(res.body.totalAmount).toBe(jaipurPlanPrice);
  });

  it('F. Traveller updates trip status -> amount unchanged', async () => {
    // Transition DRAFT -> CONFIRMED or CONFIRMED -> CANCELLED; test with a fresh draft trip
    const plan = plansRepo.findById(jaipurPlanId)!;
    const draft = tripsRepo.create({
      id: 'qa-bug03-spec-draft',
      travellerId: 'T001',
      planId: jaipurPlanId,
      status: TripStatus.DRAFT,
      itinerary: plan.itinerary,
      travellers: 2,
      totalAmount: jaipurPlanPrice * 2,
      currentDay: 1,
      currentStop: 'Not started',
      currentLocation: 'Jaipur',
      trackingStatus: TripTrackingStatus.NOT_STARTED,
      progressPercentage: 0,
      lastUpdatedAt: new Date().toISOString(),
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/trips/${draft.id}`)
      .set(travellerHeaders())
      .send({ status: TripStatus.CONFIRMED })
      .expect(200);

    expect(res.body.status).toBe(TripStatus.CONFIRMED);
    expect(res.body.totalAmount).toBe(jaipurPlanPrice * 2);
  });

  it('G. Guide updates permitted trip progress -> amount unchanged and itinerary edit rejected', async () => {
    const plan = plansRepo.findById(jaipurPlanId)!;
    const guideTrip = tripsRepo.create({
      id: 'qa-bug03-spec-guide',
      travellerId: 'T001',
      planId: jaipurPlanId,
      guideId: 'G003',
      status: TripStatus.CONFIRMED,
      itinerary: plan.itinerary,
      travellers: 2,
      totalAmount: jaipurPlanPrice * 2,
      currentDay: 1,
      currentStop: 'Not started',
      currentLocation: 'Jaipur',
      trackingStatus: TripTrackingStatus.NOT_STARTED,
      progressPercentage: 0,
      lastUpdatedAt: new Date().toISOString(),
    });

    // Guide cannot submit totalAmount
    await request(app.getHttpServer())
      .patch(`/api/trips/${guideTrip.id}`)
      .set(guideHeaders())
      .send({ totalAmount: 1 })
      .expect(400);

    // Guide cannot edit itinerary
    await request(app.getHttpServer())
      .patch(`/api/trips/${guideTrip.id}`)
      .set(guideHeaders())
      .send({
        itinerary: {
          days: plan.itinerary.days,
        },
      })
      .expect(403);

    // Guide can update permitted tracking progress -> totalAmount unchanged
    const trackRes = await request(app.getHttpServer())
      .patch(`/api/trips/${guideTrip.id}/tracking`)
      .set(guideHeaders())
      .send({ currentStop: 'Amber Fort', progressPercentage: 25 })
      .expect(200);

    expect(trackRes.body.totalAmount).toBe(jaipurPlanPrice * 2);
  });

  it('H. Traveller attempts to update another traveller trip -> 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .patch(`/api/trips/${createdTripId}`)
      .set(otherTravellerHeaders())
      .send({ status: TripStatus.CANCELLED })
      .expect(403);

    expect(tripsRepo.findById(createdTripId)!.totalAmount).toBe(jaipurPlanPrice);
  });

  it('I. Multi-traveller booking updates preserve the correct traveller count and total price', async () => {
    const plan = plansRepo.findById(jaipurPlanId)!;
    const itinerary = structuredClone(plan.itinerary);
    itinerary.day1.hotel = {
      ...(itinerary.day1.hotel || { name: 'Jaipur Heritage' }),
      checkInDate: futureIso(15),
      checkOutDate: futureIso(18),
    };

    const createRes = await request(app.getHttpServer())
      .post('/api/trips')
      .set(travellerHeaders())
      .send({
        id: 'qa-bug03-spec-group',
        travellerId: 'T001',
        planId: jaipurPlanId,
        travellers: 3,
        itinerary,
      })
      .expect(201);

    groupTripId = createRes.body.id;
    expect(createRes.body.travellers).toBe(3);
    expect(createRes.body.totalAmount).toBe(jaipurPlanPrice * 3);

    // Update itinerary without totalAmount -> must keep 3x price, not collapse to 1x
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/trips/${groupTripId}`)
      .set(travellerHeaders())
      .send({
        itinerary: {
          days: plan.itinerary.days,
        },
      })
      .expect(200);

    expect(updateRes.body.totalAmount).toBe(jaipurPlanPrice * 3);
  });

  it('J. NTA and SuperAdmin revenue remain consistent after all rejected tampering attempts', async () => {
    const ntaBefore = await request(app.getHttpServer())
      .get('/api/finance/summary')
      .set(ntaHeaders())
      .expect(200);
    const saBefore = await request(app.getHttpServer())
      .get('/api/finance/summary')
      .set(superAdminHeaders())
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/trips/${groupTripId}`)
      .set(travellerHeaders())
      .send({ totalAmount: 1 })
      .expect(400);

    const ntaAfter = await request(app.getHttpServer())
      .get('/api/finance/summary')
      .set(ntaHeaders())
      .expect(200);
    const saAfter = await request(app.getHttpServer())
      .get('/api/finance/summary')
      .set(superAdminHeaders())
      .expect(200);

    expect(ntaAfter.body.totals).toEqual(ntaBefore.body.totals);
    expect(saAfter.body.totals).toEqual(saBefore.body.totals);
  });
});
