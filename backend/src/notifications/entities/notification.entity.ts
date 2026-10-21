export enum NotificationType {
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  REFUND_FAILED = 'REFUND_FAILED',
  INFO = 'INFO',
}

export class Notification {
  id!: string;
  userId!: string;
  title!: string;
  message!: string;
  type!: NotificationType;
  bookingId?: string;
  bookingType?: 'hotel' | 'experience' | 'trip';
  refundStatus?: string;
  refundAmount?: number;
  read!: boolean;
  createdAt!: Date;
}
