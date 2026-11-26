import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
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

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  travellers?: number;

  @ApiPropertyOptional({ type: StructuredItineraryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StructuredItineraryDto)
  itinerary?: StructuredItineraryDto;
}
