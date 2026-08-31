import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExperienceAvailability } from '../experiences/entities/experience.entity';
import { ExperiencesRepository } from '../experiences/experiences.repository';
import { CreateExperienceBookingDto } from './dto/create-experience-booking.dto';
import { ExperienceBookingsRepository } from './experience-bookings.repository';
import { Role } from '../auth/entities/auth.entity';

@Injectable()
export class ExperienceBookingsService {
  constructor(
    private readonly bookingsRepository: ExperienceBookingsRepository,
    private readonly experiencesRepository: ExperiencesRepository,
  ) {}

  create(travellerId: string | undefined, dto: CreateExperienceBookingDto) {
    if (!travellerId) {
      throw new ForbiddenException(
        'x-user-id header is required for TRAVELLER',
      );
    }

    const experience = this.experiencesRepository.findById(dto.experienceId);
    if (!experience) {
      throw new NotFoundException(`Experience ${dto.experienceId} not found`);
    }
    let updatedSlots = experience.slots;
    if (dto.slotId) {
      const slotIndex = experience.slots.findIndex((s) => s.id === dto.slotId);
      if (slotIndex !== -1) {
        const slot = experience.slots[slotIndex];
        if (slot.booked + dto.participants > slot.capacity) {
          throw new BadRequestException('Slot capacity exceeded');
        }
        if (!slot.available && slot.booked >= slot.capacity) {
          throw new BadRequestException('Slot is not available for booking');
        }
        updatedSlots = [...experience.slots];
        updatedSlots[slotIndex] = {
          ...slot,
          booked: slot.booked + dto.participants,
          available: slot.booked + dto.participants < slot.capacity,
        };
      } else if (experience.availability !== ExperienceAvailability.AVAILABLE) {
        throw new BadRequestException(
          'Experience is not available for booking',
        );
      }
    } else {
      if (experience.availability !== ExperienceAvailability.AVAILABLE) {
        throw new BadRequestException(
          'Experience is not available for booking',
        );
      }
      if (experience.booked + dto.participants > experience.capacity) {
        throw new BadRequestException('Experience capacity exceeded');
      }
    }

    const updated = this.experiencesRepository.update(experience.id, {
      booked: experience.booked + dto.participants,
      availability:
        experience.booked + dto.participants >= experience.capacity
          ? ExperienceAvailability.NOT_AVAILABLE
          : ExperienceAvailability.AVAILABLE,
      slots: updatedSlots,
    });

    const booking = this.bookingsRepository.create({
      experienceId: experience.id,
      travellerId,
      guestName: dto.guestName,
      email: dto.email,
      phone: dto.phone,
      date: dto.date,
      time: dto.time,
      slotId: dto.slotId,
      participants: dto.participants,
      totalAmount: experience.price * dto.participants,
    });

    return {
      ...booking,
      experience: updated ?? experience,
    };
  }

  findAll() {
    return this.bookingsRepository.findAll().map((booking) => ({
      ...booking,
      experience: this.experiencesRepository.findById(booking.experienceId),
    }));
  }

  findForTraveller(travellerId: string | undefined) {
    if (!travellerId) {
      throw new ForbiddenException(
        'x-user-id header is required for TRAVELLER',
      );
    }

    return this.bookingsRepository
      .findByTravellerId(travellerId)
      .map((booking) => ({
        ...booking,
        experience: this.experiencesRepository.findById(booking.experienceId),
      }));
  }

  findForPartner(partnerId: string | undefined) {
    if (!partnerId) {
      throw new ForbiddenException(
        'x-user-id header is required for EXPERIENCE_PARTNER',
      );
    }

    const partnerExperiences =
      this.experiencesRepository.findByPartnerId(partnerId);
    const experienceById = new Map(
      partnerExperiences.map((experience) => [experience.id, experience]),
    );

    return this.bookingsRepository
      .findByExperienceIds(
        partnerExperiences.map((experience) => experience.id),
      )
      .map((booking) => ({
        ...booking,
        experience: experienceById.get(booking.experienceId),
      }));
  }

  updateStatus(
    id: string,
    userId: string | undefined,
    userRole: string | undefined,
    status: import('./entities/experience-booking.entity').ExperienceBookingStatus,
  ) {
    if (!userId || !userRole) {
      throw new ForbiddenException('User ID and Role headers are required');
    }

    const booking = this.bookingsRepository.findAll().find((b) => b.id === id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }

    const experience = this.experiencesRepository.findById(
      booking.experienceId,
    );

    if (status === 'COMPLETED') {
      if (
        (userRole !== Role.TRAVELLER && userRole !== Role.TRAVELLER_ACTOR) ||
        booking.travellerId !== userId
      ) {
        throw new ForbiddenException(
          'Only the traveler can complete the booking',
        );
      }
    } else if (status === 'CANCELLED') {
      const isTraveller =
        (userRole === Role.TRAVELLER || userRole === Role.TRAVELLER_ACTOR) &&
        booking.travellerId === userId;
      const isHost =
        userRole === Role.EXPERIENCE_PARTNER &&
        experience &&
        experience.partnerId === userId;
      if (!isTraveller && !isHost) {
        throw new ForbiddenException('Not authorized to cancel this booking');
      }
    } else {
      if (
        userRole !== Role.EXPERIENCE_PARTNER ||
        !experience ||
        experience.partnerId !== userId
      ) {
        throw new ForbiddenException(
          'Not authorized to update this booking status',
        );
      }
    }

    if (
      status === 'CANCELLED' &&
      booking.status !== 'CANCELLED' &&
      experience
    ) {
      const updatedSlots = experience.slots
        ? experience.slots.map((slot) => {
            if (
              slot.id === booking.slotId ||
              (slot.date === booking.date && slot.time === booking.time)
            ) {
              const newBooked = Math.max(0, slot.booked - booking.participants);
              return {
                ...slot,
                booked: newBooked,
                available: newBooked < slot.capacity,
              };
            }
            return slot;
          })
        : [];

      const newTotalBooked = Math.max(
        0,
        experience.booked - booking.participants,
      );

      this.experiencesRepository.update(experience.id, {
        booked: newTotalBooked,
        availability:
          newTotalBooked >= experience.capacity
            ? ExperienceAvailability.NOT_AVAILABLE
            : ExperienceAvailability.AVAILABLE,
        slots: updatedSlots,
      });
    }

    const updated = this.bookingsRepository.updateStatus(id, status);
    if (!updated) {
      throw new NotFoundException(`Booking ${id} not found`);
    }

    return {
      ...updated,
      experience,
    };
  }
}
