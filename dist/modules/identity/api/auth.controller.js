var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Post, Get, Body, Req, HttpCode, HttpStatus, UseGuards, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from '../application/auth.service.js';
import { OtpService } from '../application/otp.service.js';
import { registerSchema, loginSchema, refreshTokenSchema, sendOtpSchema, resendOtpSchema, otpLoginSchema, otpRegisterSchema, } from './dto/auth.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentUser, CurrentUserId, } from '../../../platform/authentication/index.js';
let AuthController = class AuthController {
    authService;
    otpService;
    constructor(authService, otpService) {
        this.authService = authService;
        this.otpService = otpService;
    }
    async register(dto, req) {
        return this.authService.register(dto, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
    }
    async login(dto, req) {
        return this.authService.login(dto, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
    }
    async sendOtp(dto, req) {
        return this.otpService.sendOtp(dto, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
    }
    async resendOtp(dto, req) {
        return this.otpService.sendOtp(dto, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
    }
    async otpLogin(dto, req) {
        return this.authService.loginWithOtp(dto, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
    }
    async otpRegister(dto, req) {
        return this.authService.registerWithOtp(dto, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
    }
    async refresh(dto, req) {
        return this.authService.refresh(dto.refreshToken, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            organizationId: dto.organizationId,
        });
    }
    async logout(dto, userId) {
        await this.authService.logout(dto.refreshToken, userId);
        return { success: true, message: 'Logged out successfully' };
    }
    async getMe(user) {
        return this.authService.getMe(user.id);
    }
};
__decorate([
    Post('register'),
    HttpCode(HttpStatus.CREATED),
    ApiOperation({ summary: 'Register a new user account' }),
    ApiResponse({ status: 201, description: 'User successfully registered' }),
    ApiResponse({ status: 409, description: 'Email or mobile already in use' }),
    __param(0, Body(new ZodValidationPipe(registerSchema))),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    Post('login'),
    HttpCode(HttpStatus.OK),
    ApiOperation({
        summary: 'Authenticate with an email or mobile number and password',
    }),
    ApiResponse({ status: 200, description: 'Successfully authenticated' }),
    ApiResponse({ status: 401, description: 'Invalid credentials' }),
    __param(0, Body(new ZodValidationPipe(loginSchema))),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    Post('otp/send'),
    UseGuards(ThrottlerGuard),
    HttpCode(HttpStatus.OK),
    Throttle({ default: { limit: 10, ttl: 60_000 } }),
    ApiOperation({ summary: 'Send a 4-digit OTP for login or registration' }),
    ApiResponse({ status: 200, description: 'OTP sent successfully' }),
    ApiResponse({ status: 429, description: 'Cooldown or rate limit active' }),
    __param(0, Body(new ZodValidationPipe(sendOtpSchema))),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendOtp", null);
__decorate([
    Post('otp/resend'),
    UseGuards(ThrottlerGuard),
    HttpCode(HttpStatus.OK),
    Throttle({ default: { limit: 10, ttl: 60_000 } }),
    ApiOperation({ summary: 'Resend a 4-digit OTP after cooldown' }),
    ApiResponse({ status: 200, description: 'OTP resent successfully' }),
    ApiResponse({ status: 429, description: 'Cooldown or rate limit active' }),
    __param(0, Body(new ZodValidationPipe(resendOtpSchema))),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendOtp", null);
__decorate([
    Post('otp/login'),
    UseGuards(ThrottlerGuard),
    HttpCode(HttpStatus.OK),
    Throttle({ default: { limit: 15, ttl: 60_000 } }),
    ApiOperation({ summary: 'Authenticate using mobile number and 4-digit OTP' }),
    ApiResponse({ status: 200, description: 'Successfully authenticated' }),
    ApiResponse({ status: 401, description: 'Invalid or expired OTP' }),
    __param(0, Body(new ZodValidationPipe(otpLoginSchema))),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "otpLogin", null);
__decorate([
    Post('otp/register'),
    UseGuards(ThrottlerGuard),
    HttpCode(HttpStatus.CREATED),
    Throttle({ default: { limit: 15, ttl: 60_000 } }),
    ApiOperation({ summary: 'Register a new account with 4-digit mobile OTP' }),
    ApiResponse({ status: 201, description: 'User successfully registered' }),
    ApiResponse({ status: 401, description: 'Invalid or expired OTP' }),
    ApiResponse({ status: 409, description: 'Mobile or email already in use' }),
    __param(0, Body(new ZodValidationPipe(otpRegisterSchema))),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "otpRegister", null);
__decorate([
    Post('refresh'),
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Rotate refresh token and issue new token pair' }),
    ApiResponse({ status: 200, description: 'Tokens rotated successfully' }),
    ApiResponse({ status: 401, description: 'Invalid or reused refresh token' }),
    __param(0, Body(new ZodValidationPipe(refreshTokenSchema))),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    Post('logout'),
    HttpCode(HttpStatus.OK),
    UseGuards(JwtAuthGuard),
    ApiBearerAuth('JWT'),
    ApiOperation({ summary: 'Revoke refresh token and log out' }),
    ApiResponse({ status: 200, description: 'Logged out successfully' }),
    __param(0, Body(new ZodValidationPipe(refreshTokenSchema))),
    __param(1, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    Get('me'),
    UseGuards(JwtAuthGuard),
    ApiBearerAuth('JWT'),
    ApiOperation({ summary: 'Get current user profile and memberships' }),
    ApiResponse({ status: 200, description: 'User profile retrieved' }),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMe", null);
AuthController = __decorate([
    ApiTags('Authentication'),
    Controller('auth'),
    __metadata("design:paramtypes", [AuthService,
        OtpService])
], AuthController);
export { AuthController };
//# sourceMappingURL=auth.controller.js.map