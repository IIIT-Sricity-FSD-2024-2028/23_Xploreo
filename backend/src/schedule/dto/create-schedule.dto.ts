import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ScheduleStatus {
  AVAILABLE = 'available',
  BOOKED = 'booked',
  BLOCKED = 'blocked',
}

export class CreateScheduleDto {
  @ApiProperty({ example: '10001' })
  @IsString()
  guideId!: string;

  @ApiProperty({ example: 'Old Delhi Food Walk' })
  @IsString()
  title!: string;

  @ApiProperty({ example: '2026-05-12' })
  @IsString()
  date!: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  startTime!: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  endTime!: string;

  @ApiProperty({ enum: ScheduleStatus, example: ScheduleStatus.AVAILABLE })
  @IsEnum(ScheduleStatus)
  status!: ScheduleStatus;

  @ApiProperty({ example: 'Delhi, India' })
  @IsString()
  location!: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ example: 'Meet near gate 2.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
