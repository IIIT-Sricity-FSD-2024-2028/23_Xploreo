import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

jest.setTimeout(60000);

describe('Phase 4 - Booking Flows (e2e)', () => {
  let app: INestApplication;

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

  describe('Hotel Bookings', () => {
    let bookingId: string;
    let hotelId = 'hotel-test-goa'; // Using a known mock hotel or we can create one

    beforeAll(async () => {
      // Create a mock hotel in Goa first
      const res = await request(app.getHttpServer())
        .post('/hotels')
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-goa')
        .set('x-user-location', 'Goa')
        .send({
          name: 'Goa Resort',
          city: 'Goa',
          location: 'Goa',
          description: 'A resort in Goa',
          stars: 4,
          pricePerNight: 2000,
          totalRooms: 10,
        });
      hotelId = res.body.id;
    });

    it('CREATE: Traveller books a hotel', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-1')
        .send({
          hotelId: hotelId,
          guestName: 'John Doe',
          email: 'john@example.com',
          phone: '+919999999999',
          checkIn: '2026-10-01',
          checkOut: '2026-10-05',
          guests: 2,
          roomType: 'Deluxe',
        })
        .expect(201);
      
      bookingId = res.body.id;
      expect(res.body.travellerId).toBe('traveller-1');
    });

    it('OWNERSHIP: Another traveller cannot cancel the booking', async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-hacker')
        .expect(403);
    });

    it('LOCATION RESTRICTION: Partner (Delhi) cannot check-in the Goa booking', async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/check-in`)
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-delhi')
        .set('x-user-location', 'Delhi')
        .expect(403);
    });

    it('PARTNER ACTION: Partner (Goa) can check-in the Goa booking', async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/check-in`)
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-goa')
        .set('x-user-location', 'Goa')
        .expect(200);
    });

    it('CANCELLATION: Traveller can cancel their own booking (if allowed by status/rules)', async () => {
      // Note: depending on business logic, they might not be able to cancel after check-in, 
      // but assuming they can for the test, or we create a new booking to test cancellation
      const newBooking = await request(app.getHttpServer())
        .post('/bookings')
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-1')
        .send({
          hotelId: hotelId,
          guestName: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+919999999999',
          checkIn: '2026-11-01',
          checkOut: '2026-11-05',
          guests: 2,
          roomType: 'Standard',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/bookings/${newBooking.body.id}/cancel`)
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-1')
        .expect(200);
    });
  });

  describe('Experience Bookings', () => {
    let expBookingId: string;
    let expId = 'exp-test-jaipur';

    beforeAll(async () => {
      // Create a mock experience in Jaipur first
      const res = await request(app.getHttpServer())
        .post('/experiences')
        .set('x-user-role', 'EXPERIENCE_PARTNER')
        .set('x-user-id', 'exp-partner-jaipur')
        .set('x-user-location', 'Jaipur')
        .send({
          title: 'Jaipur Fort Tour',
          description: 'A tour of Jaipur forts',
          destination: 'Jaipur',
          category: 'tours',
          price: 1500,
          durationHours: 4,
          capacity: 10,
        });
      expId = res.body.id;
    });

    it('CREATE: Traveller books an experience', async () => {
      const res = await request(app.getHttpServer())
        .post('/experience-bookings')
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-2')
        .send({
          experienceId: expId,
          guestName: 'John Doe',
          email: 'john@example.com',
          phone: '+919999999999',
          date: '2026-10-10',
          time: '10:00 AM',
          participants: 2,
        })
        .expect(201);
      
      expBookingId = res.body.id;
      expect(res.body.travellerId).toBe('traveller-2');
    });

    it('OWNERSHIP: Another traveller cannot cancel the experience booking', async () => {
      await request(app.getHttpServer())
        .patch(`/experience-bookings/${expBookingId}/status`)
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-hacker')
        .send({ status: 'CANCELLED' })
        .expect(403);
    });

    it('LOCATION RESTRICTION: Exp Partner (Mumbai) cannot confirm the Jaipur booking', async () => {
      await request(app.getHttpServer())
        .patch(`/experience-bookings/${expBookingId}/status`)
        .set('x-user-role', 'EXPERIENCE_PARTNER')
        .set('x-user-id', 'exp-partner-mumbai')
        .set('x-user-location', 'Mumbai')
        .send({ status: 'CONFIRMED' })
        .expect(403);
    });

    it('PARTNER ACTION: Exp Partner (Jaipur) can confirm the Jaipur booking', async () => {
      await request(app.getHttpServer())
        .patch(`/experience-bookings/${expBookingId}/status`)
        .set('x-user-role', 'EXPERIENCE_PARTNER')
        .set('x-user-id', 'exp-partner-jaipur')
        .set('x-user-location', 'Jaipur')
        .send({ status: 'CONFIRMED' })
        .expect(200);
    });

    it('CANCELLATION: Traveller can cancel their own experience booking', async () => {
      const newBooking = await request(app.getHttpServer())
        .post('/experience-bookings')
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-2')
        .send({
          experienceId: expId,
          guestName: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+919999999999',
          date: '2026-11-10',
          time: '10:00 AM',
          participants: 2,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/experience-bookings/${newBooking.body.id}/status`)
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-2')
        .send({ status: 'CANCELLED' })
        .expect(200);
    });
  });
});
