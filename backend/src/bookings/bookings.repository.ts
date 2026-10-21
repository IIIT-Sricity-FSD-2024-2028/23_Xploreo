import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Booking, BookingStatus } from './entities/booking.entity';
import { loadSeedData } from '../common/utils/seed-loader';

type CreateBookingRecord = Omit<
  Booking,
  'id' | 'status' | 'createdAt' | 'updatedAt' | 'hotel'
>;

@Injectable()
export class BookingsRepository {
  private readonly bookings: Booking[] = seedBookings();

  create(data: CreateBookingRecord & { id?: string }): Booking {
    if (data.id) {
      const existing = this.bookings.find((b) => b.id === data.id);
      if (existing) return { ...existing };
    }

    const now = new Date();
    const booking: Booking = {
      ...data,
      id: data.id || randomUUID(),
      status: BookingStatus.CONFIRMED,
      createdAt: now,
      updatedAt: now,
    };

    this.bookings.push(booking);
    return { ...booking };
  }

  findAll(): Booking[] {
    return this.bookings.map((booking) => ({ ...booking }));
  }

  findById(id: string): Booking | undefined {
    const booking = this.bookings.find((item) => item.id === id);
    return booking ? { ...booking } : undefined;
  }

  findRawById(id: string): Booking | undefined {
    return this.bookings.find((item) => item.id === id);
  }

  findByHotelIds(hotelIds: string[]): Booking[] {
    const hotelIdSet = new Set(hotelIds);
    return this.bookings
      .filter((booking) => hotelIdSet.has(booking.hotelId))
      .map((booking) => ({ ...booking }));
  }

  findByTravellerId(travellerId: string): Booking[] {
    const normalized = String(travellerId).trim().toLowerCase();
    return this.bookings
      .filter((booking) => String(booking.travellerId).trim().toLowerCase() === normalized)
      .map((booking) => ({ ...booking }));
  }

  setStatus(id: string, status: BookingStatus): Booking | undefined {
    const booking = this.bookings.find((item) => item.id === id);
    if (!booking) return undefined;
    booking.status = status;
    booking.updatedAt = new Date();
    return { ...booking };
  }

  updateCancellation(id: string, data: Partial<Booking>): Booking | undefined {
    const booking = this.bookings.find((item) => item.id === id);
    if (!booking) return undefined;
    Object.assign(booking, data, { updatedAt: new Date() });
    return { ...booking };
  }

  setCheckOutDate(id: string, checkOut: string): void {
    const booking = this.bookings.find((item) => item.id === id);
    if (booking) booking.checkOut = checkOut;
  }
}

function seedBookings(): Booking[] {
  const loaded = loadSeedData<any>('hotel_bookings.json', []);
  if (loaded && loaded.length > 0) {
    return loaded.map((b) => ({
      ...b,
      createdAt: new Date(b.createdAt || Date.now()),
      updatedAt: new Date(b.updatedAt || Date.now()),
      status: b.status as BookingStatus,
    }));
  }

  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const base = {
    hotelId: 'hotel-hp001-1',
    travellerId: 'seed-guest',
    phone: '9000000000',
    rooms: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return [
    {
      ...base, id: 'bkg-hp001-1', guestName: 'Rohan Verma', email: 'rohan@example.com',
      checkIn: day(5), checkOut: day(8), guests: 2, roomType: 'Deluxe Room',
      guestNames: ['Rohan Verma', 'Isha Verma'], totalAmount: 15120, status: BookingStatus.CONFIRMED,
    },
    {
      ...base, id: 'bkg-hp001-2', guestName: 'Meera Nair', email: 'meera@example.com',
      checkIn: day(-6), checkOut: day(-3), guests: 2, roomType: 'Royal Suite',
      guestNames: ['Meera Nair', 'Arjun Nair'], totalAmount: 28560, status: BookingStatus.CHECKED_OUT,
    },
    {
      ...base, id: 'bkg-hp001-3', guestName: 'Kabir Singh', email: 'kabir@example.com',
      checkIn: day(12), checkOut: day(14), guests: 1, roomType: 'Deluxe Room',
      guestNames: ['Kabir Singh'], totalAmount: 10080, status: BookingStatus.CANCELLED,
    },
  ];
}
