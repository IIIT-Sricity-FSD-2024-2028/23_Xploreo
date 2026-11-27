import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
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
}
