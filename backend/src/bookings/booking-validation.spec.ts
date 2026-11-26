import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { Role } from '../auth/entities/auth.entity';
import { HotelsRepository } from '../hotels/hotels.repository';
import { BookingsService } from './bookings.service';
import { ExperienceBookingsService } from '../experience-bookings/experience-bookings.service';
import { ExperiencesRepository } from '../experiences/experiences.repository';
import { ExperienceAvailability } from '../experiences/entities/experience.entity';
import { GuideApplicationsRepository } from '../guide-applications/guide-applications.repository';
import { GuideRequestsRepository } from '../guide-requests/guide-requests.repository';
import { GuideRequestsService } from '../guide-requests/guide-requests.service';
import { GuideRequestStatus } from '../guide-requests/entities/guide-request.entity';
import { HotelsService } from '../hotels/hotels.service';
import { RoomTypesRepository } from '../hotels/room-types.repository';
import { PlansRepository } from '../plans/plans.repository';
import { TripGuidesService } from '../trip-guides/trip-guides.service';
import { TripsRepository } from '../trips/trips.repository';
import { TripsService } from '../trips/trips.service';
import { TripStatus } from '../trips/entities/trip.entity';

function futureIso(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function pastIso(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

async function createTestingContext() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  return {
    moduleRef,
    bookingsService: moduleRef.get(BookingsService),
    hotelsService: moduleRef.get(HotelsService),
    hotelsRepository: moduleRef.get(HotelsRepository),
    roomTypesRepository: moduleRef.get(RoomTypesRepository),
    expBookingsService: moduleRef.get(ExperienceBookingsService),
    experiencesRepository: moduleRef.get(ExperiencesRepository),
    plansRepository: moduleRef.get(PlansRepository),
    tripsService: moduleRef.get(TripsService),
    tripsRepository: moduleRef.get(TripsRepository),
    tripGuidesService: moduleRef.get(TripGuidesService),
    guideRequestsService: moduleRef.get(GuideRequestsService),
    guideRequestsRepository: moduleRef.get(GuideRequestsRepository),
    guideAppsRepository: moduleRef.get(GuideApplicationsRepository),
  };
}

describe('Platform-Wide Booking Validation Suite', () => {
  describe('1. Hotel & Room Capacity + Inventory (HP-JAI-001 Maharaja Suite Matrix)', () => {
    it('enforces exact capacity = maxOccupancy * rooms and live availableRooms across full matrix', async () => {
      const ctx = await createTestingContext();
      const checkInDate = futureIso(10);
      const checkOutDate = futureIso(12);

      const suite = ctx.roomTypesRepository.findById('room-hp-jai-001-suite');
      expect(suite).toBeDefined();
      expect(suite!.type).toBe('Maharaja Suite');
      expect(suite!.maxOccupancy).toBe(4);
      expect(suite!.totalRooms).toBe(6);
      expect(suite!.availableRooms).toBe(5);

      // Case 1: 1 room, 4 guests -> PASS (5 -> 4), cancel restores -> 5
      const b1 = ctx.bookingsService.create('T001', {
        hotelId: 'HP-JAI-001',
        roomType: 'Maharaja Suite',
        checkIn: checkInDate,
        checkOut: checkOutDate,
        rooms: 1,
        guests: 4,
      });
      expect(ctx.roomTypesRepository.findById('room-hp-jai-001-suite')!.availableRooms).toBe(4);
      ctx.bookingsService.cancel(b1.id, 'T001', Role.TRAVELLER);
      expect(ctx.roomTypesRepository.findById('room-hp-jai-001-suite')!.availableRooms).toBe(5);

      // Case 2: 1 room, 5 guests -> REJECT
      expect(() =>
        ctx.bookingsService.create('T001', {
          hotelId: 'HP-JAI-001',
          roomType: 'Maharaja Suite',
          checkIn: checkInDate,
          checkOut: checkOutDate,
          rooms: 1,
          guests: 5,
        }),
      ).toThrow(BadRequestException);

      // Case 3: 1 room, 8 guests (reported bug scenario) -> REJECT
      expect(() =>
        ctx.bookingsService.create('T001', {
          hotelId: 'HP-JAI-001',
          roomType: 'Maharaja Suite',
          checkIn: checkInDate,
          checkOut: checkOutDate,
          rooms: 1,
          guests: 8,
        }),
      ).toThrow(BadRequestException);

      // Case 4: 2 rooms, 8 guests -> PASS (5 -> 3), cancel restores -> 5
      const b2 = ctx.bookingsService.create('T001', {
        hotelId: 'HP-JAI-001',
        roomType: 'Maharaja Suite',
        checkIn: checkInDate,
        checkOut: checkOutDate,
        rooms: 2,
        guests: 8,
      });
      expect(ctx.roomTypesRepository.findById('room-hp-jai-001-suite')!.availableRooms).toBe(3);
      ctx.bookingsService.cancel(b2.id, 'T001', Role.TRAVELLER);
      expect(ctx.roomTypesRepository.findById('room-hp-jai-001-suite')!.availableRooms).toBe(5);

      // Case 5: 2 rooms, 9 guests -> REJECT
      expect(() =>
        ctx.bookingsService.create('T001', {
          hotelId: 'HP-JAI-001',
          roomType: 'Maharaja Suite',
          checkIn: checkInDate,
          checkOut: checkOutDate,
          rooms: 2,
          guests: 9,
        }),
      ).toThrow(BadRequestException);

      // Case 6: 3 rooms, 12 guests -> PASS (5 -> 2), cancel restores -> 5
      const b3 = ctx.bookingsService.create('T001', {
        hotelId: 'HP-JAI-001',
        roomType: 'Maharaja Suite',
        checkIn: checkInDate,
        checkOut: checkOutDate,
        rooms: 3,
        guests: 12,
      });
      expect(ctx.roomTypesRepository.findById('room-hp-jai-001-suite')!.availableRooms).toBe(2);
      ctx.bookingsService.cancel(b3.id, 'T001', Role.TRAVELLER);
      expect(ctx.roomTypesRepository.findById('room-hp-jai-001-suite')!.availableRooms).toBe(5);

      // Case 7: 5 rooms, 20 guests -> PASS (5 -> 0), subsequent 1-room booking -> REJECT, cancel -> 5
      const b5 = ctx.bookingsService.create('T001', {
        hotelId: 'HP-JAI-001',
        roomType: 'Maharaja Suite',
        checkIn: checkInDate,
        checkOut: checkOutDate,
        rooms: 5,
        guests: 20,
      });
      expect(ctx.roomTypesRepository.findById('room-hp-jai-001-suite')!.availableRooms).toBe(0);
      expect(() =>
        ctx.bookingsService.create('T001', {
          hotelId: 'HP-JAI-001',
          roomType: 'Maharaja Suite',
          checkIn: checkInDate,
          checkOut: checkOutDate,
          rooms: 1,
          guests: 1,
        }),
      ).toThrow(BadRequestException);
      ctx.bookingsService.cancel(b5.id, 'T001', Role.TRAVELLER);
      expect(ctx.roomTypesRepository.findById('room-hp-jai-001-suite')!.availableRooms).toBe(5);

      // Case 8: 6 rooms, 24 guests -> REJECT (exceeds availableRooms 5)
      expect(() =>
        ctx.bookingsService.create('T001', {
          hotelId: 'HP-JAI-001',
          roomType: 'Maharaja Suite',
          checkIn: checkInDate,
          checkOut: checkOutDate,
          rooms: 6,
          guests: 24,
        }),
      ).toThrow(BadRequestException);

      await ctx.moduleRef.close();
    });

    it('rejects unknown/inactive roomTypes, invalid calendar dates, past dates, and checkOut <= checkIn', async () => {
      const ctx = await createTestingContext();
      const checkInDate = futureIso(10);
      const checkOutDate = futureIso(12);

      // Unknown room type for hotel with configured roomTypes
      expect(() =>
        ctx.bookingsService.create('T001', {
          hotelId: 'HP-JAI-001',
          roomType: 'Nonexistent Presidential Villa',
          checkIn: checkInDate,
          checkOut: checkOutDate,
          rooms: 1,
          guests: 2,
        }),
      ).toThrow(BadRequestException);

      // Inactive room type
      ctx.roomTypesRepository.update('room-hp-jai-001-suite', { status: 'inactive' });
      expect(() =>
        ctx.bookingsService.create('T001', {
          hotelId: 'HP-JAI-001',
          roomType: 'Maharaja Suite',
          checkIn: checkInDate,
          checkOut: checkOutDate,
          rooms: 1,
          guests: 2,
        }),
      ).toThrow(BadRequestException);

      // Calendar rollover / past / inverted dates
      ctx.roomTypesRepository.update('room-hp-jai-001-suite', { status: 'active' });
      expect(() =>
        ctx.bookingsService.create('T001', {
          hotelId: 'HP-JAI-001',
          roomType: 'Maharaja Suite',
          checkIn: '2026-02-30',
          checkOut: '2026-03-02',
          rooms: 1,
          guests: 2,
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        ctx.bookingsService.create('T001', {
          hotelId: 'HP-JAI-001',
          roomType: 'Maharaja Suite',
          checkIn: pastIso(2),
          checkOut: checkOutDate,
          rooms: 1,
          guests: 2,
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        ctx.bookingsService.create('T001', {
          hotelId: 'HP-JAI-001',
          roomType: 'Maharaja Suite',
          checkIn: checkOutDate,
          checkOut: checkInDate,
          rooms: 1,
          guests: 2,
        }),
      ).toThrow(BadRequestException);

      // Hotel room update should clamp/recompute availableRooms consistently
      const hotel = ctx.hotelsRepository.findById('HP-JAI-001');
      expect(hotel).toBeDefined();
      const updatedRoom = ctx.hotelsService.updateRoom(
        'HP-JAI-001',
        'room-hp-jai-001-suite',
        hotel!.partnerId,
        { totalRooms: 3 },
        1,
      );
      expect(updatedRoom.totalRooms).toBe(3);
      expect(updatedRoom.availableRooms).toBe(2);

      await ctx.moduleRef.close();
    });
  });

  describe('2. Experience Slot Capacity & Availability Validation', () => {
    it('enforces slot availability, remaining capacity, calendar validity, and past date checks', async () => {
      const ctx = await createTestingContext();
      const openDate = futureIso(12);
      const closedDate = futureIso(15);

      const seededExp = ctx.experiencesRepository.create('EP-TEST-001', {
        title: 'Test Jaipur Culinary Walk',
        city: 'Jaipur',
        category: 'Food',
        price: 1500,
        duration: '2 hours',
        capacity: 4,
        description: 'Test experience',
        availability: ExperienceAvailability.AVAILABLE,
        slots: [
          { date: openDate, capacity: 4, booked: 1, available: true },
          { date: closedDate, capacity: 4, booked: 0, available: false },
        ],
      });

      // Exceeding remaining capacity (4 - 1 = 3 spots left, request 4) -> REJECT
      expect(() =>
        ctx.expBookingsService.create('T001', {
          experienceId: seededExp.id,
          date: openDate,
          participants: 4,
        }),
      ).toThrow(BadRequestException);

      // Slot with available: false -> REJECT
      expect(() =>
        ctx.expBookingsService.create('T001', {
          experienceId: seededExp.id,
          date: closedDate,
          participants: 1,
        }),
      ).toThrow(BadRequestException);

      // Past date -> REJECT
      expect(() =>
        ctx.expBookingsService.create('T001', {
          experienceId: seededExp.id,
          date: pastIso(1),
          participants: 1,
        }),
      ).toThrow(BadRequestException);

      // Valid within remaining capacity (3 participants) -> PASS, next 1 participant -> REJECT
      const eb = ctx.expBookingsService.create('T001', {
        experienceId: seededExp.id,
        date: openDate,
        participants: 3,
      });
      expect(eb.totalAmount).toBe(Math.round(1500 * 3 * 1.12));

      expect(() =>
        ctx.expBookingsService.create('T001', {
          experienceId: seededExp.id,
          date: openDate,
          participants: 1,
        }),
      ).toThrow(BadRequestException);

      await ctx.moduleRef.close();
    });
  });

  describe('3. Tour Package / Trip & Guide Conflict Validation', () => {
    it('rejects unknown planId (no allPlans[0] fallback), unavailable plan, past date, and multiplies price by travellers', async () => {
      const ctx = await createTestingContext();
      const plans = ctx.plansRepository.findAll().data;
      const availablePlan = plans.find((p) => p.status === 'available');
      expect(availablePlan).toBeDefined();

      // Unknown planId must throw NotFoundException instead of falling back to allPlans[0]
      expect(() =>
        ctx.tripsService.create(
          {
            travellerId: 'T001',
            planId: 'PLAN-DOES-NOT-EXIST-999',
          },
          { userId: 'T001', role: Role.TRAVELLER },
        ),
      ).toThrow(NotFoundException);

      // Past itinerary start date must reject
      const pastPlan = ctx.plansRepository.update(availablePlan!.id, {
        itinerary: {
          ...availablePlan!.itinerary,
          day1: {
            ...availablePlan!.itinerary.day1,
            hotel: {
              ...(availablePlan!.itinerary.day1.hotel || {
                hotelId: 'HP-JAI-001',
                roomType: 'Deluxe Room',
              }),
              checkInDate: pastIso(3),
              checkOutDate: futureIso(5),
            },
          },
        },
      });
      expect(pastPlan).toBeDefined();
      expect(() =>
        ctx.tripsService.create(
          {
            travellerId: 'T001',
            planId: availablePlan!.id,
          },
          { userId: 'T001', role: Role.TRAVELLER },
        ),
      ).toThrow(BadRequestException);

      // Valid future plan with travellers: 3 multiplies per-person amount cleanly
      const futureItinerary = {
        ...availablePlan!.itinerary,
        day1: {
          ...availablePlan!.itinerary.day1,
          flight: null,
          hotel: {
            hotelId: 'HP-JAI-001',
            roomType: 'Deluxe Room',
            checkInDate: futureIso(10),
            checkOutDate: futureIso(12),
          },
        },
        days: [{ dayNumber: 2, experiences: [] }],
      };

      const singleTrip = ctx.tripsService.create(
        {
          travellerId: 'T001',
          planId: availablePlan!.id,
          itinerary: futureItinerary,
          travellers: 1,
        },
        { userId: 'T001', role: Role.TRAVELLER },
      );
      const groupTrip = ctx.tripsService.create(
        {
          travellerId: 'T001',
          planId: availablePlan!.id,
          itinerary: futureItinerary,
          travellers: 3,
        },
        { userId: 'T001', role: Role.TRAVELLER },
      );
      expect(groupTrip.totalAmount).toBe(singleTrip.totalAmount * 3);

      // Unavailable / sold_out plan must reject
      ctx.plansRepository.update(availablePlan!.id, { status: 'sold_out' });
      expect(() =>
        ctx.tripsService.create(
          {
            travellerId: 'T001',
            planId: availablePlan!.id,
            itinerary: futureItinerary,
          },
          { userId: 'T001', role: Role.TRAVELLER },
        ),
      ).toThrow(BadRequestException);

      await ctx.moduleRef.close();
    });

    it('rejects past-trip guide requests and conflicting overlapping guide assignments', async () => {
      const ctx = await createTestingContext();
      const plans = ctx.plansRepository.findAll().data;
      const availablePlan = plans.find((p) => p.status === 'available');
      const apps = ctx.guideAppsRepository.findAll();
      const approvedApp = apps.find((a) => a.status === 'accepted');
      expect(availablePlan).toBeDefined();
      expect(approvedApp).toBeDefined();

      // Past trip cannot request a guide
      const pastTrip = ctx.tripsRepository.create({
        id: 'TRIP-PAST-GUIDE-TEST',
        travellerId: 'T001',
        planId: availablePlan!.id,
        status: TripStatus.CONFIRMED,
        totalAmount: availablePlan!.pricePerPerson,
        itinerary: {
          day1: {
            flight: null,
            transport: null,
            hotel: {
              hotelId: 'HP-JAI-001',
              roomType: 'Deluxe Room',
              checkInDate: pastIso(6),
              checkOutDate: pastIso(3),
            },
          },
          days: [],
        },
        currentDay: 1,
      } as any);

      expect(() =>
        ctx.tripGuidesService.requestGuide(pastTrip.id, approvedApp!.guideId, {
          userId: 'T001',
          role: Role.TRAVELLER,
        }),
      ).toThrow(BadRequestException);

      // Overlapping guide conflict: assign guide to Trip A, then block Trip B acceptance
      const futureItinerary = {
        day1: {
          flight: null,
          transport: null,
          hotel: {
            hotelId: 'HP-JAI-001',
            roomType: 'Deluxe Room',
            checkInDate: futureIso(20),
            checkOutDate: futureIso(24),
          },
        },
        days: [{ dayNumber: 2, experiences: [] }],
      };
      const tripA = ctx.tripsRepository.create({
        id: 'TRIP-CONFLICT-A',
        travellerId: 'T001',
        planId: availablePlan!.id,
        status: TripStatus.CONFIRMED,
        totalAmount: availablePlan!.pricePerPerson,
        itinerary: futureItinerary,
        currentDay: 1,
      } as any);
      ctx.tripsService.assignGuide(tripA.id, approvedApp!.guideId);

      const tripB = ctx.tripsRepository.create({
        id: 'TRIP-CONFLICT-B',
        travellerId: 'T001',
        planId: availablePlan!.id,
        status: TripStatus.PENDING_GUIDE,
        totalAmount: availablePlan!.pricePerPerson,
        itinerary: futureItinerary,
        currentDay: 1,
      } as any);
      const reqB = ctx.guideRequestsRepository.create({
        tripId: tripB.id,
        travellerId: 'T001',
        guideId: approvedApp!.guideId,
        destination: availablePlan!.destination,
        startDate: futureIso(20),
        endDate: futureIso(24),
        itinerarySummary: ['Test'],
        status: GuideRequestStatus.PENDING,
      } as any);

      expect(() =>
        ctx.guideRequestsService.update(
          reqB.id,
          { status: GuideRequestStatus.ACCEPTED, guideId: approvedApp!.guideId },
          { userId: approvedApp!.guideId, role: Role.GUIDE },
        ),
      ).toThrow(BadRequestException);

      // Confirm request remained PENDING after conflict rejection
      expect(ctx.guideRequestsRepository.findById(reqB.id)!.status).toBe(
        GuideRequestStatus.PENDING,
      );

      await ctx.moduleRef.close();
    });
  });
});
