import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

jest.setTimeout(60000);

describe('Phase 6 - Full System Simulation (e2e)', () => {
  let app: INestApplication;

  let planId: string;
  let applicationId: string;
  let hotelId: string;
  let bookingId: string;

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

  describe('Step 1: Goa NTA Creates Plan', () => {
    it('Delhi NTA tries to create a Goa plan (Blocked)', async () => {
      await request(app.getHttpServer())
        .post('/plans')
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'nta-delhi')
        .set('x-user-location', 'Delhi')
        .send({
          title: 'Ultimate Goa Tour',
          description: 'A 5-day tour of Goa beaches',
          from: 'Goa',
          destination: 'Goa', // Hack attempt
          duration: 5,
          price: 25000,
          itinerary: [{ day: 'Day 1', title: 'Arrival', detail: 'Arrive in Goa' }]
        })
        .expect(403);
    });

    it('Goa NTA successfully creates the Goa plan', async () => {
      const res = await request(app.getHttpServer())
        .post('/plans')
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'nta-goa')
        .set('x-user-location', 'Goa')
        .send({
          title: 'Ultimate Goa Tour',
          description: 'A 5-day tour of Goa beaches',
          from: 'Goa',
          destination: 'Goa',
          duration: 5,
          price: 25000,
          itinerary: [{ day: 'Day 1', title: 'Arrival', detail: 'Arrive in Goa' }]
        });
      
      console.log('CREATE PLAN ERROR:', res.body);
      expect(res.status).toBe(201);
      
      planId = res.body.id;
      expect(planId).toBeDefined();
    });
  });

  describe('Step 2: Goa Guide Applies', () => {
    beforeAll(async () => {
      // Create Guide Profiles first using SUPERADMIN role to bypass NTA restriction
      // while spoofing the x-user-id to be the guide's ID.
      await request(app.getHttpServer())
        .post('/guide')
        .set('x-user-role', 'superadmin')
        .set('x-user-id', 'guide-goa')
        .set('x-user-location', 'Goa')
        .send({
          fname: 'Goa',
          lname: 'Guide',
          email: 'guide-goa@example.com',
          phone: 9876543210,
          location: 'Goa',
          prof_title: 'Goa Guide',
          years_exp: 5,
          bio: 'Local Goa expert',
          lang_spoken: ['English'],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/guide')
        .set('x-user-role', 'superadmin')
        .set('x-user-id', 'guide-delhi')
        .set('x-user-location', 'Delhi')
        .send({
          fname: 'Delhi',
          lname: 'Guide',
          email: 'guide-delhi@example.com',
          phone: 9876543211,
          location: 'Delhi',
          prof_title: 'Delhi Guide',
          years_exp: 3,
          bio: 'Local Delhi expert',
          lang_spoken: ['Hindi'],
        })
        .expect(201);
    });

    it('Delhi Guide tries to apply for the Goa plan (Blocked)', async () => {
      await request(app.getHttpServer())
        .post('/guide-applications')
        .set('x-user-role', 'guide')
        .set('x-user-id', 'guide-delhi')
        .set('x-user-location', 'Delhi')
        .send({
          planId: planId,
          guidePricePerPerson: 500,
        })
        .expect(403);
    });

    it('Goa Guide successfully applies for the Goa plan', async () => {
      const res = await request(app.getHttpServer())
        .post('/guide-applications')
        .set('x-user-role', 'guide')
        .set('x-user-id', 'guide-goa')
        .set('x-user-location', 'Goa')
        .send({
          planId: planId,
          guidePricePerPerson: 500,
        })
        .expect(201);
      
      applicationId = res.body.id;
      expect(applicationId).toBeDefined();
    });
  });

  describe('Step 3: Goa Hotel Operations', () => {
    it('Goa Hotel Partner creates a hotel in Goa', async () => {
      const res = await request(app.getHttpServer())
        .post('/hotels')
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-goa')
        .set('x-user-location', 'Goa')
        .send({
          name: 'Goa Beach Resort',
          city: 'Goa',
          location: 'Goa',
          description: 'A beautiful resort.',
          stars: 5,
          pricePerNight: 5000,
          totalRooms: 10,
        })
        .expect(201);
      hotelId = res.body.id;
    });

    it('Traveller books the Goa hotel', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-123')
        .send({
          hotelId: hotelId,
          guestName: 'John Doe',
          email: 'john@example.com',
          phone: '+919999999999',
          checkIn: '2026-12-01',
          checkOut: '2026-12-05',
          guests: 2,
          roomType: 'Deluxe'
        })
        .expect(201);
      bookingId = res.body.id;
    });

    it('Delhi Hotel Partner tries to check-in the Goa booking (Blocked)', async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/check-in`)
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-delhi')
        .set('x-user-location', 'Delhi')
        .expect(403);
    });

    it('Goa Hotel Partner successfully checks-in the booking', async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/check-in`)
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-goa')
        .set('x-user-location', 'Goa')
        .expect(200);
    });
  });
});
