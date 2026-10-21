import { Hotel } from '../../hotels/entities/hotel.entity';
import { RefundStatus } from '../../common/refund/refund.types';

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
  rooms!: number;
  guestNames!: string[];
  notes?: string;
  subtotal?: number;
  taxesAndFees?: number;
  totalAmount!: number;
  status!: BookingStatus;
  createdAt!: Date;
  updatedAt!: Date;
  hotel?: Hotel;

  // Cancellation & Refund tracking
  cancelledAt?: string;
  cancellationReason?: string;
  refundEligibility?: 'ELIGIBLE' | 'NOT_ELIGIBLE';
  refundAmount?: number;
  refundStatus?: RefundStatus;
  refundReference?: string;
  refundedAt?: string;
  cancellationPolicyNote?: string;
}

