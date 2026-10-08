import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StructuredItineraryDto } from '../../common/dto/itinerary.dto';

export class CreateTripDto {
  @ApiPropertyOptional({ example: 'trip-kerala-001' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: '20001' })
  @IsString()
  travellerId!: string;

  @ApiProperty({ example: 'plan-1' })
  @IsString()
  planId!: string;

  @ApiPropertyOptional({ type: StructuredItineraryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StructuredItineraryDto)
  itinerary?: StructuredItineraryDto;
}
