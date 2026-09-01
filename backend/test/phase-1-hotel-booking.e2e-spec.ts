import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

jest.setTimeout(60000);

describe('Cross-Actor Booking Flow Validation (e2e)', () => {
  let app: INestApplication;

  let hotelIdGoa: string;
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

  describe('Phase 1 — Hotel Booking Flow (End-to-End)', () => {
    beforeAll(async () => {
      // Create a Goa Hotel so the traveller can book it
      const res = await request(app.getHttpServer())
        .post('/hotels')
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-goa')
        .set('x-user-location', 'Goa')
        .send({
          name: 'The Goa Resort',
          city: 'Goa',
          location: 'Goa',
          description: 'A beautiful resort.',
          stars: 5,
          pricePerNight: 5000,
          totalRooms: 10,
        })
        .expect(201);
      hotelIdGoa = res.body.id;
    });

    describe('Valid Flow', () => {
      it('Traveller books a Goa hotel', async () => {
        const res = await request(app.getHttpServer())
          .post('/bookings')
          .set('x-user-role', 'TRAVELLER')
          .set('x-user-id', 'traveller-1')
          .send({
            hotelId: hotelIdGoa,
            guestName: 'John Doe',
            email: 'john@example.com',
            phone: '+919999999999',
            checkIn: '2026-11-01',
            checkOut: '2026-11-05',
            guests: 2,
            roomType: 'Deluxe'
          })
          .expect(201);
        
        bookingId = res.body.id;
        expect(res.body.hotelId).toBe(hotelIdGoa);
      });

      it('Hotel Partner (Goa) can View booking', async () => {
        const res = await request(app.getHttpServer())
          .get('/partners/bookings')
          .set('x-user-role', 'PARTNER')
          .set('x-user-id', 'partner-goa')
          .set('x-user-location', 'Goa')
          .expect(200);

        // Expect the booking to be in the list
        const bookings = res.body;
        const found = bookings.find((b: any) => b.id === bookingId);
        expect(found).toBeDefined();
        // Since hotel is returned, location is Goa
        expect(found.hotel.location).toBe('Goa');
      });
    });

    describe('Invalid Flow', () => {
      it('Hotel Partner (Delhi) tries: View Goa booking (Does not return Goa bookings)', async () => {
        const res = await request(app.getHttpServer())
          .get('/partners/bookings')
          .set('x-user-role', 'PARTNER')
          .set('x-user-id', 'partner-delhi')
          .set('x-user-location', 'Delhi')
          .expect(200);

        // Delhi partner should NOT see the Goa booking
        const found = res.body.find((b: any) => b.id === bookingId);
        expect(found).toBeUndefined();
      });

      it('Hotel Partner (Delhi) tries: Check-in Goa booking (Blocked)', async () => {
        await request(app.getHttpServer())
          .patch(`/bookings/${bookingId}/check-in`)
          .set('x-user-role', 'PARTNER')
          .set('x-user-id', 'partner-delhi')
          .set('x-user-location', 'Delhi')
          .expect(403);
      });

      it('Hotel Partner (Delhi) tries: Check-out Goa booking (Blocked)', async () => {
        // Technically it fails because it's not checked-in first, but the authorization check
        // happens BEFORE the status check, so it should be 403 Forbidden.
        await request(app.getHttpServer())
          .patch(`/bookings/${bookingId}/check-out`)
          .set('x-user-role', 'PARTNER')
          .set('x-user-id', 'partner-delhi')
          .set('x-user-location', 'Delhi')
          .expect(403);
      });

      it('Another Traveller tries: Cancel booking (Blocked)', async () => {
        await request(app.getHttpServer())
          .patch(`/bookings/${bookingId}/cancel`)
          .set('x-user-role', 'TRAVELLER')
          .set('x-user-id', 'traveller-malicious')
          .expect(403);
      });
    });

    describe('Valid Flow (Continuation)', () => {
      it('Hotel Partner (Goa) can Check-in', async () => {
        await request(app.getHttpServer())
          .patch(`/bookings/${bookingId}/check-in`)
          .set('x-user-role', 'PARTNER')
          .set('x-user-id', 'partner-goa')
          .set('x-user-location', 'Goa')
          .expect(200);
      });

      it('Hotel Partner (Goa) can Check-out', async () => {
        await request(app.getHttpServer())
          .patch(`/bookings/${bookingId}/check-out`)
          .set('x-user-role', 'PARTNER')
          .set('x-user-id', 'partner-goa')
          .set('x-user-location', 'Goa')
          .expect(200);
      });
    });
  });
});
