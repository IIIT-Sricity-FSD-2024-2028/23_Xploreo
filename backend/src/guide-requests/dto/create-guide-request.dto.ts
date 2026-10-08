import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateGuideRequestDto {
  @ApiProperty({ example: 'traveller-123' })
  @IsString()
  travellerId!: string;

  @ApiProperty({ example: 'trip-123' })
  @IsString()
  tripId!: string;

  @ApiProperty({ example: 'exp-1' })
  @IsString()
  experienceId!: string;

  @ApiProperty({ example: '10001', required: false })
  @IsOptional()
  @IsString()
  guideId?: string;
}
