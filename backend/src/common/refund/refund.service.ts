import { Injectable, BadRequestException } from '@nestjs/common';
import {
  RefundStatus,
  CancellationRefundCalculation,
  CancellationRefundResult,
} from './refund.types';

@Injectable()
export class RefundService {
  /**
   * Evaluates hotel cancellation policy against check-in time.
   * Standard policies: "Free cancellation up to 48 hours before check-in", "24 hours before check-in".
   * If cancelled by hotel partner, guest always receives 100% full refund.
   */
  calculateHotelRefund(
    totalAmount: number,
    checkInDateStr: string,
    policyText: string | undefined,
    isPartnerCancellation: boolean,
  ): CancellationRefundCalculation {
    if (isPartnerCancellation) {
      return {
        isEligible: true,
        refundAmount: totalAmount,
        policyNote: '100% refund granted: Cancellation was initiated by the hotel partner.',
      };
    }

    const requiredHours = this.extractPolicyHours(policyText, 24);
    const checkInDateTime = this.parseTargetDate(checkInDateStr, 14); // Standard check-in at 14:00
    const now = Date.now();
    const hoursRemaining = (checkInDateTime.getTime() - now) / (1000 * 60 * 60);

    if (hoursRemaining >= requiredHours) {
      return {
        isEligible: true,
        refundAmount: totalAmount,
        policyNote: `Eligible for full refund: Cancelled ${Math.max(0, Math.round(hoursRemaining))} hours before check-in (Policy required: ${requiredHours} hours).`,
      };
    }

    return {
      isEligible: false,
      refundAmount: 0,
      policyNote: `Non-refundable: Cancelled ${Math.max(0, Math.round(hoursRemaining))} hours before check-in, which does not meet the ${requiredHours}-hour free cancellation window.`,
    };
  }

  /**
   * Evaluates experience cancellation policy against experience date.
   * Standard policy: Free cancellation up to 24 hours before scheduled experience date.
   * If cancelled by experience host, guest receives 100% refund.
   */
  calculateExperienceRefund(
    totalAmount: number,
    experienceDateStr: string,
    isHostCancellation: boolean,
  ): CancellationRefundCalculation {
    if (isHostCancellation) {
      return {
        isEligible: true,
        refundAmount: totalAmount,
        policyNote: '100% refund granted: Cancellation was initiated by the experience host.',
      };
    }

    const requiredHours = 24;
    const targetDateTime = this.parseTargetDate(experienceDateStr, 9); // Standard experience slot at 09:00
    const now = Date.now();
    const hoursRemaining = (targetDateTime.getTime() - now) / (1000 * 60 * 60);

    if (hoursRemaining >= requiredHours) {
      return {
        isEligible: true,
        refundAmount: totalAmount,
        policyNote: `Eligible for full refund: Cancelled ${Math.max(0, Math.round(hoursRemaining))} hours before activity (Policy required: ${requiredHours} hours).`,
      };
    }

    return {
      isEligible: false,
      refundAmount: 0,
      policyNote: `Non-refundable: Cancelled ${Math.max(0, Math.round(hoursRemaining))} hours before activity, which is within the 24-hour non-refundable window.`,
    };
  }

  /**
   * Evaluates trip package cancellation policy against trip start date.
   * Standard policy: Free cancellation up to 48 hours before trip commencement.
   */
  calculateTripRefund(
    totalAmount: number,
    startDateStr: string | undefined,
    isAdminCancellation: boolean,
  ): CancellationRefundCalculation {
    if (isAdminCancellation) {
      return {
        isEligible: true,
        refundAmount: totalAmount,
        policyNote: '100% refund granted: Cancellation was initiated by platform administration.',
      };
    }

    if (!startDateStr) {
      return {
        isEligible: true,
        refundAmount: totalAmount,
        policyNote: 'Full refund: Trip has no fixed departure date yet.',
      };
    }

    const requiredHours = 48;
    const targetDateTime = this.parseTargetDate(startDateStr, 9);
    const now = Date.now();
    const hoursRemaining = (targetDateTime.getTime() - now) / (1000 * 60 * 60);

    if (hoursRemaining >= requiredHours) {
      return {
        isEligible: true,
        refundAmount: totalAmount,
        policyNote: `Eligible for full refund: Cancelled ${Math.max(0, Math.round(hoursRemaining))} hours before departure (Policy required: ${requiredHours} hours).`,
      };
    }

    return {
      isEligible: false,
      refundAmount: 0,
      policyNote: `Non-refundable: Cancelled ${Math.max(0, Math.round(hoursRemaining))} hours before departure, missing the 48-hour free cancellation cutoff.`,
    };
  }

  /**
   * Honest simulated refund processor.
   * Processes the refund if eligible and returns the persisted status and reference.
   * Clearly identified as a simulation.
   */
  processSimulatedRefund(
    calculation: CancellationRefundCalculation,
    existingRefundStatus?: RefundStatus,
    simulatedOutcome?: string,
  ): CancellationRefundResult {
    // Duplicate refund prevention
    if (existingRefundStatus === RefundStatus.SUCCESS) {
      throw new BadRequestException('A refund has already been successfully processed for this booking.');
    }

    if (!calculation.isEligible || calculation.refundAmount <= 0) {
      return {
        refundEligibility: 'NOT_ELIGIBLE',
        refundAmount: 0,
        refundStatus: RefundStatus.NOT_ELIGIBLE,
        isSimulated: true,
        policyNote: calculation.policyNote,
      };
    }

    const outcome = (simulatedOutcome || 'SUCCESS').toUpperCase();

    if (outcome === 'FAILURE' || outcome === 'FAILED') {
      return {
        refundEligibility: 'ELIGIBLE',
        refundAmount: calculation.refundAmount,
        refundStatus: RefundStatus.FAILED,
        failureReason: 'Simulated payment gateway refund declined (Demo Sandbox simulation).',
        isSimulated: true,
        policyNote: calculation.policyNote,
      };
    }

    if (outcome === 'PENDING') {
      return {
        refundEligibility: 'ELIGIBLE',
        refundAmount: calculation.refundAmount,
        refundStatus: RefundStatus.PENDING,
        isSimulated: true,
        policyNote: calculation.policyNote,
      };
    }

    // Default SUCCESS outcome
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const refundRef = `RF-SIM-${timestamp}-${randomHex}`;

    return {
      refundEligibility: 'ELIGIBLE',
      refundAmount: calculation.refundAmount,
      refundStatus: RefundStatus.SUCCESS,
      refundReference: refundRef,
      refundedAt: new Date().toISOString(),
      isSimulated: true,
      policyNote: calculation.policyNote,
    };
  }

  private extractPolicyHours(policyText: string | undefined, defaultHours: number): number {
    if (!policyText) return defaultHours;
    const match = policyText.match(/(\d+)\s*hours?/i);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const dayMatch = policyText.match(/(\d+)\s*days?/i);
    if (dayMatch && dayMatch[1]) {
      const parsed = parseInt(dayMatch[1], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed * 24;
    }
    return defaultHours;
  }

  private parseTargetDate(dateStr: string, defaultHour: number): Date {
    const trimmed = (dateStr || '').trim();
    if (!trimmed) return new Date();

    // Check if ISO string with time
    if (trimmed.includes('T')) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d;
    }

    // YYYY-MM-DD
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(y, m, day, defaultHour, 0, 0));
      if (!isNaN(d.getTime())) return d;
    }

    const fallback = new Date(trimmed);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  }
}
