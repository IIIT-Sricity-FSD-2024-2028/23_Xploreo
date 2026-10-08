import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

jest.setTimeout(60000);

describe('Phase 4 — Location Integrity Check (e2e)', () => {
  let app: INestApplication;

  let hotelGoaId: string;
  let hotelDelhiId: string;
  let bookingGoaId: string;
  let bookingDelhiId: string;

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

  describe('Setup Resources', () => {
    it('Setup: Create Goa and Delhi Hotels', async () => {
      let res = await request(app.getHttpServer())
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
      hotelGoaId = res.body.id;

      res = await request(app.getHttpServer())
        .post('/hotels')
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-delhi')
        .set('x-user-location', 'Delhi')
        .send({
          name: 'The Delhi Resort',
          city: 'Delhi',
          location: 'Delhi',
          description: 'A beautiful resort.',
          stars: 5,
          pricePerNight: 5000,
          totalRooms: 10,
        })
        .expect(201);
      hotelDelhiId = res.body.id;
    });

    it('Setup: Traveller books both hotels', async () => {
      let res = await request(app.getHttpServer())
        .post('/bookings')
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-1')
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

      res = await request(app.getHttpServer())
        .post('/bookings')
        .set('x-user-role', 'TRAVELLER')
        .set('x-user-id', 'traveller-1')
        .send({
          hotelId: hotelDelhiId,
          guestName: 'Traveller A',
          email: 'a@example.com',
          phone: '+919999999999',
          checkIn: '2026-11-01',
          checkOut: '2026-11-05',
          guests: 2,
          roomType: 'Deluxe'
        })
        .expect(201);
      bookingDelhiId = res.body.id;
    });
  });

  describe('Location Integrity Check', () => {
    it('Verify: Goa Partner only sees Goa bookings and location matches', async () => {
      const res = await request(app.getHttpServer())
        .get('/partners/bookings')
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-goa')
        .set('x-user-location', 'Goa')
        .expect(200);

      // Extract Goa Booking
      const goaBooking = res.body.find((b: any) => b.id === bookingGoaId);
      expect(goaBooking).toBeDefined();

      // Check Integrity: Booking Location = Resource Location
      expect(goaBooking.hotel.location).toBe('Goa');

      // Check Integrity: Booking Location = Actor Location
      expect(goaBooking.hotel.location).toBe('Goa'); // Actor was Goa

      // Ensure Delhi booking is NOT in the list
      const delhiBooking = res.body.find((b: any) => b.id === bookingDelhiId);
      expect(delhiBooking).toBeUndefined();
    });

    it('Verify: Delhi Partner only sees Delhi bookings and location matches', async () => {
      const res = await request(app.getHttpServer())
        .get('/partners/bookings')
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-delhi')
        .set('x-user-location', 'Delhi')
        .expect(200);

      // Extract Delhi Booking
      const delhiBooking = res.body.find((b: any) => b.id === bookingDelhiId);
      expect(delhiBooking).toBeDefined();

      // Check Integrity: Booking Location = Resource Location
      expect(delhiBooking.hotel.location).toBe('Delhi');

      // Ensure Goa booking is NOT in the list
      const goaBooking = res.body.find((b: any) => b.id === bookingGoaId);
      expect(goaBooking).toBeUndefined();
    });

    it('Verify Check-in Integrity (Goa Hotel -> Goa Actor ✅)', async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingGoaId}/check-in`)
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-goa')
        .set('x-user-location', 'Goa')
        .expect(200);
    });

    it('Verify Check-in Integrity (Goa Hotel -> Delhi Actor ❌ Blocked)', async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingGoaId}/check-out`)
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'partner-delhi')
        .set('x-user-location', 'Delhi')
        .expect(403);
    });
  });
});
