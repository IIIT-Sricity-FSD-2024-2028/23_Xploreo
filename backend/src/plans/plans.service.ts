import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlansRepository } from './plans.repository';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly plansRepository: PlansRepository) {}

  create(dto: CreatePlanDto) {
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
      includesFlight: dto.includesFlight ?? true,
      image: dto.image ?? '',
      tags: dto.tags ?? [],
      itinerary: dto.itinerary,
    });
  }

  findAll(query: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    destination?: string;
  }) {
    return this.plansRepository.findAll({
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
      from: query.from,
      to: query.to,
      destination: query.destination,
    });
  }

  async findOne(id: string) {
    const plan = await this.plansRepository.findById(id);
    if (!plan) throw new NotFoundException(`Plan ${id} not found`);
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
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
