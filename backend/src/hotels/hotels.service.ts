import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { HotelsRepository } from './hotels.repository';
import {
  assertLocationOwnership,
  assertActorLocationMatch,
  validateAllowedLocation,
} from '../common/utils/location-scope';

@Injectable()
export class HotelsService {
  constructor(private readonly hotelsRepository: HotelsRepository) { }

  create(partnerId: string | undefined, actorLocation: string | undefined, dto: CreateHotelDto) {
    if (!partnerId) {
      throw new ForbiddenException('x-user-id header is required for PARTNER');
    }

    if (actorLocation) {
      dto.location = assertLocationOwnership(
        actorLocation,
        dto.location,
        'hotel',
      );
    }

    return this.hotelsRepository.create(partnerId, {
      id: dto.id,
      name: dto.name,
      city: dto.city,
      location: dto.location,
      description: dto.description,
      stars: dto.stars,
      rating: 0,
      reviewCount: 0,
      pricePerNight: dto.pricePerNight,
      taxesAndFees: Math.round(dto.pricePerNight * 0.05),
      totalRooms: dto.totalRooms ?? 10,
      image: dto.image ?? '',
      images: dto.images ?? [],
      amenities: dto.amenities ?? [],
      status: dto.status as 'active' | 'inactive' | 'restricted' ?? 'active',
      isDeleted: dto.isDeleted ?? false,
    });
  }

  findAll(location?: string) {
    let effectiveLocation = location;
    if (effectiveLocation) {
      effectiveLocation = validateAllowedLocation(effectiveLocation, 'location');
    }
    return this.hotelsRepository.findAll({ location: effectiveLocation });
  }

  findForPartner(partnerId: string | undefined) {
    if (!partnerId) {
      throw new ForbiddenException('x-user-id header is required for PARTNER');
    }

    return this.hotelsRepository.findByPartnerId(partnerId);
  }

  findOne(id: string) {
    const hotel = this.hotelsRepository.findById(id);
    if (!hotel) throw new NotFoundException(`Hotel ${id} not found`);
    return hotel;
  }

  update(id: string, actorLocation: string | undefined, dto: UpdateHotelDto) {
    const hotel = this.hotelsRepository.findById(id);
    if (!hotel) throw new NotFoundException(`Hotel ${id} not found`);

    if (actorLocation) {
      assertActorLocationMatch(actorLocation, hotel.location, 'hotel');
      if (dto.location) {
        dto.location = assertLocationOwnership(
          actorLocation,
          dto.location,
          'hotel',
        );
      }
    }

    if (dto.pricePerNight !== undefined) {
      dto.taxesAndFees = Math.round(dto.pricePerNight * 0.05);
    }

    const updated = this.hotelsRepository.update(id, dto);
    return updated;
  }

  addReviewRating(id: string, newRating: number) {
    const hotel = this.hotelsRepository.findById(id);
    if (!hotel) throw new NotFoundException(`Hotel ${id} not found`);

    const currentTotalScore = hotel.rating * hotel.reviewCount;
    const newCount = hotel.reviewCount + 1;
    const newAverage = (currentTotalScore + newRating) / newCount;

    // Round to 1 decimal place
    const roundedRating = Math.round(newAverage * 10) / 10;

    this.hotelsRepository.updateRating(id, roundedRating, newCount);
  }

  remove(id: string, actorLocation?: string) {
    const hotel = this.hotelsRepository.findById(id);
    if (!hotel) throw new NotFoundException(`Hotel ${id} not found`);

    if (actorLocation) {
      assertActorLocationMatch(actorLocation, hotel.location, 'hotel');
    }

    const deleted = this.hotelsRepository.delete(id);
    return { message: `Hotel ${id} deleted` };
  }
}
