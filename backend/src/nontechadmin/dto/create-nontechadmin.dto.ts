import { IsEmail, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNontechadminDto {
  @ApiProperty({ example: 'Priya' })
  @IsString()
  fname!: string;

  @ApiProperty({ example: 'Nair' })
  @IsString()
  lname!: string;

  @ApiProperty({ example: 'priya@xploreo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 9123456780 })
  @IsNumber()
  phone_number!: number;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  location!: string;
}
