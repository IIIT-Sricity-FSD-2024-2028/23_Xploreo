import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'anjali_s' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'anjali@123' })
  @IsString()
  @MinLength(6)
  password!: string;
}
