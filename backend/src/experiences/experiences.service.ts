import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExperiencesRepository } from './experiences.repository';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { ExperienceAvailability } from './entities/experience.entity';
import {
  assertActorLocationMatch,
  assertLocationOwnership,
  normalizeAllowedLocation,
} from '../common/utils/location-scope';

@Injectable()
export class ExperiencesService {
  constructor(private readonly expRepository: ExperiencesRepository) {}

  create(
    partnerId: string | undefined,
    partnerLocation: string | undefined,
    dto: CreateExperienceDto,
  ) {
    if (!partnerId) {
      throw new ForbiddenException(
        'x-user-id header is required for EXPERIENCE_PARTNER',
      );
    }

    const assignedDestination = assertLocationOwnership(
      partnerLocation,
      dto.destination,
      'experience',
    );

    return this.expRepository.create(partnerId, {
      ...dto,
      destination: assignedDestination,
      availability: dto.availability ?? undefined,
      booked: dto.booked ?? 0,
      image: dto.image ?? '',
      nextSlot: dto.nextSlot ?? '',
      slots: dto.slots ?? [],
      status: dto.status as 'active' | 'inactive' | 'restricted' ?? 'active',
      isDeleted: dto.isDeleted ?? false,
    });
  }

  findAll() {
    return this.expRepository.findAll();
  }

  findForPartner(
    partnerId: string | undefined,
    partnerLocation: string | undefined,
  ) {
    if (!partnerId) {
      throw new ForbiddenException(
        'x-user-id header is required for EXPERIENCE_PARTNER',
      );
    }

    const partnerExperiences = this.expRepository.findByPartnerId(partnerId);
    if (!partnerLocation) return partnerExperiences;

    const normLocation = normalizeAllowedLocation(partnerLocation);
    return partnerExperiences.filter((exp) => {
      const normDest = normalizeAllowedLocation(exp.destination);
      return !normDest || normDest === normLocation;
    });
  }

  async findOne(id: string, partnerLocation?: string) {
    const exp = await this.expRepository.findById(id);
    if (!exp) throw new NotFoundException(`Experience ${id} not found`);
    if (partnerLocation) {
      assertActorLocationMatch(partnerLocation, exp.destination, 'experience');
    }
    return exp;
  }

  findByLocation(locationId: string) {
    return this.expRepository.findByLocation(locationId);
  }

  async update(
    id: string,
    partnerLocation: string | undefined,
    dto: UpdateExperienceDto,
  ) {
    const current = await this.expRepository.findById(id);
    if (!current) throw new NotFoundException(`Experience ${id} not found`);

    if (partnerLocation) {
      assertActorLocationMatch(partnerLocation, current.destination, 'experience');
      if (dto.destination) {
        dto.destination = assertLocationOwnership(
          partnerLocation,
          dto.destination,
          'experience',
        );
      }
    }

    const newBooked = dto.booked ?? current.booked;
    const newCapacity = dto.capacity ?? current.capacity;

    if (dto.availability === undefined) {
      dto.availability =
        newBooked >= newCapacity
          ? ExperienceAvailability.NOT_AVAILABLE
          : ExperienceAvailability.AVAILABLE;
    }

    const updated = await this.expRepository.update(id, dto);
    return updated;
  }

  async remove(id: string, partnerLocation?: string) {
    const current = await this.expRepository.findById(id);
    if (!current) throw new NotFoundException(`Experience ${id} not found`);

    if (partnerLocation) {
      assertActorLocationMatch(partnerLocation, current.destination, 'experience');
    }

    const deleted = await this.expRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Experience ${id} not found`);
    return { message: `Experience ${id} deleted` };
  }
}
