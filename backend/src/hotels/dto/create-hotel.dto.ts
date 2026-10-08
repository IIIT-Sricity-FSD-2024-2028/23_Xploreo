import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateHotelDto {
  @ApiPropertyOptional({ example: 'hotel-goa-001' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ example: 'partner123' })
  @IsOptional()
  @IsString()
  partnerId?: string;

  @ApiProperty({ example: 'Xploreo Beach Resort' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Goa' })
  @IsString()
  city!: string;

  @ApiProperty({ example: 'Calangute Beach, Goa' })
  @IsString()
  location!: string;

  @ApiProperty({
    example: 'Beachfront hotel with pool, breakfast, and airport transfers.',
  })
  @IsString()
  description!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;

  @ApiProperty({ example: 4800, minimum: 0 })
  @IsNumber()
  @Min(0)
  pricePerNight!: number;

  @ApiPropertyOptional({ example: 650, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxesAndFees?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalRooms?: number;

  @ApiPropertyOptional({ example: 'https://example.com/hotel.jpg' })
  @IsOptional()
  @IsString()
  image?: string;
  @ApiPropertyOptional({ example: ['https://example.com/hotel.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ example: ['Pool', 'Breakfast', 'WiFi'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive', 'restricted'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'restricted'])
  status?: 'active' | 'inactive' | 'restricted';

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
}
