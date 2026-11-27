import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExperiencesRepository } from './experiences.repository';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';

@Injectable()
export class ExperiencesService {
  constructor(private readonly expRepository: ExperiencesRepository) {}

  create(partnerId: string | undefined, dto: CreateExperienceDto) {
    if (!partnerId) {
      throw new ForbiddenException(
        'x-user-id header is required for EXPERIENCE_PARTNER',
      );
    }

    const slots = dto.slots ?? [];
    return this.expRepository.create(partnerId, {
      ...dto,
      availability: dto.availability ?? undefined,
      // Capacity is never set directly — it's the sum of each slot's own capacity. With no slots
      // yet, there's nothing to book, so it starts at 0 until slots are added via update().
      capacity: slots.reduce((sum, s) => sum + s.capacity, 0),
      booked: dto.booked ?? 0,
      image: dto.image ?? '',
      nextSlot: dto.nextSlot ?? '',
      slots,
    });
  }

  findAll() {
    return this.expRepository.findAll();
  }

  findForPartner(partnerId: string | undefined) {
    if (!partnerId) {
      throw new ForbiddenException(
        'x-user-id header is required for EXPERIENCE_PARTNER',
      );
    }

    return this.expRepository.findByPartnerId(partnerId);
  }

  async findOne(id: string) {
    const exp = await this.expRepository.findById(id);
    if (!exp) throw new NotFoundException(`Experience ${id} not found`);
    return exp;
  }

  findByLocation(locationId: string) {
    return this.expRepository.findByLocation(locationId);
  }

  private async ownExperience(id: string, actor?: { userId?: string; role?: string; region?: string }) {
    const isAdmin = actor?.role === 'superadmin' || actor?.role === 'nontechadmin';
    const exp = await this.expRepository.findById(id);
    if (!exp) throw new NotFoundException(`Experience ${id} not found`);
    if (!isAdmin && exp.partnerId !== actor?.userId) {
      throw new ForbiddenException('This experience belongs to another partner.');
    }
    // An NTA administers only their own region's experiences.
    if (actor?.role === 'nontechadmin') {
      const ntaRegion = (actor.region || '').trim().toLowerCase();
      if (!ntaRegion || String(exp.destination || '').trim().toLowerCase() !== ntaRegion) {
        throw new ForbiddenException(
          `Cannot modify experience in '${exp.destination}': outside your assigned region '${actor.region}'`,
        );
      }
    }
    return exp;
  }

  async update(id: string, dto: UpdateExperienceDto, actor?: { userId?: string; role?: string; region?: string }) {
    await this.ownExperience(id, actor);
    // Capacity stays a live derived total of slot capacities — recomputed any time slots change,
    // never accepted directly from the request body.
    const patch = dto.slots
      ? { ...dto, capacity: dto.slots.reduce((sum, s) => sum + s.capacity, 0) }
      : dto;
    const updated = await this.expRepository.update(id, patch);
    if (!updated) throw new NotFoundException(`Experience ${id} not found`);
    return updated;
  }

  async remove(id: string, actor?: { userId?: string; role?: string }) {
    await this.ownExperience(id, actor);
    const deleted = await this.expRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Experience ${id} not found`);
    return { message: `Experience ${id} deleted` };
  }
}
