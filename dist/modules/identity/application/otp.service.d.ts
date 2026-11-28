import { ConfigService } from '@nestjs/config';
import type { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../../../platform/database/index.js';
import type { EnvConfig } from '../../../config/index.js';
import { SmsOtpService } from '../infrastructure/sms-otp.service.js';
export interface SendOtpResult {
    success: true;
    message: string;
    mobile: string;
    maskedMobile: string;
    purpose: OtpPurpose;
    expiresInSeconds: number;
    resendAfterSeconds: number;
}
export declare class OtpService {
    private readonly prisma;
    private readonly config;
    private readonly smsOtpService;
    private readonly logger;
    private static readonly RATE_LIMIT_WINDOW_MINUTES;
    private static readonly MAX_SENDS_PER_WINDOW;
    constructor(prisma: PrismaService, config: ConfigService<EnvConfig, true>, smsOtpService: SmsOtpService);
    private getExpirySeconds;
    private getResendCooldownSeconds;
    private getMaxAttempts;
    private hashOtp;
    private safeEqualHex;
    sendOtp(input: {
        mobile: string;
        purpose: OtpPurpose;
        email?: string;
    }, meta?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<SendOtpResult>;
    verifyAndConsumeOtp(mobileInput: string, otpInput: string, purpose: OtpPurpose): Promise<string>;
}
