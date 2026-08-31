import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GuideAssignmentsRepository } from './guide-assignments.repository';
import { GuideApplicationsRepository } from '../guide-applications/guide-applications.repository';
import { GuideRepository } from '../guide/guide.repository';
import { CreateGuideAssignmentDto } from './dto/create-guide-assignment.dto';
import { GuideAssignmentStatus } from './entities/guide-assignment.entity';
import { GuideApplicationStatus } from '../guide-applications/entities/guide-application.entity';

@Injectable()
export class GuideAssignmentsService {
  constructor(
    private readonly repository: GuideAssignmentsRepository,
    private readonly guideAppRepository: GuideApplicationsRepository,
    private readonly guideRepository: GuideRepository,
  ) {}

  create(travellerId: string, dto: CreateGuideAssignmentDto) {
    if (!travellerId) {
      throw new ForbiddenException('x-user-id header is required');
    }

    // Validate guide is accepted for this plan
    const accepted = this.guideAppRepository
      .findAcceptedByPlan(dto.planId)
      .find((a) => a.guideId === dto.guideId);

    if (!accepted) {
      throw new BadRequestException(
        'This guide is not approved for the selected plan',
      );
    }

    // Allow multiple bookings for the same plan (e.g. different dates or new trip instances)

    // Check for date clashes for the guide
    const guideAssignments = this.repository.findByGuide(dto.guideId).filter(a => a.status !== GuideAssignmentStatus.CANCELLED && a.status !== GuideAssignmentStatus.REJECTED_BY_GUIDE);
    const newStart = new Date(dto.startDate);
    const newEnd = new Date(dto.endDate);

    for (const assignment of guideAssignments) {
        if (!assignment.startDate || !assignment.endDate) continue;
        const existingStart = new Date(assignment.startDate);
        const existingEnd = new Date(assignment.endDate);
        
        // Overlap condition: (Start A <= End B) and (Start B <= End A)
        if (newStart <= existingEnd && existingStart <= newEnd) {
            throw new BadRequestException('The selected guide is already booked for these dates.');
        }
    }

    const assignment = this.repository.create({
      planId: dto.planId,
      bookingId: dto.bookingId,
      travellerId,
      guideId: dto.guideId,
      guidePricePerPerson: dto.guidePricePerPerson,
      paidAmount: dto.paidAmount,
      travelerCount: dto.travelerCount,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: GuideAssignmentStatus.PENDING_GUIDE_CONFIRM,
    });

    return this.enrich(assignment);
  }

  confirmByGuide(id: string, guideId: string) {
    const assignment = this.repository.findById(id);
    if (!assignment) throw new NotFoundException(`Assignment ${id} not found`);
    if (assignment.guideId !== guideId) {
      throw new ForbiddenException('You are not assigned to this booking');
    }
    if (assignment.status !== GuideAssignmentStatus.PENDING_GUIDE_CONFIRM) {
      throw new BadRequestException(
        `Only pending assignments can be confirmed (current: ${assignment.status})`,
      );
    }
    return this.enrich(
      this.repository.update(id, { status: GuideAssignmentStatus.CONFIRMED })!,
    );
  }

  rejectByGuide(id: string, guideId: string) {
    const assignment = this.repository.findById(id);
    if (!assignment) throw new NotFoundException(`Assignment ${id} not found`);
    if (assignment.guideId !== guideId) {
      throw new ForbiddenException('You are not assigned to this booking');
    }
    if (
      assignment.status !== GuideAssignmentStatus.PENDING_GUIDE_CONFIRM &&
      assignment.status !== GuideAssignmentStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        `Cannot reject at this stage (current: ${assignment.status})`,
      );
    }
    const updated = this.repository.update(id, {
      status: GuideAssignmentStatus.REJECTED_BY_GUIDE,
    })!;
    return {
      ...this.enrich(updated),
      refundAmount: updated.paidAmount,
      message: 'Guide has rejected this assignment. Traveller can rebook or cancel.',
    };
  }

  changeGuide(id: string, travellerId: string, newGuideId: string, newGuidePricePerPerson: number, planId: string) {
    const assignment = this.repository.findById(id);
    if (!assignment) throw new NotFoundException(`Assignment ${id} not found`);
    if (assignment.travellerId !== travellerId) {
      throw new ForbiddenException('You do not own this assignment');
    }
    if (assignment.status !== GuideAssignmentStatus.REJECTED_BY_GUIDE) {
      throw new BadRequestException(
        'You can only change guide after the previous guide rejected',
      );
    }

    // Validate new guide is accepted for the plan
    const accepted = this.guideAppRepository
      .findAcceptedByPlan(assignment.planId)
      .find((a) => a.guideId === newGuideId);
    if (!accepted) {
      throw new BadRequestException('New guide is not approved for this plan');
    }

    const previousPaid = assignment.paidAmount;
    const priceDelta = newGuidePricePerPerson - previousPaid;

    const updated = this.repository.update(id, {
      guideId: newGuideId,
      guidePricePerPerson: newGuidePricePerPerson,
      paidAmount: newGuidePricePerPerson,
      status: GuideAssignmentStatus.PENDING_GUIDE_CONFIRM,
    })!;

    return {
      ...this.enrich(updated),
      priceDelta,
      priceDeltaMessage:
        priceDelta > 0
          ? `Extra payment of ₹${priceDelta} required`
          : priceDelta < 0
          ? `Refund of ₹${Math.abs(priceDelta)} will be processed`
          : 'No price change',
    };
  }

  cancelGuide(id: string, travellerId: string) {
    const assignment = this.repository.findById(id);
    if (!assignment) throw new NotFoundException(`Assignment ${id} not found`);
    if (assignment.travellerId !== travellerId) {
      throw new ForbiddenException('You do not own this assignment');
    }
    if (assignment.status === GuideAssignmentStatus.CANCELLED) {
      throw new BadRequestException('Assignment is already cancelled');
    }

    const updated = this.repository.update(id, {
      status: GuideAssignmentStatus.CANCELLED,
    })!;

    return {
      ...this.enrich(updated),
      refundAmount: assignment.paidAmount,
      message: `Full refund of ₹${assignment.paidAmount} will be processed for the guide fee`,
    };
  }

  findByGuide(guideId: string) {
    return this.repository.findByGuide(guideId).map((a) => this.enrich(a));
  }

  findByTraveller(travellerId: string) {
    return this.repository.findByTraveller(travellerId).map((a) => this.enrich(a));
  }

  findByPlan(planId: string) {
    return this.repository.findByPlan(planId).map((a) => this.enrich(a));
  }

  findOne(id: string) {
    const assignment = this.repository.findById(id);
    if (!assignment) throw new NotFoundException(`Assignment ${id} not found`);
    return this.enrich(assignment);
  }

  findAll() {
    return this.repository.findAll().map((a) => this.enrich(a));
  }

  private enrich(assignment: any) {
    const guide = this.guideRepository.findById(assignment.guideId);
    return {
      ...assignment,
      guideName: guide ? `${guide.fname} ${guide.lname}` : 'Unknown',
      guideTitle: guide?.prof_title ?? '',
      guideRating: (guide as any)?.rating ?? 0,
    };
  }
}
