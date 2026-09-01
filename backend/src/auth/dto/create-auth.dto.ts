import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../entities/auth.entity';

export class RegisterDto {
  @ApiProperty({ example: 'john_doe' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Anjali Sharma' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'anjali@xploreo.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '9123456780' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ enum: Role, example: Role.TRAVELLER })
  @IsEnum(Role)
  role!: Role;

  @ApiProperty({ example: 'Goa', required: false })
  @IsString()
  location?: string;

  @ApiProperty({ example: 'Xploreo Beach Resort', required: false })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({ example: 'GSTIN1234567', required: false })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({ example: '1234567890', required: false })
  @IsOptional()
  @IsString()
  bankAccount?: string;
}
