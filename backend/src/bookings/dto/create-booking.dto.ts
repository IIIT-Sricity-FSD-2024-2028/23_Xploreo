import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  IsNumber,
  IsArray,
} from 'class-validator';

export class CreateBookingDto {
  @ApiPropertyOptional({ example: 'XPL-HTL-1234' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'hotel-goa-001' })
  @IsString()
  hotelId!: string;

  @ApiProperty({ example: 'Anjali Sharma' })
  @IsString()
  @MaxLength(120)
  guestName!: string;

  @ApiProperty({ example: 'anjali@example.com' })
  @IsString()
  @MaxLength(160)
  email!: string;

  @ApiProperty({ example: '+91 9876543210' })
  @IsString()
  @MaxLength(40)
  phone!: string;

  @ApiProperty({ example: '2026-06-10' })
  @IsDateString()
  checkIn!: string;

  @ApiProperty({ example: '2026-06-12' })
  @IsDateString()
  checkOut!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  guests!: number;

  @ApiProperty({ example: 'Deluxe Room' })
  @IsString()
  roomType!: string;

  @ApiPropertyOptional({ example: 'Late check-in requested.' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  rooms?: number;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiProperty({
    description: 'Array of guest names',
    required: false,
    example: ['John Doe', 'Jane Doe'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  guestNames?: string[];
}
