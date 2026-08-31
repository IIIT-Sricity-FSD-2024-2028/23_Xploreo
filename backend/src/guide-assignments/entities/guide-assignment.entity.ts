export enum GuideAssignmentStatus {
  PENDING_GUIDE_CONFIRM = 'pending_guide_confirm',
  CONFIRMED = 'confirmed',
  REJECTED_BY_GUIDE = 'rejected_by_guide',
  CANCELLED = 'cancelled',
}

export class GuideAssignment {
  id!: string;
  planId!: string;
  bookingId?: string;
  travellerId!: string;
  guideId!: string;
  guidePricePerPerson!: number;
  paidAmount!: number;
  travelerCount?: number;
  startDate!: string;
  endDate!: string;
  status!: GuideAssignmentStatus;
  createdAt!: Date;
  updatedAt!: Date;
}
