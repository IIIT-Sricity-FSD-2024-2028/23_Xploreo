import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExperienceBookingDto {
  @ApiProperty({ example: 'exp-sunset-walk' })
  @IsString()
  experienceId!: string;

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

  @ApiProperty({ example: '2026-07-12' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '10:00 AM' })
  @IsString()
  @IsOptional()
  time?: string;

  @ApiProperty({ example: 'slot-1' })
  @IsString()
  @IsOptional()
  slotId?: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  participants!: number;
}
