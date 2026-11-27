import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { GuideRepository } from './guide.repository';
import { CreateGuideDto } from './dto/create-guide.dto';
import { UpdateGuideDto } from './dto/update-guide.dto';

@Injectable()
export class GuideService {
  constructor(private readonly guideRepository: GuideRepository) {}

  create(userId: string, dto: CreateGuideDto) {
    return this.guideRepository.create({
      userId,
      fname: dto.fname,
      lname: dto.lname,
      email: dto.email,
      phone: dto.phone,
      location: dto.location,
      prof_title: dto.prof_title,
      years_exp: dto.years_exp,
      bio: dto.bio,
      lang_spoken: dto.lang_spoken,
      certifications: dto.certifications ?? [],
      bank_name: dto.bank_name ?? '',
      bank_acc_num_end: dto.bank_acc_num_end ?? 0,
      iban: dto.iban ?? '',
    });
  }

  findAll() {
    return this.guideRepository.findAll();
  }

  findOne(id: string, actor?: { userId?: string; role?: string }) {
    const guide = this.guideRepository.findById(id);
    if (!guide) throw new NotFoundException(`Guide ${id} not found`);

    const isSelf = actor?.userId === id;
    const isAdmin = actor?.role === 'superadmin' || actor?.role === 'nontechadmin';

    // If caller is not self or admin, redact private banking and personal contact information
    if (!isSelf && !isAdmin) {
      const {
        bank_name: _bank_name,
        bank_acc_num_end: _bank_acc,
        iban: _iban,
        phone: _phone,
        email: _email,
        ...publicGuide
      } = guide;
      return publicGuide;
    }

    return guide;
  }

  findByLocation(locationId: string) {
    return this.guideRepository.findByLocation(locationId);
  }

  update(id: string, dto: UpdateGuideDto, actor?: { userId?: string; role?: string; region?: string }) {
    const isAdmin = actor?.role === 'superadmin' || actor?.role === 'nontechadmin';
    if (!isAdmin && actor?.userId !== id) {
      throw new ForbiddenException('You can only update your own guide profile.');
    }
    // An NTA administers only guides based in their own region, and cannot move one elsewhere.
    if (actor?.role === 'nontechadmin') {
      const ntaRegion = (actor.region || '').trim().toLowerCase();
      const guide = this.guideRepository.findById(id);
      if (!guide) throw new NotFoundException(`Guide ${id} not found`);
      const inRegion = (location?: string) => String(location || '').trim().toLowerCase() === ntaRegion;
      if (!ntaRegion || !inRegion(guide.location)) {
        throw new ForbiddenException(
          `Cannot modify guide based in '${guide.location}': outside your assigned region '${actor.region}'`,
        );
      }
      const newLocation = (dto as { location?: string }).location;
      if (newLocation !== undefined && !inRegion(newLocation)) {
        throw new ForbiddenException(`Cannot move a guide outside your assigned region '${actor.region}'`);
      }
    }
    const updated = this.guideRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`Guide ${id} not found`);
    return updated;
  }

  remove(id: string) {
    const deleted = this.guideRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Guide ${id} not found`);
    return { message: `Guide ${id} deleted` };
  }
}
