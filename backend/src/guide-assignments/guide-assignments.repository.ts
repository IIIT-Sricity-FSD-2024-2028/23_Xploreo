import { Injectable } from '@nestjs/common';
import { GuideAssignment, GuideAssignmentStatus } from './entities/guide-assignment.entity';
import { createId } from '../common/utils/id';

@Injectable()
export class GuideAssignmentsRepository {
  private assignments: GuideAssignment[] = [];

  create(data: Omit<GuideAssignment, 'id' | 'createdAt' | 'updatedAt'>): GuideAssignment {
    const now = new Date();
    const assignment: GuideAssignment = {
      id: createId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.assignments.push(assignment);
    return assignment;
  }

  findAll(): GuideAssignment[] {
    return [...this.assignments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  findById(id: string): GuideAssignment | undefined {
    return this.assignments.find((a) => a.id === id);
  }

  findByTraveller(travellerId: string): GuideAssignment[] {
    return this.assignments
      .filter((a) => a.travellerId === travellerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  findByGuide(guideId: string): GuideAssignment[] {
    return this.assignments
      .filter((a) => a.guideId === guideId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  findByPlan(planId: string): GuideAssignment[] {
    return this.assignments
      .filter((a) => a.planId === planId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  findActiveForTravellerPlan(travellerId: string, planId: string): GuideAssignment | undefined {
    return this.assignments.find(
      (a) =>
        a.travellerId === travellerId &&
        a.planId === planId &&
        a.status !== GuideAssignmentStatus.CANCELLED,
    );
  }

  update(id: string, data: Partial<GuideAssignment>): GuideAssignment | undefined {
    const idx = this.assignments.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    this.assignments[idx] = { ...this.assignments[idx], ...data, updatedAt: new Date() };
    return this.assignments[idx];
  }
}
