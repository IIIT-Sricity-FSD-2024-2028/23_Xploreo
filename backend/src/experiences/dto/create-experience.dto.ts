import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ExperienceAvailability,
  ExperienceCategory,
} from '../entities/experience.entity';

class ExperienceSlotDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  date!: string;

  @ApiProperty()
  @IsString()
  time!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  booked!: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  capacity!: number;

  @ApiProperty()
  @IsBoolean()
  available!: boolean;
}

export class CreateExperienceDto {
  @ApiPropertyOptional({ example: 'exp-sunset-walk' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Sunset Beach Photography Walk' })
  @IsString()
  title!: string;

  @ApiProperty({
    example:
      'Golden-hour guided walk for photographers and first-time visitors.',
  })
  @IsString()
  description!: string;

  @ApiProperty({ example: 'Goa' })
  @IsString()
  destination!: string;

  @ApiProperty({
    enum: ExperienceCategory,
    example: ExperienceCategory.PHOTOGRAPHY,
  })
  @IsEnum(ExperienceCategory)
  category!: ExperienceCategory;

  @ApiPropertyOptional({
    enum: ExperienceAvailability,
    example: ExperienceAvailability.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(ExperienceAvailability)
  availability?: ExperienceAvailability;

  @ApiProperty({ example: 75 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  durationHours!: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  booked?: number;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: '2026-07-12 10:00 AM' })
  @IsOptional()
  @IsString()
  nextSlot?: string;

  @ApiPropertyOptional({ type: [ExperienceSlotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceSlotDto)
  slots?: ExperienceSlotDto[];
}
