import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiPropertyOptional({ example: 'plan-kyoto-cultural-escape' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Kyoto Cultural Escape' })
  @IsString()
  title!: string;

  @ApiProperty({
    example:
      'Temple trails, tea ceremony, and a relaxed final evening in Gion.',
  })
  @IsString()
  description!: string;

  @ApiPropertyOptional({
    example: 'Hyderabad',
    description: 'Traveller-facing source city. Alias of originCity.',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: 'Hyderabad' })
  @IsOptional()
  @IsString()
  originCity?: string;

  @ApiProperty({ example: 'Kyoto, Japan' })
  @IsString()
  destination!: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Package duration in nights. Alias of durationNights.',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationNights?: number;

  @ApiPropertyOptional({
    example: 251000,
    description: 'Package price per traveller. Alias of pricePerPerson.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 251000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerPerson?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  hotelStars?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  includesFlight?: boolean;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1528164344705-47542687000d',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: ['Culture', 'Luxury', 'Guided'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'available' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    oneOf: [
      {
        type: 'object',
        description: 'Structured itinerary object with day1 and days.',
      },
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            day: { type: 'string', example: 'Day 1' },
            title: { type: 'string', example: 'Arrival and hotel check-in' },
            detail: { type: 'string', example: 'Transfer and evening walk.' },
          },
        },
      },
    ],
  })
  @IsDefined()
  itinerary!: unknown;
}
