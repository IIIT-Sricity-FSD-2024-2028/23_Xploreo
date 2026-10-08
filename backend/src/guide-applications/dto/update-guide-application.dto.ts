import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GuideApplicationStatus } from '../entities/guide-application.entity';

export class UpdateGuideApplicationDto {
  @ApiPropertyOptional({ enum: GuideApplicationStatus })
  @IsOptional()
  @IsEnum(GuideApplicationStatus)
  status?: GuideApplicationStatus;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  guidePricePerPerson?: number;
}
