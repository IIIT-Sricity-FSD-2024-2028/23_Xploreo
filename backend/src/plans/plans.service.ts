import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PlansRepository } from './plans.repository';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Role } from '../auth/entities/auth.entity';
import {
  assertLocationOwnership,
  assertActorLocationMatch,
  normalizeAllowedLocation,
} from '../common/utils/location-scope';

@Injectable()
export class PlansService {
  constructor(private readonly plansRepository: PlansRepository) { }

  create(actorLocation: string | undefined, dto: CreatePlanDto) {
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

    if (actorLocation) {
      dto.destination = assertLocationOwnership(
        actorLocation,
        dto.destination,
        'plan',
      );
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
      includesFlight: dto.includesFlight ?? true,
      image: dto.image ?? '',
      tags: dto.tags ?? [],
      itinerary: dto.itinerary,
      isActive: dto.isActive !== undefined ? dto.isActive : (dto.status ? dto.status === 'available' : true),
      status: dto.status ?? (dto.isActive !== false ? 'available' : 'unavailable'),
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
    role?: string,
    actorLocation?: string,
  ) {
    let effectiveDestination = query.destination;

    if (role === Role.NONTECHADMIN || role === Role.GUIDE) {
      if (!actorLocation) {
        throw new ForbiddenException(`Actor location is required for ${role}`);
      }
      const normActorLoc = normalizeAllowedLocation(actorLocation);
      if (effectiveDestination) {
        const normDest = normalizeAllowedLocation(effectiveDestination);
        if (normDest !== normActorLoc) {
          return [];
        }
      } else {
        effectiveDestination = normActorLoc ?? undefined;
      }
    }

    return this.plansRepository.findAll({
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
      from: query.from,
      to: query.to,
      destination: effectiveDestination,
    });
  }

  async findOne(id: string, role?: string, actorLocation?: string) {
    const plan = await this.plansRepository.findById(id);
    if (!plan) throw new NotFoundException(`Plan ${id} not found`);

    if (role === Role.NONTECHADMIN && actorLocation) {
      assertActorLocationMatch(actorLocation, plan.destination, 'plan');
    }

    return plan;
  }

  async update(id: string, actorLocation: string | undefined, dto: UpdatePlanDto) {
    const existing = await this.plansRepository.findById(id);
    if (!existing) throw new NotFoundException(`Plan ${id} not found`);

    if (actorLocation) {
      assertActorLocationMatch(actorLocation, existing.destination, 'plan');
      if (dto.destination) {
        dto.destination = assertLocationOwnership(
          actorLocation,
          dto.destination,
          'plan',
        );
      }
    }

    const updated = await this.plansRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`Plan ${id} not found`);
    return updated;
  }

  async remove(id: string, actorLocation?: string) {
    const existing = await this.plansRepository.findById(id);
    if (!existing) throw new NotFoundException(`Plan ${id} not found`);

    if (actorLocation) {
      assertActorLocationMatch(actorLocation, existing.destination, 'plan');
    }

    const deleted = await this.plansRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Plan ${id} not found`);
    return { message: `Plan ${id} deleted` };
  }
}
