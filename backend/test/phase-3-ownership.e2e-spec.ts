import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

jest.setTimeout(60000);

describe('Phase 3 — Booking Ownership Validation (e2e)', () => {
  let app: INestApplication;

  let hotelIdGoa: string;
  let expIdGoa: string;
  let hotelBookingId: string;
  let expBookingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    const reflector = app.get(Reflector);
    app.useGlobalGuards(new AuthGuard(reflector), new RolesGuard(reflector));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Setup Phase', () => {
    it('Setup: Create a Goa Hotel and Experience', async () => {
      let res = await request(app.getHttpServer())
        .post('/hotels')
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-goa')
        .set('x-user-location', 'Goa')
        .send({
          name: 'The Goa Resort 2',
          city: 'Goa',
          location: 'Goa',
          description: 'A beautiful resort.',
          stars: 5,
          pricePerNight: 5000,
          totalRooms: 10,
        })
        .expect(201);
      hotelIdGoa = res.body.id;

      res = await request(app.getHttpServer())
        .post('/experiences')
        .set('x-user-role', 'EXPERIENCE_PARTNER')
        .set('x-user-id', 'exp-partner-goa')
        .set('x-user-location', 'Goa')
        .send({
          title: 'Goa Snorkeling 2',
          description: 'A beautiful snorkeling experience.',
          destination: 'Goa',
          category: 'water sports',
          price: 1500,
          durationHours: 3,
          capacity: 10,
          image: '',
        })
        .expect(201);
      expIdGoa = res.body.id;
    });

    it('Traveller A creates bookings', async () => {
      // Hotel Booking
      let res = await request(app.getHttpServer())
        .post('/bookings')
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-A')
        .send({
          hotelId: hotelIdGoa,
          guestName: 'Traveller A',
          email: 'a@example.com',
          phone: '+919999999999',
          checkIn: '2026-11-01',
          checkOut: '2026-11-05',
          guests: 2,
          roomType: 'Deluxe'
        })
        .expect(201);
      hotelBookingId = res.body.id;

      // Experience Booking
      res = await request(app.getHttpServer())
        .post('/experience-bookings')
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-A')
        .send({
          experienceId: expIdGoa,
          guestName: 'Traveller A',
          email: 'a@example.com',
          phone: '+919999999999',
          date: '2026-11-01',
          time: '10:00',
          participants: 2
        })
        .expect(201);
      expBookingId = res.body.id;
    });
  });

  describe('Invalid Flow (Cross-Traveller Ownership Validation)', () => {
    it('Traveller B tries: Cancel Traveller A\'s Hotel Booking (Blocked)', async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/${hotelBookingId}/cancel`)
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-B') // DIFFERENT TRAVELLER
        .expect(403);
    });

    it('Traveller B tries: Modify Traveller A\'s Experience Booking (Blocked)', async () => {
      // Trying to cancel it via status update
      await request(app.getHttpServer())
        .patch(`/experience-bookings/${expBookingId}/status`)
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-B') // DIFFERENT TRAVELLER
        .send({ status: 'CANCELLED' })
        .expect(403);
    });
  });

  describe('Valid Flow (Ownership Validation)', () => {
    it('Traveller A can Cancel their own Hotel Booking', async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/${hotelBookingId}/cancel`)
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-A') // SAME TRAVELLER
        .expect(200);
    });

    it('Traveller A can Modify their own Experience Booking', async () => {
      await request(app.getHttpServer())
        .patch(`/experience-bookings/${expBookingId}/status`)
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-A') // SAME TRAVELLER
        .send({ status: 'CANCELLED' })
        .expect(200);
    });
  });
});
