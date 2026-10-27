import { Module } from '@nestjs/common';
import { AuthController } from './api/auth.controller.js';
import { AuthService } from './application/auth.service.js';
import { TokenService } from './application/token.service.js';
import { AuthenticationModule } from '../../platform/authentication/index.js';

@Module({
  imports: [AuthenticationModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService],
  exports: [AuthService, TokenService],
})
export class IdentityModule {}
