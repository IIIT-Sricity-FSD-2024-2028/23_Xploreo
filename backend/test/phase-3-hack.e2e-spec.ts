import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

jest.setTimeout(60000);

describe('Phase 3 - Hacking the System (e2e)', () => {
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

  describe('Hack 1: Send fake payload location', () => {
    it('NTA (Goa) tries to create a plan in Delhi', async () => {
      await request(app.getHttpServer())
        .post('/plans')
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'nta-goa')
        .set('x-user-location', 'Goa') // Real assigned location
        .send({
          title: 'Delhi Heritage Tour',
          description: 'A beautiful tour of Delhi.',
          from: 'Goa',
          destination: 'Delhi', // FAKE PAYLOAD LOCATION
          duration: 3,
          price: 15000,
          itinerary: [{ day: 'Day 1', title: 'Arrival', detail: 'Arrive in Delhi' }]
        })
        .expect(403);
    });

    it('Hotel Partner (Jaipur) tries to create a hotel in Mumbai', async () => {
      await request(app.getHttpServer())
        .post('/hotels')
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'hotel-partner-jaipur')
        .set('x-user-location', 'Jaipur') // Real assigned location
        .send({
          name: 'Mumbai Sea View',
          city: 'Marine Drive, Mumbai',
          location: 'Mumbai', // FAKE PAYLOAD LOCATION
          description: 'Sea facing view in Mumbai.',
          stars: 5,
          pricePerNight: 8000,
          totalRooms: 10,
        })
        .expect(403);
    });
  });

  describe('Hack 2: Access another location data', () => {
    it('Guide (Delhi) tries to view Plans but only gets Delhi plans (No Goa/Mumbai data leaks)', async () => {
      const res = await request(app.getHttpServer())
        .get('/plans')
        .set('x-user-role', 'guide')
        .set('x-user-id', 'guide-delhi')
        .set('x-user-location', 'Delhi')
        .expect(200);
      
      const items = res.body.items || [];
      expect(items.length).toBeGreaterThan(0);
      for (const plan of items) {
        // Guarantee no other location leaked
        expect(plan.destination.toLowerCase()).toContain('delhi');
      }
    });

    it('NTA (Mumbai) tries to forcibly query Goa plans via query param', async () => {
      const res = await request(app.getHttpServer())
        .get('/plans?destination=Goa') // HACK ATTEMPT: Pass query param to fetch another region
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'nta-mumbai')
        .set('x-user-location', 'Mumbai')
        .expect(200);

      // The backend should forcibly block this and return empty array or ignore the query and return Mumbai
      const items = res.body.items || [];
      expect(items.length).toBe(0); // Because they asked for Goa but are only allowed Mumbai
    });
  });

  describe('Hack 3: Modify another location resource', () => {
    it('Experience Partner (Kerala) tries to update Experience in Jaipur', async () => {
      // First, mock the creation of a Jaipur experience
      const expRes = await request(app.getHttpServer())
        .post('/experiences')
        .set('x-user-role', 'EXPERIENCE_PARTNER')
        .set('x-user-id', 'exp-partner-jaipur')
        .set('x-user-location', 'Jaipur')
        .send({
          title: 'Jaipur Fort Tour',
          description: 'A beautiful fort tour',
          destination: 'Jaipur',
          category: 'tours',
          price: 1500,
          durationHours: 4,
          capacity: 10,
        })
        .expect(201);
      
      const jaipurExpId = expRes.body.id;

      // NOW, Kerala partner tries to hack it
      await request(app.getHttpServer())
        .patch(`/experiences/${jaipurExpId}`)
        .set('x-user-role', 'EXPERIENCE_PARTNER')
        .set('x-user-id', 'exp-partner-kerala')
        .set('x-user-location', 'Kerala')
        .send({
          price: 1, // Hack attempt
        })
        .expect(403);
    });
  });
});
