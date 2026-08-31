import { IsEnum, IsInt, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ReviewTargetType {
  GUIDE = 'guide',
  HOTEL = 'hotel',
  EXPERIENCE = 'experience',
}

export class CreateReviewDto {
  @ApiProperty({ example: 20001 })
  @Type(() => Number)
  @IsInt()
  userId!: number;

  @ApiProperty({ enum: ReviewTargetType, example: ReviewTargetType.GUIDE })
  @IsEnum(ReviewTargetType)
  targetType!: ReviewTargetType;

  @ApiProperty({ example: '10001' })
  @IsString()
  targetId!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ example: 'Excellent guide and a smooth experience.' })
  @IsString()
  comment!: string;

  @ApiProperty({ example: 'photo.jpg', required: false })
  @IsString()
  image?: string;
}
