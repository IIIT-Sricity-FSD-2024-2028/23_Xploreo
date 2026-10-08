import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { TripTrackingStatus } from '../entities/trip.entity';

export class UpdateTripTrackingDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  currentDay?: number;

  @ApiPropertyOptional({ example: 'Eiffel Tower' })
  @IsOptional()
  @IsString()
  currentStop?: string;

  @ApiPropertyOptional({ example: 'Paris' })
  @IsOptional()
  @IsString()
  currentLocation?: string;

  @ApiPropertyOptional({
    enum: TripTrackingStatus,
    example: TripTrackingStatus.ONGOING,
  })
  @IsOptional()
  @IsEnum(TripTrackingStatus)
  trackingStatus?: TripTrackingStatus;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage?: number;
}
