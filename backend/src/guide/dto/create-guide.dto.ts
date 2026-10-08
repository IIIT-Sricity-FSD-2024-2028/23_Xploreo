import {
  IsString,
  IsEmail,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGuideDto {
  @ApiPropertyOptional({ example: 'guide123' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ example: 'Ali' })
  @IsString()
  fname!: string;

  @ApiProperty({ example: 'Khan' })
  @IsString()
  lname!: string;

  @ApiProperty({ example: 'ali@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 9876543210 })
  @IsNumber()
  phone!: number;

  @ApiProperty({ example: 'loc-123' })
  @IsString()
  location!: string;

  @ApiPropertyOptional({ example: 'Senior Trek Guide' })
  @IsOptional()
  @IsString()
  prof_title?: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  years_exp!: number;

  @ApiProperty({ example: 'Passionate guide with 5+ years experience' })
  @IsString()
  bio!: string;

  @ApiProperty({ example: ['English', 'Hindi'] })
  @IsArray()
  @IsString({ each: true })
  lang_spoken!: string[];

  @ApiPropertyOptional({ example: ['First Aid', 'Mountain Rescue'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({ example: 'HDFC Bank' })
  @IsOptional()
  @IsString()
  bank_name?: string;

  @ApiPropertyOptional({ example: 1234 })
  @IsOptional()
  @IsNumber()
  bank_acc_num_end?: number;

  @ApiPropertyOptional({ example: 'IN12345678901234567890' })
  @IsOptional()
  @IsString()
  @MinLength(15)
  iban?: string;

  @ApiPropertyOptional({ example: 'restricted' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
}
