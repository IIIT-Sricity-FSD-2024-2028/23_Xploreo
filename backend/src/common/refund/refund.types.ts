export enum RefundStatus {
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface CancellationRefundCalculation {
  isEligible: boolean;
  refundAmount: number;
  policyNote: string;
}

export interface CancellationRefundResult {
  refundEligibility: 'ELIGIBLE' | 'NOT_ELIGIBLE';
  refundAmount: number;
  refundStatus: RefundStatus;
  refundReference?: string;
  refundedAt?: string;
  failureReason?: string;
  isSimulated: boolean;
  policyNote: string;
}
