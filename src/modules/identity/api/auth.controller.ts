import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService, type AuthResult } from '../application/auth.service.js';
import { OtpService, type SendOtpResult } from '../application/otp.service.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  sendOtpSchema,
  resendOtpSchema,
  otpLoginSchema,
  otpRegisterSchema,
  type RegisterDto,
  type LoginDto,
  type RefreshTokenDto,
  type SendOtpDto,
  type ResendOtpDto,
  type OtpLoginDto,
  type OtpRegisterDto,
} from './dto/auth.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import {
  JwtAuthGuard,
  CurrentUser,
  CurrentUserId,
} from '../../../platform/authentication/index.js';
import type { AuthenticatedUser } from '../../../common/types/index.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'Email or mobile already in use' })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
    @Req() req: Request,
  ): Promise<AuthResult> {
    return this.authService.register(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate with an email or mobile number and password',
  })
  @ApiResponse({ status: 200, description: 'Successfully authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResult> {
    return this.authService.login(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('otp/send')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a 4-digit OTP for login or registration' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 429, description: 'Cooldown or rate limit active' })
  async sendOtp(
    @Body(new ZodValidationPipe(sendOtpSchema)) dto: SendOtpDto,
    @Req() req: Request,
  ): Promise<SendOtpResult> {
    return this.otpService.sendOtp(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('otp/resend')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Resend a 4-digit OTP after cooldown' })
  @ApiResponse({ status: 200, description: 'OTP resent successfully' })
  @ApiResponse({ status: 429, description: 'Cooldown or rate limit active' })
  async resendOtp(
    @Body(new ZodValidationPipe(resendOtpSchema)) dto: ResendOtpDto,
    @Req() req: Request,
  ): Promise<SendOtpResult> {
    return this.otpService.sendOtp(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('otp/login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({ summary: 'Authenticate using mobile number and 4-digit OTP' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  async otpLogin(
    @Body(new ZodValidationPipe(otpLoginSchema)) dto: OtpLoginDto,
    @Req() req: Request,
  ): Promise<AuthResult> {
    return this.authService.loginWithOtp(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('otp/register')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new account with 4-digit mobile OTP' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 409, description: 'Mobile or email already in use' })
  async otpRegister(
    @Body(new ZodValidationPipe(otpRegisterSchema)) dto: OtpRegisterDto,
    @Req() req: Request,
  ): Promise<AuthResult> {
    return this.authService.registerWithOtp(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new token pair' })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or reused refresh token' })
  async refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    return this.authService.refresh(dto.refreshToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      organizationId: dto.organizationId,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Revoke refresh token and log out' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto,
    @CurrentUserId() userId: string,
  ) {
    await this.authService.logout(dto.refreshToken, userId);
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current user profile and memberships' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }
}
