import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HotelsRepository } from '../hotels/hotels.repository';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsRepository } from './bookings.repository';
import { assertActorLocationMatch } from '../common/utils/location-scope';

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly hotelsRepository: HotelsRepository,
  ) {}

  create(travellerId: string | undefined, dto: CreateBookingDto) {
    if (!travellerId) {
      throw new ForbiddenException(
        'x-user-id header is required for TRAVELLER',
      );
    }

    const hotel = this.hotelsRepository.findById(dto.hotelId);
    if (!hotel || hotel.status !== 'active') {
      throw new NotFoundException(`Hotel ${dto.hotelId} not found`);
    }
    if (hotel.availableRooms <= 0) {
      throw new BadRequestException('No available rooms in this hotel');
    }

    const checkIn = new Date(`${dto.checkIn}T00:00:00.000Z`);
    const checkOut = new Date(`${dto.checkOut}T00:00:00.000Z`);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid check-in or check-out date');
    }
    if (checkOut <= checkIn) {
      throw new BadRequestException('checkOut must be after checkIn');
    }

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / 86_400_000,
    );
    const rooms = dto.rooms || 1;
    const computedAmount =
      nights * (hotel.pricePerNight + hotel.taxesAndFees) * rooms;
    const totalAmount = dto.totalAmount ?? computedAmount;

    const booking = this.bookingsRepository.create({
      id: dto.id,
      hotelId: hotel.id,
      travellerId,
      guestName: dto.guestName,
      email: dto.email,
      phone: dto.phone,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      guests: dto.guests,
      roomType: dto.roomType,
      notes: dto.notes,
      rooms,
      totalAmount,
      guestNames: dto.guestNames,
    });

    this.hotelsRepository.update(hotel.id, {
      availableRooms: hotel.availableRooms - 1,
    });

    return { ...booking, hotel };
  }

  cancelBooking(id: string, userId: string | undefined) {
    const booking = this.bookingsRepository.findAll().find((b) => b.id === id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    if (booking.travellerId !== userId) {
      throw new ForbiddenException('Only the owner can cancel this booking');
    }
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException(`Booking ${id} is already cancelled`);
    }

    const cancelledBooking = this.bookingsRepository.cancel(id);

    // Refund the room
    const hotel = this.hotelsRepository.findById(booking.hotelId);
    if (hotel) {
      this.hotelsRepository.update(hotel.id, {
        availableRooms: hotel.availableRooms + 1,
      });
    }

    return cancelledBooking;
  }

  checkInBooking(id: string, partnerId: string | undefined, partnerLocation: string | undefined) {
    if (!partnerId) {
      throw new ForbiddenException('x-user-id header is required for PARTNER');
    }

    const booking = this.bookingsRepository.findAll().find((b) => b.id === id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }

    const hotel = this.hotelsRepository.findById(booking.hotelId);
    if (!hotel || hotel.partnerId !== partnerId) {
      throw new ForbiddenException(
        'You do not have permission to check in this booking',
      );
    }

    if (partnerLocation) {
      assertActorLocationMatch(partnerLocation, hotel.location, 'hotel');
    }

    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestException(
        `Only CONFIRMED bookings can be checked in (current status: ${booking.status})`,
      );
    }

    return this.bookingsRepository.checkIn(id);
  }

  checkOutBooking(id: string, partnerId: string | undefined, partnerLocation: string | undefined) {
    if (!partnerId) {
      throw new ForbiddenException('x-user-id header is required for PARTNER');
    }

    const booking = this.bookingsRepository.findAll().find((b) => b.id === id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }

    const hotel = this.hotelsRepository.findById(booking.hotelId);
    if (!hotel || hotel.partnerId !== partnerId) {
      throw new ForbiddenException(
        'You do not have permission to check out this booking',
      );
    }

    if (partnerLocation) {
      assertActorLocationMatch(partnerLocation, hotel.location, 'hotel');
    }

    if (booking.status !== 'CHECKED_IN') {
      throw new BadRequestException(
        `Only CHECKED_IN bookings can be checked out (current status: ${booking.status})`,
      );
    }

    const checkedOutBooking = this.bookingsRepository.checkOut(id);

    // Make the room available again
    if (hotel) {
      this.hotelsRepository.update(hotel.id, {
        availableRooms: hotel.availableRooms + (booking.rooms || 1),
      });
    }

    return checkedOutBooking;
  }

  findForPartner(partnerId: string | undefined) {
    if (!partnerId) {
      throw new ForbiddenException('x-user-id header is required for PARTNER');
    }

    const partnerHotels = this.hotelsRepository.findByPartnerId(partnerId);
    const hotelById = new Map(partnerHotels.map((hotel) => [hotel.id, hotel]));

    return this.bookingsRepository
      .findByHotelIds(partnerHotels.map((hotel) => hotel.id))
      .map((booking) => ({
        ...booking,
        hotel: hotelById.get(booking.hotelId),
      }));
  }

  findForTraveller(travellerId: string | undefined) {
    if (!travellerId) {
      throw new ForbiddenException(
        'x-user-id header is required for TRAVELLER',
      );
    }

    const bookings = this.bookingsRepository.findByTravellerId(travellerId);

    return bookings.map((booking) => {
      const hotel = this.hotelsRepository.findById(booking.hotelId);
      return {
        ...booking,
        hotel: hotel,
      };
    });
  }

  findAll() {
    const bookings = this.bookingsRepository.findAll();
    return bookings.map((booking) => {
      const hotel = this.hotelsRepository.findById(booking.hotelId);
      return {
        ...booking,
        hotel: hotel,
      };
    });
  }
}
