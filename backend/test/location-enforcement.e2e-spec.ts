import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

jest.setTimeout(60000);

describe('Fixed Location Ownership (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const reflector = app.get(Reflector);
    app.useGlobalGuards(new AuthGuard(reflector), new RolesGuard(reflector));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Auth & Location Headers', () => {
    it('login returns x-user-location header for actors', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'hotel_partner', password: 'partner@123' })
        .expect(201);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.location).toBe('Goa');
      expect(res.body.headers['x-user-location']).toBe('Goa');
    });

    it('register rejects invalid location for actors', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'invalid_actor_loc',
          name: 'Invalid Actor',
          email: 'invalid@example.com',
          phone: '9999999999',
          password: 'pass@123456',
          role: 'hotel',
          location: 'London',
        })
        .expect(400);
    });

    it('register accepts valid predefined location for actors', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'valid_actor_jaipur',
          name: 'Jaipur Actor',
          email: 'jaipur.actor@example.com',
          phone: '9888888888',
          password: 'pass@123456',
          role: 'hotel',
          location: 'Jaipur',
        })
        .expect(201);

      expect(res.body.user.location).toBe('Jaipur');
    });
  });

  describe('2. Hotel Partner Scoping & Enforcement', () => {
    it('allows hotel partner to create hotel in assigned location (Goa)', async () => {
      const res = await request(app.getHttpServer())
        .post('/hotels')
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'hotel-partner-goa')
        .set('x-user-location', 'Goa')
        .send({
          name: 'Goa Palms Resort',
          city: 'Candolim, Goa',
          location: 'Goa',
          description: 'A beautiful resort by the beach',
          stars: 4,
          pricePerNight: 3500,
          totalRooms: 15,
        })
        .expect(201);

      expect(res.body.location).toBe('Goa');
      expect(res.body.city).toBe('Candolim, Goa');
      expect(res.body.partnerId).toBe('hotel-partner-goa');
    });

    it('rejects hotel partner attempting to create hotel in different location (Delhi)', async () => {
      await request(app.getHttpServer())
        .post('/hotels')
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'hotel-partner-goa')
        .set('x-user-location', 'Goa')
        .send({
          name: 'Delhi Royal Palace',
          city: 'Connaught Place, Delhi',
          location: 'Delhi',
          description: 'Luxury hotel in the heart of Delhi',
          stars: 5,
          pricePerNight: 6000,
          totalRooms: 20,
        })
        .expect(403);
    });
  });

  describe('3. Experience Partner Scoping & Enforcement', () => {
    it('allows experience partner to create experience in assigned location (Goa)', async () => {
      const res = await request(app.getHttpServer())
        .post('/experiences')
        .set('x-user-role', 'EXPERIENCE_PARTNER')
        .set('x-user-id', 'exp-partner-goa')
        .set('x-user-location', 'Goa')
        .send({
          title: 'Goa Kayaking Adventure',
          description: 'Explore Goa backwaters on kayak with safety guide.',
          destination: 'Goa',
          category: 'water sports',
          price: 1500,
          durationHours: 3,
          capacity: 10,
        })
        .expect(201);

      expect(res.body.destination).toBe('Goa');
      expect(res.body.partnerId).toBe('exp-partner-goa');
    });

    it('rejects experience partner attempting to create experience in different location (Jaipur)', async () => {
      await request(app.getHttpServer())
        .post('/experiences')
        .set('x-user-role', 'EXPERIENCE_PARTNER')
        .set('x-user-id', 'exp-partner-goa')
        .set('x-user-location', 'Goa')
        .send({
          title: 'Jaipur Desert Safari',
          description: 'Camel safari through desert dunes in Jaipur.',
          destination: 'Jaipur',
          category: 'adventure',
          price: 2500,
          durationHours: 4,
          capacity: 10,
        })
        .expect(403);
    });
  });

  describe('4. NTA (Non-Tech Admin) Package Scoping & Enforcement', () => {
    it('allows NTA to create travel plan in assigned location (Goa)', async () => {
      const res = await request(app.getHttpServer())
        .post('/plans')
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'NTA-goa')
        .set('x-user-location', 'Goa')
        .send({
          title: 'Goa Sun & Sand 4D3N',
          description: 'Enjoy the golden beaches of Goa.',
          from: 'Mumbai',
          destination: 'Goa',
          duration: 4,
          price: 15000,
          hotelStars: 4,
          itinerary: {
            day1: {
              hotel: { name: 'Goa Resort' },
              transport: { provider: 'Goa Cabs' },
            },
          },
        })
        .expect(201);

      expect(res.body.destination).toBe('Goa');
    });

    it('rejects NTA attempting to create travel plan for a different location (Delhi)', async () => {
      await request(app.getHttpServer())
        .post('/plans')
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'NTA-goa')
        .set('x-user-location', 'Goa')
        .send({
          title: 'Delhi Heritage Tour',
          description: 'Historical tour of Delhi.',
          from: 'Mumbai',
          destination: 'Delhi',
          duration: 3,
          price: 12000,
          hotelStars: 3,
          itinerary: {
            day1: {
              hotel: { name: 'Delhi Inn' },
              transport: { provider: 'Delhi Cabs' },
            },
          },
        })
        .expect(403);
    });

    it('scopes plan listing to NTA assigned location', async () => {
      const res = await request(app.getHttpServer())
        .get('/plans')
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'NTA-goa')
        .set('x-user-location', 'Goa')
        .expect(200);

      const items = res.body.items || [];
      expect(items.length).toBeGreaterThan(0);
      for (const plan of items) {
        expect(plan.destination.toLowerCase()).toContain('goa');
      }
    });
  });

  describe('5. Guide Scoping & Application Isolation', () => {
    it('scopes plan listing for guide to assigned location (Delhi)', async () => {
      const res = await request(app.getHttpServer())
        .get('/plans')
        .set('x-user-role', 'guide')
        .set('x-user-id', 'guide-delhi-1')
        .set('x-user-location', 'Delhi')
        .expect(200);

      const items = res.body.items || [];
      expect(items.length).toBeGreaterThan(0);
      for (const plan of items) {
        expect(plan.destination.toLowerCase()).toContain('delhi');
      }
    });

    it('allows guide to apply to a plan in their assigned location', async () => {
      const res = await request(app.getHttpServer())
        .post('/guide-applications')
        .set('x-user-role', 'guide')
        .set('x-user-id', 'guide-delhi-1')
        .set('x-user-location', 'Delhi')
        .send({
          planId: 'plan-delhi-1',
          guidePricePerPerson: 1000,
        })
        .expect(201);

      expect(res.body.status).toBe('accepted');
    });

    it('rejects guide attempting to apply to a plan in another location (Goa)', async () => {
      await request(app.getHttpServer())
        .post('/guide-applications')
        .set('x-user-role', 'guide')
        .set('x-user-id', 'guide-delhi-1')
        .set('x-user-location', 'Delhi')
        .send({
          planId: 'plan-goa-1',
          guidePricePerPerson: 1200,
        })
        .expect(403);
    });
  });
});
