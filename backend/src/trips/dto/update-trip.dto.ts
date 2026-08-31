import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { StructuredItineraryPatchDto } from '../../common/dto/itinerary.dto';
import { TripStatus } from '../entities/trip.entity';

export class UpdateTripDto {
  @ApiPropertyOptional({ example: '10001' })
  @IsOptional()
  @IsString()
  guideId?: string;

  @ApiPropertyOptional({ enum: TripStatus, example: TripStatus.STARTED })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiPropertyOptional({ type: StructuredItineraryPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StructuredItineraryPatchDto)
  itinerary?: StructuredItineraryPatchDto;

  @ApiPropertyOptional({ example: 44000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;
}
