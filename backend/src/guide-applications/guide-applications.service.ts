import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GuideApplicationsRepository } from './guide-applications.repository';
import { GuideRepository } from '../guide/guide.repository';
import { PlansRepository } from '../plans/plans.repository';
import { CreateGuideApplicationDto } from './dto/create-guide-application.dto';
import { UpdateGuideApplicationDto } from './dto/update-guide-application.dto';
import { GuideApplicationStatus } from './entities/guide-application.entity';

@Injectable()
export class GuideApplicationsService {
  constructor(
    private readonly repository: GuideApplicationsRepository,
    private readonly guideRepository: GuideRepository,
    private readonly plansRepository: PlansRepository,
  ) {}

  async create(guideId: string, dto: CreateGuideApplicationDto) {
    const guide = this.guideRepository.findById(guideId);
    if (!guide) throw new NotFoundException(`Guide ${guideId} not found`);

    const plan = await this.plansRepository.findById(dto.planId);
    if (!plan) throw new NotFoundException(`Plan ${dto.planId} not found`);

    // Prevent duplicate pending application
    const duplicate = this.repository.findOpenDuplicate(guideId, dto.planId);
    if (duplicate) {
      throw new BadRequestException(
        'You already have a pending application for this plan',
      );
    }

    // Check if already accepted
    const existing = this.repository
      .findByGuide(guideId)
      .find(
        (a) =>
          a.planId === dto.planId &&
          a.status === GuideApplicationStatus.ACCEPTED,
      );
    if (existing) {
      throw new BadRequestException(
        'You are already accepted for this plan',
      );
    }

    const application = this.repository.create({
      guideId,
      planId: dto.planId,
      guidePricePerPerson: dto.guidePricePerPerson,
      status: GuideApplicationStatus.PENDING,
    });

    // Run auto-decision immediately
    return this.autoDecide(application.id, guide.location, plan.destination);
  }

  private autoDecide(
    applicationId: string,
    guideLocation: string,
    planDestination: string,
  ) {
    // Normalize: extract keywords from location strings
    // e.g. 'loc-mumbai-1' → 'mumbai', 'Mumbai' → 'mumbai'
    const guideKeyword = guideLocation.toLowerCase().replace(/loc-|-\d+/g, '').trim();
    const planKeyword = planDestination.toLowerCase().trim();

    const isMatch =
      planKeyword.includes(guideKeyword) ||
      guideKeyword.includes(planKeyword) ||
      guideLocation.toLowerCase().includes(planKeyword);

    const status = isMatch
      ? GuideApplicationStatus.ACCEPTED
      : GuideApplicationStatus.REJECTED;

    const autoDecisionReason = isMatch
      ? `Auto-accepted: Guide location '${guideLocation}' matches plan destination '${planDestination}'`
      : `Auto-rejected: Guide location '${guideLocation}' does not match plan destination '${planDestination}'`;

    return this.repository.update(applicationId, { status, autoDecisionReason });
  }

  findAll(filters?: {
    status?: GuideApplicationStatus;
    planId?: string;
    guideId?: string;
  }) {
    const applications = this.repository.findAll(filters);
    return applications.map((app) => this.enrichWithDetails(app));
  }

  findByGuide(guideId: string) {
    return this.repository.findByGuide(guideId).map((app) => this.enrichWithDetails(app));
  }

  findByPlan(planId: string) {
    return this.repository.findByPlan(planId).map((app) => this.enrichWithDetails(app));
  }

  async findAvailableGuidesForPlan(planId: string) {
    const accepted = this.repository.findAcceptedByPlan(planId);
    return accepted.map((app) => {
      const guide = this.guideRepository.findById(app.guideId);
      return {
        applicationId: app.id,
        guideId: app.guideId,
        guidePricePerPerson: app.guidePricePerPerson,
        fname: guide?.fname ?? 'Unknown',
        lname: guide?.lname ?? '',
        prof_title: guide?.prof_title ?? '',
        bio: guide?.bio ?? '',
        lang_spoken: guide?.lang_spoken ?? [],
        certifications: guide?.certifications ?? [],
        years_exp: guide?.years_exp ?? 0,
        rating: (guide as any)?.rating ?? 0,
        totalRatings: (guide as any)?.totalRatings ?? 0,
        avatar: (guide as any)?.avatar ?? null,
      };
    });
  }

  findOne(id: string) {
    const app = this.repository.findById(id);
    if (!app) throw new NotFoundException(`Guide application ${id} not found`);
    return this.enrichWithDetails(app);
  }

  update(id: string, dto: UpdateGuideApplicationDto) {
    const app = this.repository.findById(id);
    if (!app) throw new NotFoundException(`Guide application ${id} not found`);

    const updated = this.repository.update(id, {
      ...(dto.status && { status: dto.status }),
      ...(dto.guidePricePerPerson !== undefined && {
        guidePricePerPerson: dto.guidePricePerPerson,
      }),
    });
    return this.enrichWithDetails(updated!);
  }

  remove(id: string) {
    const deleted = this.repository.delete(id);
    if (!deleted) throw new NotFoundException(`Guide application ${id} not found`);
    return { message: `Guide application ${id} deleted` };
  }

  private enrichWithDetails(app: any) {
    const guide = this.guideRepository.findById(app.guideId);
    return {
      ...app,
      guideName: guide ? `${guide.fname} ${guide.lname}` : 'Unknown',
      guideLocation: guide?.location ?? '',
      guideTitle: guide?.prof_title ?? '',
    };
  }
}
