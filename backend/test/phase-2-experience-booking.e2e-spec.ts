import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

jest.setTimeout(60000);

describe('Cross-Actor Booking Flow Validation - Experience (e2e)', () => {
  let app: INestApplication;

  let expIdGoa: string;
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

  describe('Phase 2 — Experience Booking Flow (End-to-End)', () => {
    beforeAll(async () => {
      // Create a Goa Experience so the traveller can book it
      const res = await request(app.getHttpServer())
        .post('/experiences')
        .set('x-user-role', 'EXPERIENCE_PARTNER')
        .set('x-user-id', 'exp-partner-goa')
        .set('x-user-location', 'Goa')
        .send({
          title: 'Goa Snorkeling',
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

    describe('Valid Flow', () => {
      it('Traveller books a Goa experience', async () => {
        const res = await request(app.getHttpServer())
          .post('/experience-bookings')
          .set('x-user-role', 'TRAVELLER')
          .set('x-user-id', 'traveller-1')
          .send({
            experienceId: expIdGoa,
            guestName: 'Jane Doe',
            email: 'jane@example.com',
            phone: '+919999999999',
            date: '2026-11-01',
            time: '10:00',
            participants: 2
          })
          .expect(201);
        
        bookingId = res.body.id;
        expect(res.body.experienceId).toBe(expIdGoa);
      });

      it('Experience Partner (Goa) can View booking', async () => {
        const res = await request(app.getHttpServer())
          .get('/experience-bookings')
          .set('x-user-role', 'EXPERIENCE_PARTNER')
          .set('x-user-id', 'exp-partner-goa')
          .set('x-user-location', 'Goa')
          .expect(200);

        // Expect the booking to be in the list
        const bookings = res.body;
        const found = bookings.find((b: any) => b.id === bookingId);
        expect(found).toBeDefined();
        // Check implicitly that the experience location is Goa
        expect(found.experience.destination).toBe('Goa');
      });
    });

    describe('Invalid Flow', () => {
      it('Experience Partner (Mumbai) tries: View Goa booking (Does not return Goa bookings)', async () => {
        const res = await request(app.getHttpServer())
          .get('/experience-bookings')
          .set('x-user-role', 'EXPERIENCE_PARTNER')
          .set('x-user-id', 'exp-partner-mumbai')
          .set('x-user-location', 'Mumbai')
          .expect(200);

        // Mumbai partner should NOT see the Goa booking
        const found = res.body.find((b: any) => b.id === bookingId);
        expect(found).toBeUndefined();
      });

      it('Experience Partner (Mumbai) tries: Update Goa booking status (Blocked)', async () => {
        await request(app.getHttpServer())
          .patch(`/experience-bookings/${bookingId}/status`)
          .set('x-user-role', 'EXPERIENCE_PARTNER')
          .set('x-user-id', 'exp-partner-mumbai')
          .set('x-user-location', 'Mumbai')
          .send({ status: 'confirmed' })
          .expect(403);
      });
    });

    describe('Valid Flow (Continuation)', () => {
      it('Experience Partner (Goa) can Update status', async () => {
        await request(app.getHttpServer())
          .patch(`/experience-bookings/${bookingId}/status`)
          .set('x-user-role', 'EXPERIENCE_PARTNER')
          .set('x-user-id', 'exp-partner-goa')
          .set('x-user-location', 'Goa')
          .send({ status: 'confirmed' })
          .expect(200);
      });
    });
  });
});
