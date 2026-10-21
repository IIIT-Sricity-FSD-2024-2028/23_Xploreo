import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { PasswordResetMailService } from './password-reset-mail.service';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, PasswordResetMailService],
  exports: [AuthRepository],
})
export class AuthModule {}
