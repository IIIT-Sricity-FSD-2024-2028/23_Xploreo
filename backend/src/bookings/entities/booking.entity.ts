import { Hotel } from '../../hotels/entities/hotel.entity';

export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
}

export class Booking {
  id!: string;
  hotelId!: string;
  travellerId!: string;
  guestName!: string;
  email!: string;
  phone!: string;
  checkIn!: string;
  checkOut!: string;
  guests!: number;
  roomType!: string;
  notes?: string;
  rooms?: number;
  totalAmount!: number;
  guestNames?: string[];
  status!: BookingStatus;
  createdAt!: Date;
  hotel?: Hotel;
}
