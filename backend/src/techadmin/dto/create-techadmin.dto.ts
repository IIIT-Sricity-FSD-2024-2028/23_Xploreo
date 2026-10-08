import { IsEmail, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTechadminDto {
  @ApiProperty({ example: 'Dev' })
  @IsString()
  fname!: string;

  @ApiProperty({ example: 'Mehta' })
  @IsString()
  lname!: string;

  @ApiProperty({ example: 'dev@xploreo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 9876543210 })
  @IsNumber()
  phone_number!: number;

  @ApiProperty({ example: 'Bangalore' })
  @IsString()
  location!: string;
}
