import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

jest.setTimeout(60000);

describe('Actor Isolation (e2e)', () => {
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

  describe('1. NTA (Non-Tech Admin) - Plans Module', () => {
    let createdPlanId: string;

    it('CREATE: allows NTA to create plan in their location', async () => {
      const res = await request(app.getHttpServer())
        .post('/plans')
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'nta-mumbai')
        .set('x-user-location', 'Mumbai')
        .send({
          title: 'Mumbai City Tour',
          description: 'A grand tour of Mumbai',
          from: 'Delhi',
          destination: 'Mumbai',
          duration: 2,
          price: 5000,
          itinerary: [{ day: 'Day 1', title: 'Arrival', detail: 'Arrive in Mumbai' }],
        })
        .expect(201);
      
      createdPlanId = res.body.id;
      expect(res.body.destination).toBe('Mumbai');
    });

    it('CREATE: rejects NTA creating plan in another location', async () => {
      await request(app.getHttpServer())
        .post('/plans')
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'nta-mumbai')
        .set('x-user-location', 'Mumbai')
        .send({
          title: 'Delhi City Tour',
          description: 'A grand tour of Delhi',
          from: 'Mumbai',
          destination: 'Delhi',
          duration: 2,
          price: 5000,
          itinerary: [{ day: 'Day 1', title: 'Arrival', detail: 'Arrive in Delhi' }],
        })
        .expect(403);
    });

    it('VIEW: NTA sees only plans in their location', async () => {
      const res = await request(app.getHttpServer())
        .get('/plans')
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'nta-mumbai')
        .set('x-user-location', 'Mumbai')
        .expect(200);
      
      const items = res.body.items || [];
      expect(items.length).toBeGreaterThan(0);
      items.forEach(p => expect(p.destination.toLowerCase()).toContain('mumbai'));
    });

    it('UPDATE: NTA can update their own location plan', async () => {
      await request(app.getHttpServer())
        .patch(`/plans/${createdPlanId}`)
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'nta-mumbai')
        .set('x-user-location', 'Mumbai')
        .send({ price: 6000 })
        .expect(200);
    });

    it('UPDATE: NTA cannot update plan to a different location', async () => {
      await request(app.getHttpServer())
        .patch(`/plans/${createdPlanId}`)
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'nta-mumbai')
        .set('x-user-location', 'Mumbai')
        .send({ destination: 'Delhi' })
        .expect(403);
    });

    it('UPDATE: NTA (Delhi) cannot update NTA (Mumbai) plan', async () => {
      await request(app.getHttpServer())
        .patch(`/plans/${createdPlanId}`)
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'nta-delhi')
        .set('x-user-location', 'Delhi')
        .send({ price: 7000 })
        .expect(403);
    });

    it('DELETE: NTA (Delhi) cannot delete NTA (Mumbai) plan', async () => {
      await request(app.getHttpServer())
        .delete(`/plans/${createdPlanId}`)
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'nta-delhi')
        .set('x-user-location', 'Delhi')
        .expect(403);
    });

    it('DELETE: NTA can delete their own plan', async () => {
      await request(app.getHttpServer())
        .delete(`/plans/${createdPlanId}`)
        .set('x-user-role', 'nontechadmin')
        .set('x-user-id', 'nta-mumbai')
        .set('x-user-location', 'Mumbai')
        .expect(200);
    });
  });

  describe('2. Hotel Partner - Hotels Module', () => {
    let createdHotelId: string;

    it('CREATE: allows Partner to create hotel in their location', async () => {
      const res = await request(app.getHttpServer())
        .post('/hotels')
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'hotel-partner-kerala')
        .set('x-user-location', 'Kerala')
        .send({
          name: 'Kerala Houseboat',
          city: 'Alleppey, Kerala',
          location: 'Kerala',
          description: 'A beautiful houseboat',
          stars: 4,
          pricePerNight: 5000,
          totalRooms: 5,
        })
        .expect(201);
      
      createdHotelId = res.body.id;
      expect(res.body.location).toBe('Kerala');
    });

    it('UPDATE: Partner (Jaipur) cannot update Partner (Kerala) hotel', async () => {
      await request(app.getHttpServer())
        .patch(`/hotels/${createdHotelId}`)
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'hotel-partner-jaipur')
        .set('x-user-location', 'Jaipur')
        .send({ pricePerNight: 6000 })
        .expect(403);
    });

    it('DELETE: Partner can delete their own hotel', async () => {
      await request(app.getHttpServer())
        .delete(`/hotels/${createdHotelId}`)
        .set('x-user-role', 'PARTNER')
        .set('x-user-id', 'hotel-partner-kerala')
        .set('x-user-location', 'Kerala')
        .expect(200);
    });
  });

  describe('3. Experience Partner - Experiences Module', () => {
    let createdExpId: string;

    it('CREATE: allows Exp Partner to create experience in their location', async () => {
      const res = await request(app.getHttpServer())
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
      
      createdExpId = res.body.id;
      expect(res.body.destination).toBe('Jaipur');
    });

    it('UPDATE: Exp Partner (Delhi) cannot update Exp Partner (Jaipur) experience', async () => {
      await request(app.getHttpServer())
        .patch(`/experiences/${createdExpId}`)
        .set('x-user-role', 'EXPERIENCE_PARTNER')
        .set('x-user-id', 'exp-partner-delhi')
        .set('x-user-location', 'Delhi')
        .send({ price: 2000 })
        .expect(403);
    });
    
    it('DELETE: Exp Partner can delete their own experience', async () => {
      await request(app.getHttpServer())
        .delete(`/experiences/${createdExpId}`)
        .set('x-user-role', 'EXPERIENCE_PARTNER')
        .set('x-user-id', 'exp-partner-jaipur')
        .set('x-user-location', 'Jaipur')
        .expect(200);
    });
  });
});
