import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, Max } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Amount in INR (Indian Rupees). Will be converted to paise internally.',
    example: 15000,
    minimum: 1,
    maximum: 500000,
  })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(500000, { message: 'Amount must not exceed ₹5,00,000 per transaction' })
  amount: number;

  @ApiPropertyOptional({
    description: 'Type of booking (HOLIDAY_PACKAGE, HOTEL, EXPERIENCE)',
    example: 'HOTEL',
  })
  @IsOptional()
  @IsString()
  bookingType?: string;

  @ApiPropertyOptional({
    description: 'Identifier of the booking/plan/hotel/experience being paid for',
    example: 'XPL-HTL-2026-1234',
  })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'Optional metadata notes attached to the Razorpay order',
  })
  @IsOptional()
  notes?: Record<string, string>;
}

