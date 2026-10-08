import { Injectable, NotFoundException } from '@nestjs/common';
import { GuideRepository } from './guide.repository';
import { CreateGuideDto } from './dto/create-guide.dto';
import { UpdateGuideDto } from './dto/update-guide.dto';
import { Role } from '../auth/entities/auth.entity';
import {
  assertLocationOwnership,
  assertActorLocationMatch,
  normalizeAllowedLocation,
} from '../common/utils/location-scope';
import { ForbiddenException } from '@nestjs/common';

@Injectable()
export class GuideService {
  constructor(private readonly guideRepository: GuideRepository) {}

  create(userId: string, dto: CreateGuideDto, actorLocation?: string) {
    if (actorLocation) {
      dto.location = assertLocationOwnership(
        actorLocation,
        dto.location,
        'guide',
      );
    }
    return this.guideRepository.create({
      userId,
      fname: dto.fname,
      lname: dto.lname,
      email: dto.email,
      phone: dto.phone,
      location: dto.location,
      prof_title: dto.prof_title ?? 'Tour Guide',
      years_exp: dto.years_exp,
      bio: dto.bio,
      lang_spoken: dto.lang_spoken,
      certifications: dto.certifications ?? [],
      bank_name: dto.bank_name ?? '',
      bank_acc_num_end: dto.bank_acc_num_end ?? 0,
      iban: dto.iban ?? '',
    });
  }

  findAll(role?: string, actorLocation?: string) {
    let guides = this.guideRepository.findAll();
    
    if (role === Role.NONTECHADMIN) {
      if (!actorLocation) {
        throw new ForbiddenException('Actor location is required for NONTECHADMIN');
      }
      const normActorLoc = normalizeAllowedLocation(actorLocation);
      guides = guides.filter((g) => {
        const normGuideLoc = normalizeAllowedLocation(g.location);
        return normGuideLoc === normActorLoc;
      });
    }
    
    return guides;
  }

  findOne(id: string) {
    const guide = this.guideRepository.findById(id);
    if (!guide) throw new NotFoundException(`Guide ${id} not found`);
    return guide;
  }

  findByLocation(locationId: string) {
    return this.guideRepository.findByLocation(locationId);
  }

  update(id: string, dto: UpdateGuideDto, actorLocation?: string) {
    const existing = this.guideRepository.findById(id);
    if (!existing) throw new NotFoundException(`Guide ${id} not found`);

    if (actorLocation) {
      assertActorLocationMatch(actorLocation, existing.location, 'guide');
      if (dto.location) {
        dto.location = assertLocationOwnership(
          actorLocation,
          dto.location,
          'guide',
        );
      }
    }

    const updated = this.guideRepository.update(id, dto);
    return updated;
  }

  remove(id: string) {
    const deleted = this.guideRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Guide ${id} not found`);
    return { message: `Guide ${id} deleted` };
  }
}
