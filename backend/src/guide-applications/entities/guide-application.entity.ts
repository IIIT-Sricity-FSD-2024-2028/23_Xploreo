export enum GuideApplicationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export class GuideApplication {
  id!: string;
  guideId!: string;
  planId!: string;
  guidePricePerPerson!: number;
  status!: GuideApplicationStatus;
  autoDecisionReason?: string;
  createdAt!: Date;
  updatedAt!: Date;
}
