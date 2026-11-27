import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SuperadminRepository } from './superadmin.repository';
import { CreateSuperadminDto } from './dto/create-superadmin.dto';
import { UpdateSuperadminDto } from './dto/update-superadmin.dto';

export interface PartnerPayoutRecord {
  payoutId: string;
  recipientId: string;
  recipientName: string;
  partnerType: 'hotel' | 'experience' | 'guide';
  amount: number;
  currency: string;
  method: string;
  status: 'paid' | 'pending' | 'failed';
  initiatedAt: string;
  completedAt: string | null;
  failureReason: string | null;
}

export interface DisputeRecord {
  disputeId: string;
  bookingId: string;
  customerName: string;
  partnerName: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  status: 'under_review' | 'resolved';
  createdAt: string;
  resolvedAt: string | null;
}

@Injectable()
export class SuperadminService {
  private readonly payouts: PartnerPayoutRecord[] = [
    {
      payoutId: 'PAY-9001',
      recipientId: 'HP001',
      recipientName: 'Heritage Stays Pvt Ltd',
      partnerType: 'hotel',
      amount: 148500,
      currency: 'INR',
      method: 'NEFT Direct Transfer',
      status: 'paid',
      initiatedAt: '2026-10-10T10:00:00.000Z',
      completedAt: '2026-10-11T14:30:00.000Z',
      failureReason: null,
    },
    {
      payoutId: 'PAY-9002',
      recipientId: 'XP001',
      recipientName: 'Backwater Experiences Kerala',
      partnerType: 'experience',
      amount: 64200,
      currency: 'INR',
      method: 'IMPS Instant Settlement',
      status: 'pending',
      initiatedAt: '2026-10-18T09:15:00.000Z',
      completedAt: null,
      failureReason: null,
    },
    {
      payoutId: 'PAY-9003',
      recipientId: 'G001',
      recipientName: 'Arjun Menon (Guide)',
      partnerType: 'guide',
      amount: 28900,
      currency: 'INR',
      method: 'UPI / Bank Transfer',
      status: 'failed',
      initiatedAt: '2026-10-16T11:20:00.000Z',
      completedAt: null,
      failureReason: 'Beneficiary bank IFSC validation timeout — retry required.',
    },
  ];

  private readonly disputes: DisputeRecord[] = [
    {
      disputeId: 'DSP-401',
      bookingId: 'BK-2026-104',
      customerName: 'Aarav Sharma',
      partnerName: 'Heritage Stays Pvt Ltd',
      category: 'accommodation_quality',
      severity: 'medium',
      summary: 'Room category differed from confirmed package itinerary.',
      status: 'under_review',
      createdAt: '2026-10-17T08:45:00.000Z',
      resolvedAt: null,
    },
    {
      disputeId: 'DSP-402',
      bookingId: 'EXP-2026-088',
      customerName: 'Meera Nair',
      partnerName: 'Backwater Experiences Kerala',
      category: 'schedule_delay',
      severity: 'low',
      summary: 'Morning boat departure delayed by 90 minutes due to weather.',
      status: 'resolved',
      createdAt: '2026-10-12T07:30:00.000Z',
      resolvedAt: '2026-10-13T16:10:00.000Z',
    },
  ];

  constructor(private readonly repo: SuperadminRepository) {}

  create(dto: CreateSuperadminDto) { return this.repo.create(dto); }
  findAll() { return this.repo.findAll(); }
  findOne(id: string) {
    const a = this.repo.findById(id);
    if (!a) throw new NotFoundException(`Superadmin ${id} not found`);
    return a;
  }
  update(id: string, dto: UpdateSuperadminDto) {
    const updated = this.repo.update(id, dto);
    if (!updated) throw new NotFoundException(`Superadmin ${id} not found`);
    return updated;
  }
  remove(id: string) {
    if (!this.repo.delete(id)) throw new NotFoundException(`Superadmin ${id} not found`);
    return { message: `Superadmin ${id} deleted` };
  }

  getPayouts(status?: string, partnerType?: string): PartnerPayoutRecord[] {
    return this.payouts.filter((p) => {
      if (status && status !== 'all' && p.status !== status) return false;
      if (partnerType && partnerType !== 'all' && p.partnerType !== partnerType) return false;
      return true;
    });
  }

  processPayout(payoutId: string, action: 'pay' | 'retry'): PartnerPayoutRecord {
    if (action !== 'pay' && action !== 'retry') {
      throw new BadRequestException('Action must be "pay" or "retry".');
    }
    const payout = this.payouts.find((p) => p.payoutId === payoutId);
    if (!payout) throw new NotFoundException(`Payout ${payoutId} not found`);

    payout.status = action === 'retry' ? 'pending' : 'paid';
    payout.completedAt = payout.status === 'paid' ? new Date().toISOString() : null;
    payout.failureReason = null;
    return { ...payout };
  }

  getDisputes(status?: string): DisputeRecord[] {
    return this.disputes.filter((d) => {
      if (status && status !== 'all' && d.status !== status) return false;
      return true;
    });
  }

  resolveDispute(disputeId: string, resolutionSummary = ''): DisputeRecord {
    const dispute = this.disputes.find((d) => d.disputeId === disputeId);
    if (!dispute) throw new NotFoundException(`Dispute ${disputeId} not found`);

    dispute.status = 'resolved';
    dispute.resolvedAt = new Date().toISOString();
    dispute.summary = `${dispute.summary} | Resolution: ${resolutionSummary.trim() || 'Resolved by SuperAdmin.'}`;
    return { ...dispute };
  }
}
