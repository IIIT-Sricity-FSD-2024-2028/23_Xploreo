import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

jest.setTimeout(60000);

describe('Phase 6 — Security Attack Simulation (e2e)', () => {
  let app: INestApplication;

  let hotelGoaId: string;
  let bookingGoaId: string;

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
    it('Setup: Create a Goa Hotel and Booking', async () => {
      let res = await request(app.getHttpServer())
        .post('/hotels')
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-goa')
        .set('x-user-location', 'Goa')
        .send({
          name: 'The Goa Resort Attack Target',
          city: 'Goa',
          location: 'Goa',
          description: 'A beautiful resort.',
          stars: 5,
          pricePerNight: 5000,
          totalRooms: 10,
        })
        .expect(201);
      hotelGoaId = res.body.id;

      res = await request(app.getHttpServer())
        .post('/bookings')
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-owner')
        .send({
          hotelId: hotelGoaId,
          guestName: 'Traveller A',
          email: 'a@example.com',
          phone: '+919999999999',
          checkIn: '2026-11-01',
          checkOut: '2026-11-05',
          guests: 2,
          roomType: 'Deluxe'
        })
        .expect(201);
      bookingGoaId = res.body.id;
    });
  });

  describe('🔴 Test 1: Payload Tampering', () => {
    it('Goa Hotel Partner tries to create a hotel with location: "Delhi"', async () => {
      await request(app.getHttpServer())
        .post('/hotels')
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-goa')
        .set('x-user-location', 'Goa')
        .send({
          name: 'Fake Delhi Hotel',
          city: 'Delhi',
          location: 'Delhi', // Payload tampered
          description: 'A beautiful resort.',
          stars: 5,
          pricePerNight: 5000,
          totalRooms: 10,
        })
        .expect(403); // Expected: Rejected
    });

    it('Goa NTA tries to create a plan with destination: "Delhi"', async () => {
      await request(app.getHttpServer())
        .post('/plans')
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'nta-goa')
        .set('x-user-location', 'Goa')
        .send({
          title: 'Fake Delhi Plan',
          description: 'Fake Delhi Plan',
          from: 'Delhi',
          destination: 'Delhi', // Payload tampered
          duration: 2,
          price: 5000,
          itinerary: [{ day: 'Day 1', title: 'Arrival', detail: 'Arrive' }],
        })
        .expect(403); // Expected: Rejected
    });
  });

  describe('🔴 Test 2: ID-Based Attack', () => {
    it('Use booking ID from Goa, try checking in with Delhi partner', async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingGoaId}/check-in`)
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-delhi')
        .set('x-user-location', 'Delhi')
        .expect(403); // Expected: 403 Forbidden
    });
  });

  describe('🔴 Test 3: Unauthorized Cancellation', () => {
    it('Call cancel API with another user\'s booking ID', async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingGoaId}/cancel`)
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-malicious-attacker') // Not the owner
        .expect(403); // Expected: 403 Forbidden (Only owner allowed)
    });
  });
});
