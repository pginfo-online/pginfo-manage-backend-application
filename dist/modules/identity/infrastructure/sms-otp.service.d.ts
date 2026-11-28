import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../../config/index.js';
export interface SmsOtpSendResult {
    success: boolean;
    messageId?: string;
    phone: string;
    simulated?: boolean;
}
export declare function normalizeIndianMobile(raw: string): string | null;
export declare function maskMobile(mobile: string): string;
export declare class SmsOtpService {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService<EnvConfig, true>);
    sendVerificationOtp(phoneInput: string, otp: string): Promise<SmsOtpSendResult>;
}
