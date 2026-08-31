import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ExperienceBookingStatus } from '../entities/experience-booking.entity';

export class UpdateExperienceBookingStatusDto {
  @ApiProperty({ enum: ExperienceBookingStatus })
  @IsEnum(ExperienceBookingStatus)
  status!: ExperienceBookingStatus;
}
