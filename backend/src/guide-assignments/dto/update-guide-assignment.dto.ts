import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GuideAssignmentStatus } from '../entities/guide-assignment.entity';

export class UpdateGuideAssignmentDto {
  @ApiPropertyOptional({ enum: GuideAssignmentStatus })
  @IsOptional()
  @IsEnum(GuideAssignmentStatus)
  status?: GuideAssignmentStatus;

  @ApiPropertyOptional({ example: 'guide-user-002', description: 'New guide ID when changing guide' })
  @IsOptional()
  @IsString()
  newGuideId?: string;

  @ApiPropertyOptional({ example: 40, description: 'New guide price per person' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  newGuidePricePerPerson?: number;
}
