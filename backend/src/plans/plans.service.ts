import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PlansRepository } from './plans.repository';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly plansRepository: PlansRepository) {}

  create(dto: CreatePlanDto, actor?: { userId?: string; role?: string; region?: string }) {
    if (actor?.role === 'nontechadmin') {
      const ntaRegion = (actor.region || '').trim().toLowerCase();
      if (!ntaRegion || dto.destination.trim().toLowerCase() !== ntaRegion) {
        throw new ForbiddenException(
          `Cannot create package for destination '${dto.destination}': outside your assigned region '${actor.region}'`,
        );
      }
    }

    const originCity = dto.originCity || dto.from;
    const durationNights = dto.durationNights ?? dto.duration;
    const pricePerPerson = dto.pricePerPerson ?? dto.price;

    if (!originCity) {
      throw new BadRequestException('from or originCity is required');
    }
    if (!durationNights) {
      throw new BadRequestException('duration or durationNights is required');
    }
    if (pricePerPerson === undefined || pricePerPerson === null) {
      throw new BadRequestException('price or pricePerPerson is required');
    }

    return this.plansRepository.create({
      id: dto.id,
      title: dto.title,
      description: dto.description,
      originCity,
      destination: dto.destination,
      durationNights,
      pricePerPerson,
      hotelStars: dto.hotelStars ?? 3,
      status: dto.status ?? 'available',
      includesFlight: dto.includesFlight ?? true,
      image: dto.image ?? '',
      tags: dto.tags ?? [],
      itinerary: dto.itinerary,
    });
  }

  findAll(
    query: {
      page?: number;
      limit?: number;
      from?: string;
      to?: string;
      destination?: string;
    },
    actor?: { userId?: string; role?: string; region?: string },
  ) {
    let effectiveDestination = query.destination;
    if (actor?.role === 'nontechadmin') {
      effectiveDestination = actor.region || 'NONE';
    }

    let statuses: string[] | undefined = undefined;
    const isStaff = actor?.role === 'nontechadmin' || actor?.role === 'superadmin';
    if (!isStaff) {
      // Public / Traveller discovery: only 'available' and 'sold_out' packages are visible
      statuses = ['available', 'sold_out'];
    }

    return this.plansRepository.findAll({
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
      from: query.from,
      to: query.to,
      destination: effectiveDestination,
      statuses,
    });
  }

  async findOne(id: string, actor?: { userId?: string; role?: string; region?: string }) {
    const plan = await this.plansRepository.findById(id);
    if (!plan) throw new NotFoundException(`Plan ${id} not found`);

    const isStaff = actor?.role === 'nontechadmin' || actor?.role === 'superadmin';
    if (!isStaff) {
      const pStatus = (plan.status || 'available').toLowerCase();
      if (pStatus === 'draft' || pStatus === 'unavailable') {
        throw new NotFoundException(`Plan ${id} not found`);
      }
    }

    if (actor?.role === 'nontechadmin') {
      const ntaRegion = (actor.region || '').trim().toLowerCase();
      if (ntaRegion && plan.destination.trim().toLowerCase() !== ntaRegion) {
        throw new ForbiddenException(
          `Cannot access package in destination '${plan.destination}': outside your assigned region '${actor.region}'`,
        );
      }
    }

    return plan;
  }

  async update(id: string, dto: UpdatePlanDto, actor?: { userId?: string; role?: string; region?: string }) {
    const existing = await this.plansRepository.findById(id);
    if (!existing) throw new NotFoundException(`Plan ${id} not found`);

    if (actor?.role === 'nontechadmin') {
      const ntaRegion = (actor.region || '').trim().toLowerCase();
      if (ntaRegion && existing.destination.trim().toLowerCase() !== ntaRegion) {
        throw new ForbiddenException(
          `Cannot modify package in destination '${existing.destination}': outside your assigned region '${actor.region}'`,
        );
      }
      if (dto.destination && dto.destination.trim().toLowerCase() !== ntaRegion) {
        throw new ForbiddenException(
          `Cannot change package destination to '${dto.destination}': outside your assigned region '${actor.region}'`,
        );
      }
    }

    const updated = await this.plansRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`Plan ${id} not found`);
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.plansRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Plan ${id} not found`);
    return { message: `Plan ${id} deleted` };
  }
}
