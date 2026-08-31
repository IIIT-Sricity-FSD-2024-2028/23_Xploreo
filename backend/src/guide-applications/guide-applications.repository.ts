import { Injectable } from '@nestjs/common';
import { GuideApplication, GuideApplicationStatus } from './entities/guide-application.entity';
import { createId } from '../common/utils/id';

@Injectable()
export class GuideApplicationsRepository {
  private applications: GuideApplication[] = [];

  create(data: Omit<GuideApplication, 'id' | 'createdAt' | 'updatedAt'>): GuideApplication {
    const now = new Date();
    const app: GuideApplication = {
      id: createId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.applications.push(app);
    return app;
  }

  findAll(filters?: {
    status?: GuideApplicationStatus;
    planId?: string;
    guideId?: string;
  }): GuideApplication[] {
    let result = [...this.applications];
    if (filters?.status) result = result.filter((a) => a.status === filters.status);
    if (filters?.planId) result = result.filter((a) => a.planId === filters.planId);
    if (filters?.guideId) result = result.filter((a) => a.guideId === filters.guideId);
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  findById(id: string): GuideApplication | undefined {
    return this.applications.find((a) => a.id === id);
  }

  findByGuide(guideId: string): GuideApplication[] {
    return this.applications
      .filter((a) => a.guideId === guideId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  findByPlan(planId: string): GuideApplication[] {
    return this.applications
      .filter((a) => a.planId === planId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  findAcceptedByPlan(planId: string): GuideApplication[] {
    return this.applications.filter(
      (a) => a.planId === planId && a.status === GuideApplicationStatus.ACCEPTED,
    );
  }

  findOpenDuplicate(guideId: string, planId: string): GuideApplication | undefined {
    return this.applications.find(
      (a) =>
        a.guideId === guideId &&
        a.planId === planId &&
        a.status === GuideApplicationStatus.PENDING,
    );
  }

  update(id: string, data: Partial<GuideApplication>): GuideApplication | undefined {
    const idx = this.applications.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    this.applications[idx] = { ...this.applications[idx], ...data, updatedAt: new Date() };
    return this.applications[idx];
  }

  delete(id: string): boolean {
    const idx = this.applications.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    this.applications.splice(idx, 1);
    return true;
  }
}
