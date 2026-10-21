import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelBookingDto {
  @ApiPropertyOptional({ example: 'Change of travel plans' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 'SUCCESS', enum: ['SUCCESS', 'FAILURE', 'PENDING'] })
  @IsOptional()
  @IsString()
  simulatedOutcome?: string;
}
