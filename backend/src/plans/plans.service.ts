import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ValidationError, validateSync } from 'class-validator';
import { StructuredItineraryDto } from '../common/dto/itinerary.dto';
import { StructuredItinerary } from '../common/entities/itinerary.entity';
import { HotelsRepository } from '../hotels/hotels.repository';
import { RoomTypesRepository } from '../hotels/room-types.repository';
import { ExperiencesRepository } from '../experiences/experiences.repository';
import { PlansRepository } from './plans.repository';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { findItineraryProblems, InventoryLookups } from './package-inventory';

function flattenValidationErrors(errors: ValidationError[], path = 'itinerary'): string[] {
  return errors.flatMap((error) => {
    const here = `${path}.${error.property}`;
    const own = Object.values(error.constraints ?? {}).map((message) => `${here}: ${message}`);
    return [...own, ...flattenValidationErrors(error.children ?? [], here)];
  });
}

@Injectable()
export class PlansService {
  constructor(
    private readonly plansRepository: PlansRepository,
    @Optional() private readonly hotelsRepository?: HotelsRepository,
    @Optional() private readonly roomTypesRepository?: RoomTypesRepository,
    @Optional() private readonly experiencesRepository?: ExperiencesRepository,
  ) {}

  private inventoryLookups(): InventoryLookups | null {
    if (!this.hotelsRepository || !this.roomTypesRepository || !this.experiencesRepository) return null;
    return {
      findHotel: (id) => this.hotelsRepository!.findById(id),
      roomTypesFor: (hotelId) => this.roomTypesRepository!.findByHotelId(hotelId),
      findExperience: (id) => this.experiencesRepository!.findById(id),
    };
  }

  /**
   * A package itinerary must be the same structured itinerary a trip is booked with (the trip DTO
   * rejects anything else), and its hotel, room type and experiences must exist, be active and
   * belong to the package destination, on valid future dates.
   */
  private assertBookableItinerary(itinerary: unknown, destination: string): StructuredItinerary {
    if (!itinerary || typeof itinerary !== 'object' || Array.isArray(itinerary)) {
      throw new BadRequestException(
        'Itinerary must be a structured itinerary with a partner hotel (day1.hotel) and experience days.',
      );
    }
    const errors = validateSync(plainToInstance(StructuredItineraryDto, itinerary), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    // One message (not an array): the frontend shows only the first entry of a message array.
    if (errors.length > 0) {
      throw new BadRequestException(`Invalid itinerary — ${flattenValidationErrors(errors).join('; ')}`);
    }
    const lookups = this.inventoryLookups();
    if (lookups) {
      const problems = findItineraryProblems(itinerary as StructuredItinerary, destination, lookups, {
        requireKnownRoomType: true,
        requireFutureDates: true,
      });
      if (problems.length > 0) throw new BadRequestException(problems.join(' '));
    }
    return itinerary as StructuredItinerary;
  }

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
    // The DTO requires an itinerary over HTTP; a direct service call without one keeps the legacy
    // placeholder itinerary, which booking then rejects until a real hotel is attached.
    const itinerary =
      dto.itinerary === undefined
        ? undefined
        : this.assertBookableItinerary(dto.itinerary, dto.destination);

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
      itinerary,
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

    // A new itinerary, or a new destination for the existing one, must still be bookable there.
    const destination = dto.destination ?? existing.destination;
    if (dto.itinerary !== undefined) {
      this.assertBookableItinerary(dto.itinerary, destination);
    } else if (dto.destination && dto.destination.trim().toLowerCase() !== existing.destination.trim().toLowerCase()) {
      this.assertBookableItinerary(existing.itinerary, destination);
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
