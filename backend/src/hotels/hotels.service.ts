import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { HotelsRepository } from './hotels.repository';

@Injectable()
export class HotelsService {
  constructor(private readonly hotelsRepository: HotelsRepository) {}

  create(partnerId: string | undefined, dto: CreateHotelDto) {
    if (!partnerId) {
      throw new ForbiddenException('x-user-id header is required for PARTNER');
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
      taxesAndFees: dto.taxesAndFees ?? 0,
      totalRooms: dto.totalRooms ?? 10,
      image: dto.image ?? '',
      amenities: dto.amenities ?? [],
      status: dto.status ?? 'active',
    });
  }

  findAll(location?: string) {
    return this.hotelsRepository.findAll({ location });
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

  update(id: string, dto: UpdateHotelDto) {
    const updated = this.hotelsRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`Hotel ${id} not found`);
    return updated;
  }

  remove(id: string) {
    const deleted = this.hotelsRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Hotel ${id} not found`);
    return { message: `Hotel ${id} deleted` };
  }
}
