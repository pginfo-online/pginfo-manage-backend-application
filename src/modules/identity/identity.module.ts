import { Module } from '@nestjs/common';
import { AuthController } from './api/auth.controller.js';
import { AuthService } from './application/auth.service.js';
import { TokenService } from './application/token.service.js';
import { OtpService } from './application/otp.service.js';
import { SmsOtpService } from './infrastructure/sms-otp.service.js';
import { AuthenticationModule } from '../../platform/authentication/index.js';

@Module({
  imports: [AuthenticationModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, OtpService, SmsOtpService],
  exports: [AuthService, TokenService, OtpService, SmsOtpService],
})
export class IdentityModule {}
