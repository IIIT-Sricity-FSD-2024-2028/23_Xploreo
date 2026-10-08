import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({ example: 'Juhu Beach' })
  @IsString()
  locationName!: string;

  @ApiProperty({ example: 'city-mumbai-1' })
  @IsString()
  cityId!: string;
}
