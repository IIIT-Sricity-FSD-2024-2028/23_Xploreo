import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ItineraryItemStatus } from '../entities/itinerary.entity';

export class ItineraryFlightDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  airline!: string;

  @ApiProperty()
  @IsString()
  flightNumber!: string;

  @ApiProperty()
  @IsString()
  fromAirport!: string;

  @ApiProperty()
  @IsString()
  toAirport!: string;

  @ApiProperty()
  @IsString()
  departureAt!: string;

  @ApiProperty()
  @IsString()
  arrivalAt!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ItineraryItemStatus })
  @IsEnum(ItineraryItemStatus)
  status!: ItineraryItemStatus;
}

export class ItineraryTransportDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  provider!: string;

  @ApiProperty()
  @IsString()
  vehicleType!: string;

  @ApiProperty()
  @IsString()
  pickupLocation!: string;

  @ApiProperty()
  @IsString()
  dropoffLocation!: string;

  @ApiProperty()
  @IsString()
  pickupAt!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ItineraryItemStatus })
  @IsEnum(ItineraryItemStatus)
  status!: ItineraryItemStatus;
}

export class ItineraryHotelDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  hotelId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  checkInDate!: string;

  @ApiProperty()
  @IsString()
  checkOutDate!: string;

  @ApiProperty()
  @IsString()
  roomType!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ItineraryItemStatus })
  @IsEnum(ItineraryItemStatus)
  status!: ItineraryItemStatus;
}

export class ItineraryExperienceDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  experienceId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  location!: string;

  @ApiProperty()
  @IsString()
  startsAt!: string;

  @ApiProperty()
  @IsString()
  endsAt!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ItineraryItemStatus })
  @IsEnum(ItineraryItemStatus)
  status!: ItineraryItemStatus;
}

export class DayOneItineraryDto {
  @ApiPropertyOptional({ type: ItineraryFlightDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ItineraryFlightDto)
  flight!: ItineraryFlightDto | null;

  @ApiProperty({ type: ItineraryTransportDto })
  @ValidateNested()
  @Type(() => ItineraryTransportDto)
  transport!: ItineraryTransportDto;

  @ApiProperty({ type: ItineraryHotelDto })
  @ValidateNested()
  @Type(() => ItineraryHotelDto)
  hotel!: ItineraryHotelDto;
}

export class ExperienceDayItineraryDto {
  @ApiProperty({ minimum: 2 })
  @IsInt()
  @Min(2)
  dayNumber!: number;

  @ApiProperty({ type: [ItineraryExperienceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryExperienceDto)
  experiences!: ItineraryExperienceDto[];
}

export class StructuredItineraryDto {
  @ApiProperty({ type: DayOneItineraryDto })
  @ValidateNested()
  @Type(() => DayOneItineraryDto)
  day1!: DayOneItineraryDto;

  @ApiProperty({ type: [ExperienceDayItineraryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDayItineraryDto)
  days!: ExperienceDayItineraryDto[];
}

export class DayOneFlightPatchDto {
  @ApiPropertyOptional({ type: ItineraryFlightDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Transform(({ value }) => (value === null ? null : value))
  @Type(() => ItineraryFlightDto)
  flight?: ItineraryFlightDto | null;

  @ApiPropertyOptional({ type: ItineraryHotelDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ItineraryHotelDto)
  hotel?: ItineraryHotelDto;
}

export class StructuredItineraryPatchDto {
  @ApiPropertyOptional({ type: ItineraryFlightDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Transform(({ value }) => (value === null ? null : value))
  @Type(() => ItineraryFlightDto)
  flight?: ItineraryFlightDto | null;

  @ApiPropertyOptional({ type: DayOneFlightPatchDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayOneFlightPatchDto)
  day1?: DayOneFlightPatchDto;

  @ApiPropertyOptional({ type: ItineraryHotelDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ItineraryHotelDto)
  hotel?: ItineraryHotelDto;

  @ApiPropertyOptional({ type: [ExperienceDayItineraryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDayItineraryDto)
  days?: ExperienceDayItineraryDto[];
}
