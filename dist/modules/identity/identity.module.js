var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { AuthController } from './api/auth.controller.js';
import { AuthService } from './application/auth.service.js';
import { TokenService } from './application/token.service.js';
import { OtpService } from './application/otp.service.js';
import { SmsOtpService } from './infrastructure/sms-otp.service.js';
import { AuthenticationModule } from '../../platform/authentication/index.js';
let IdentityModule = class IdentityModule {
};
IdentityModule = __decorate([
    Module({
        imports: [AuthenticationModule],
        controllers: [AuthController],
        providers: [AuthService, TokenService, OtpService, SmsOtpService],
        exports: [AuthService, TokenService, OtpService, SmsOtpService],
    })
], IdentityModule);
export { IdentityModule };
//# sourceMappingURL=identity.module.js.map