import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Interest } from '../entities/traveller.entity';

export class CreateTravellerDto {
  @ApiProperty({ example: 'Sara' })
  @IsString()
  fname!: string;

  @ApiProperty({ example: 'Patel' })
  @IsString()
  lname!: string;

  @ApiProperty({ example: 'sara@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 9123456789 })
  @IsNumber()
  phno!: number;

  @ApiPropertyOptional({ example: ['English', 'Gujarati'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  plang?: string[];

  @ApiPropertyOptional({ example: 'Loves exploring local cultures' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    enum: Interest,
    isArray: true,
    example: [Interest.ADVENTURE, Interest.FOOD],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Interest, { each: true })
  interests?: Interest[];

  @ApiPropertyOptional({ example: 'Male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsOptional()
  @IsString()
  dob?: string;
}
