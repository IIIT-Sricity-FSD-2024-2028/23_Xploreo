import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { UpdatePartnerProfileDto } from './dto/update-partner-profile.dto';
import { HotelsRepository } from './hotels.repository';
import { RoomTypesRepository } from './room-types.repository';
import { PartnerProfileRepository } from './partner-profile.repository';

@Injectable()
export class HotelsService {
  constructor(
    private readonly hotelsRepository: HotelsRepository,
    private readonly roomTypesRepository: RoomTypesRepository,
    private readonly partnerProfileRepository: PartnerProfileRepository,
  ) {}

  private requirePartner(partnerId: string | undefined): string {
    if (!partnerId) {
      throw new ForbiddenException('x-user-id header is required for PARTNER');
    }
    return partnerId;
  }

  private ownHotel(id: string, partnerId: string) {
    const hotel = this.hotelsRepository.findRawById(id);
    if (!hotel) throw new NotFoundException(`Hotel ${id} not found`);
    if (hotel.partnerId !== partnerId) {
      throw new ForbiddenException('This item belongs to another partner.');
    }
    return hotel;
  }

  create(partnerId: string | undefined, dto: CreateHotelDto) {
    const owner = this.requirePartner(partnerId);
    const totalRooms = dto.totalRooms ?? 0;
    return this.hotelsRepository.create(owner, {
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
      totalRooms,
      availableRooms: totalRooms,
      image: dto.image ?? '',
      images: dto.images ?? (dto.image ? [dto.image] : []),
      amenities: dto.amenities ?? [],
      status: dto.status ?? 'active',
    });
  }

  findAll(location?: string) {
    return this.hotelsRepository.findAll({ location });
  }

  findForPartner(partnerId: string | undefined) {
    const owner = this.requirePartner(partnerId);
    return this.hotelsRepository.findByPartnerId(owner);
  }

  findOne(id: string) {
    const hotel = this.hotelsRepository.findById(id);
    if (!hotel) throw new NotFoundException(`Hotel ${id} not found`);
    return hotel;
  }

  update(id: string, partnerId: string | undefined, dto: UpdateHotelDto) {
    const owner = this.requirePartner(partnerId);
    this.ownHotel(id, owner);
    const updated = this.hotelsRepository.update(id, dto as any);
    if (!updated) throw new NotFoundException(`Hotel ${id} not found`);
    return updated;
  }

  remove(id: string, partnerId: string | undefined, activeBookingCount: number) {
    const owner = this.requirePartner(partnerId);
    this.ownHotel(id, owner);
    if (activeBookingCount > 0) {
      throw new BadRequestException(
        `Cannot delete: ${activeBookingCount} active booking(s) exist for this hotel.`,
      );
    }
    const deleted = this.hotelsRepository.softDelete(id);
    if (!deleted) throw new NotFoundException(`Hotel ${id} not found`);
    return { message: `Hotel ${id} deleted` };
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────
  listRooms(hotelId: string) {
    const hotel = this.hotelsRepository.findById(hotelId);
    if (!hotel) throw new NotFoundException(`Hotel ${hotelId} not found`);
    return this.roomTypesRepository.findByHotelId(hotelId);
  }

  createRoom(hotelId: string, partnerId: string | undefined, dto: CreateRoomTypeDto) {
    const owner = this.requirePartner(partnerId);
    this.ownHotel(hotelId, owner);
    if (this.roomTypesRepository.existsByType(hotelId, dto.type)) {
      throw new BadRequestException(
        `A room type "${dto.type}" already exists for this hotel.`,
      );
    }
    return this.roomTypesRepository.create(hotelId, {
      id: dto.id,
      type: dto.type,
      description: dto.description ?? '',
      pricePerNight: dto.pricePerNight,
      maxOccupancy: dto.maxOccupancy,
      totalRooms: dto.totalRooms,
      amenities: dto.amenities ?? [],
      images: dto.images ?? [],
      status: dto.status,
    });
  }

  updateRoom(
    hotelId: string,
    roomId: string,
    partnerId: string | undefined,
    dto: UpdateRoomTypeDto,
    occupiedRooms: number,
  ) {
    const owner = this.requirePartner(partnerId);
    this.ownHotel(hotelId, owner);
    const room = this.roomTypesRepository.findRawById(roomId);
    if (!room || room.hotelId !== hotelId) {
      throw new NotFoundException(`Room type ${roomId} not found in hotel ${hotelId}`);
    }
    if (dto.totalRooms !== undefined && dto.totalRooms < occupiedRooms) {
      throw new BadRequestException(
        `Cannot set totalRooms below ${occupiedRooms} (currently occupied).`,
      );
    }
    const updated = this.roomTypesRepository.update(roomId, {
      ...(dto as any),
      ...(dto.totalRooms !== undefined
        ? { availableRooms: Math.max(0, dto.totalRooms - occupiedRooms) }
        : {}),
    });
    if (!updated) throw new NotFoundException(`Room type ${roomId} not found`);
    return updated;
  }

  deleteRoom(
    hotelId: string,
    roomId: string,
    partnerId: string | undefined,
    activeBookingCount: number,
  ) {
    const owner = this.requirePartner(partnerId);
    this.ownHotel(hotelId, owner);
    const room = this.roomTypesRepository.findRawById(roomId);
    if (!room || room.hotelId !== hotelId) {
      throw new NotFoundException(`Room type ${roomId} not found in hotel ${hotelId}`);
    }
    if (activeBookingCount > 0) {
      throw new BadRequestException(
        `Cannot delete room type with ${activeBookingCount} active booking(s).`,
      );
    }
    this.roomTypesRepository.delete(roomId);
    return { message: `Room type ${roomId} deleted` };
  }

  // Called by BookingsService after a booking changes state, so availableRooms always
  // reflects real CONFIRMED/CHECKED_IN bookings rather than a value set once at creation.
  recomputeHotelAvailability(hotelId: string, occupiedRooms: number) {
    const hotel = this.hotelsRepository.findRawById(hotelId);
    if (!hotel) return;
    this.hotelsRepository.setAvailableRooms(hotelId, hotel.totalRooms - occupiedRooms);
  }

  recomputeRoomAvailability(roomId: string, occupiedRooms: number) {
    const room = this.roomTypesRepository.findRawById(roomId);
    if (!room) return;
    this.roomTypesRepository.setAvailableRooms(roomId, room.totalRooms - occupiedRooms);
  }

  findRoomByTypeName(hotelId: string, type: string) {
    const normalized = String(type ?? '').trim().toLowerCase();
    return this.roomTypesRepository
      .findByHotelId(hotelId)
      .find((r) => r.type.trim().toLowerCase() === normalized);
  }

  setRating(hotelId: string, rating: number, reviewCount: number) {
    this.hotelsRepository.setRating(hotelId, rating, reviewCount);
  }

  getRawHotel(id: string) {
    return this.hotelsRepository.findRawById(id);
  }

  // ── Availability calendar ────────────────────────────────────────────────────
  getAvailability(hotelId: string) {
    const hotel = this.hotelsRepository.findById(hotelId);
    if (!hotel) throw new NotFoundException(`Hotel ${hotelId} not found`);
    const rooms = this.roomTypesRepository.findByHotelId(hotelId);
    return { hotelId, totalRooms: hotel.totalRooms, availableRooms: hotel.availableRooms, roomSummary: rooms };
  }

  // ── Partner profile ──────────────────────────────────────────────────────────
  getPartnerProfile(partnerId: string | undefined) {
    const owner = this.requirePartner(partnerId);
    return this.partnerProfileRepository.get(owner, () => this.defaultProfile(owner));
  }

  updatePartnerProfile(partnerId: string | undefined, dto: UpdatePartnerProfileDto) {
    const owner = this.requirePartner(partnerId);
    return this.partnerProfileRepository.save(owner, dto, () => this.defaultProfile(owner));
  }

  private defaultProfile(partnerId: string) {
    const owned = this.hotelsRepository.findByPartnerId(partnerId);
    return {
      hotelName: owned[0]?.name ?? 'My Hotel',
      description: owned[0]?.description ?? '',
      contactNumber: '',
      email: '',
      location: owned[0]?.location ?? owned[0]?.city ?? '',
      gst: '',
      bankAccount: '**** **** **** 4521',
      payoutMethod: 'Bank Transfer',
      checkInTime: '12:00',
      checkOutTime: '11:00',
      cancellationPolicy: 'Free cancellation up to 24 hours before check-in.',
      logo: owned[0]?.image ?? '',
    };
  }
}
