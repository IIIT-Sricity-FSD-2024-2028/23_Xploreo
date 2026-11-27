import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ExperienceBooking,
  ExperienceBookingStatus,
} from './entities/experience-booking.entity';
import { loadSeedData } from '../common/utils/seed-loader';

type CreateExperienceBookingRecord = Omit<
  ExperienceBooking,
  'id' | 'status' | 'createdAt' | 'experience'
>;

@Injectable()
export class ExperienceBookingsRepository {
  private readonly bookings: ExperienceBooking[] = loadSeedData<any>('experience_bookings.json', [
    {
      id: 'exp-booking-1',
      experienceId: 'exp-1',
      travellerId: 'T001',
      guestName: 'Anjali Sharma',
      email: 'anjali@xploreo.com',
      phone: '9123456780',
      date: '2026-10-16',
      participants: 5,
      totalAmount: 9000,
      status: ExperienceBookingStatus.CHECKED_IN,
      createdAt: new Date('2026-10-10'),
    },
    {
      id: 'exp-booking-2',
      experienceId: 'exp-1',
      travellerId: '20002',
      guestName: 'Rohit Malhotra',
      email: 'rohit.m@example.com',
      phone: '9812345671',
      date: '2026-10-16',
      participants: 4,
      totalAmount: 7200,
      status: ExperienceBookingStatus.CONFIRMED,
      createdAt: new Date('2026-10-12'),
    },
    {
      id: 'exp-booking-3',
      experienceId: 'exp-1',
      travellerId: '20004',
      guestName: 'Priya Nair',
      email: 'priya.nair@example.com',
      phone: '9812345672',
      date: '2026-09-28',
      participants: 12,
      totalAmount: 21600,
      status: ExperienceBookingStatus.COMPLETED,
      createdAt: new Date('2026-09-20'),
    },
    {
      id: 'exp-booking-4',
      experienceId: 'exp-2',
      travellerId: 'T001',
      guestName: 'Anjali Sharma',
      email: 'anjali@xploreo.com',
      phone: '9123456780',
      date: '2026-10-16',
      participants: 10,
      totalAmount: 12000,
      status: ExperienceBookingStatus.CONFIRMED,
      createdAt: new Date('2026-10-05'),
    },
    {
      id: 'exp-booking-5',
      experienceId: 'exp-2',
      travellerId: '20002',
      guestName: 'Rohit Malhotra',
      email: 'rohit.m@example.com',
      phone: '9812345671',
      date: '2026-09-10',
      participants: 3,
      totalAmount: 3600,
      status: ExperienceBookingStatus.CANCELLED,
      createdAt: new Date('2026-09-02'),
    },
    {
      id: 'exp-booking-6',
      experienceId: 'exp-3',
      travellerId: '20004',
      guestName: 'Priya Nair',
      email: 'priya.nair@example.com',
      phone: '9812345672',
      date: '2026-09-05',
      participants: 8,
      totalAmount: 7600,
      status: ExperienceBookingStatus.COMPLETED,
      createdAt: new Date('2026-08-28'),
    },
    {
      id: 'exp-booking-7',
      experienceId: 'exp-3',
      travellerId: 'T001',
      guestName: 'Anjali Sharma',
      email: 'anjali@xploreo.com',
      phone: '9123456780',
      date: '2026-10-24',
      participants: 2,
      totalAmount: 1900,
      status: ExperienceBookingStatus.CONFIRMED,
      createdAt: new Date('2026-10-14'),
    },
  ]).map((b) => ({
    ...b,
    createdAt: new Date(b.createdAt || Date.now()),
    status: b.status as ExperienceBookingStatus,
  }));

  create(data: CreateExperienceBookingRecord & { id?: string }): ExperienceBooking {
    if (data.id) {
      const existing = this.bookings.find((b) => b.id === data.id);
      if (existing) return { ...existing };
    }

    const booking: ExperienceBooking = {
      ...data,
      id: data.id || randomUUID(),
      status: ExperienceBookingStatus.CONFIRMED,
      createdAt: new Date(),
    };

    this.bookings.push(booking);
    return { ...booking };
  }

  findAll(): ExperienceBooking[] {
    return this.bookings.map((booking) => ({ ...booking }));
  }

  findByTravellerId(travellerId: string): ExperienceBooking[] {
    const normalized = String(travellerId).trim().toLowerCase();
    const isAnjali =
      normalized === 't001' ||
      normalized === '20001' ||
      normalized === 'trav-usr-20001';

    return this.bookings
      .filter((booking) => {
        const bTrav = String(booking.travellerId).trim().toLowerCase();
        if (bTrav === normalized) return true;
        if (
          isAnjali &&
          (bTrav === '20001' || bTrav === 't001' || bTrav === 'trav-usr-20001')
        ) {
          return true;
        }
        return false;
      })
      .map((booking) => ({ ...booking }));
  }

  findByExperienceIds(experienceIds: string[]): ExperienceBooking[] {
    const ids = new Set(experienceIds);
    return this.bookings
      .filter((booking) => ids.has(booking.experienceId))
      .map((booking) => ({ ...booking }));
  }

  findByTripId(tripId: string): ExperienceBooking[] {
    return this.bookings
      .filter((booking) => booking.tripId === tripId)
      .map((booking) => ({ ...booking }));
  }

  findById(id: string): ExperienceBooking | undefined {
    const booking = this.bookings.find((b) => b.id === id);
    return booking ? { ...booking } : undefined;
  }

  patch(id: string, data: Partial<ExperienceBooking>): ExperienceBooking | undefined {
    const index = this.bookings.findIndex((b) => b.id === id);
    if (index === -1) return undefined;
    this.bookings[index] = { ...this.bookings[index], ...data };
    return { ...this.bookings[index] };
  }

  clearGuide(id: string): ExperienceBooking | undefined {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) return undefined;
    delete booking.guideId;
    delete booking.guideName;
    delete booking.guideStatus;
    delete booking.guidePricePerPerson;
    delete booking.guideFee;
    return { ...booking };
  }

  setStatus(id: string, status: ExperienceBookingStatus): ExperienceBooking | undefined {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) return undefined;
    booking.status = status;
    return { ...booking };
  }
}
