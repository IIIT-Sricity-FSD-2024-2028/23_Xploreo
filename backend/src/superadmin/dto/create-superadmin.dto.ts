import { IsEmail, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSuperadminDto {
  @ApiProperty({ example: 'Raj' })
  @IsString()
  fname!: string;

  @ApiProperty({ example: 'Sharma' })
  @IsString()
  lname!: string;

  @ApiProperty({ example: 'raj@xploreo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 9988776655 })
  @IsNumber()
  phone_number!: number;
}
