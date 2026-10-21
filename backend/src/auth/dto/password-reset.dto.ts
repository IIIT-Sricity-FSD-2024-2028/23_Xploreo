import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'traveller@example.com' })
  @IsEmail()
  email!: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty({ description: 'The token contained in the password-reset link' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'A-new-password-2026', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'A-new-password-2026', minLength: 8 })
  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}
