import { IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGuideAssignmentDto {
  @ApiProperty({ example: 'plan-1' })
  @IsString()
  planId!: string;

  @ApiProperty({ example: '20268540', required: false })
  @IsString()
  @IsOptional()
  bookingId?: string;

  @ApiProperty({ example: 'guide-user-001' })
  @IsString()
  guideId!: string;

  @ApiProperty({ example: 50, description: 'Price per person charged by this guide' })
  @IsNumber()
  @Min(0)
  guidePricePerPerson!: number;

  @ApiProperty({ example: 50, description: 'Amount paid by traveller for guide' })
  @IsNumber()
  @Min(0)
  paidAmount!: number;

  @ApiProperty({ example: 2, required: false, description: 'Number of travelers' })
  @IsNumber()
  @IsOptional()
  travelerCount?: number;

  @ApiProperty({ example: '2026-08-29' })
  @IsString()
  startDate!: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsString()
  endDate!: string;
}
