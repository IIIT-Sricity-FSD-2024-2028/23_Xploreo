import { Experience } from '../../experiences/entities/experience.entity';

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
  time?: string;
  slotId?: string;
  participants!: number;
  totalAmount!: number;
  status!: ExperienceBookingStatus;
  createdAt!: Date;
  experience?: Experience;
}
