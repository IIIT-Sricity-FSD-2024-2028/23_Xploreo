import { Experience } from '../../experiences/entities/experience.entity';
import { RefundStatus } from '../../common/refund/refund.types';

export enum ExperienceBookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  CHECKED_IN = 'CHECKED_IN',
  END_REQUESTED = 'END_REQUESTED',
  COMPLETED = 'COMPLETED',
}

export class ExperienceBooking {
  id!: string;
  experienceId!: string;
  travellerId!: string;
  guestName!: string;
  email!: string;
  phone!: string;
  date!: string;
  participants!: number;
  subtotal?: number;
  taxesAndFees?: number;
  totalAmount!: number;
  // Optional local guide for this session. The traveller requests an NTA-approved guide for the
  // experience's region; the guide confirms or declines. The guide fee is separate from totalAmount.
  guideId?: string;
  guideName?: string;
  guideStatus?: 'requested' | 'confirmed' | 'declined';
  guidePricePerPerson?: number;
  guideFee?: number;
  guideNote?: string;
  declinedGuideIds?: string[];
  status!: ExperienceBookingStatus;
  createdAt!: Date;
  experience?: Experience;

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

