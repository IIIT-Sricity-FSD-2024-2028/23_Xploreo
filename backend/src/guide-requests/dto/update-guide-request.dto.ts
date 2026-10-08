import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { GuideRequestStatus } from '../entities/guide-request.entity';

export class UpdateGuideRequestDto {
  @ApiProperty({
    enum: GuideRequestStatus,
    example: GuideRequestStatus.ACCEPTED,
    required: false,
  })
  @IsOptional()
  @IsEnum(GuideRequestStatus)
  status?: GuideRequestStatus;

  @ApiProperty({ example: 'guide-123', required: false })
  @IsOptional()
  @IsString()
  guideId?: string;
}
