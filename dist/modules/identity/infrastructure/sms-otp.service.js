var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SmsOtpService_1;
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../../../common/errors/index.js';
export function normalizeIndianMobile(raw) {
    const digits = raw.replace(/\D/g, '');
    let normalized = digits;
    if (digits.length === 12 && digits.startsWith('91')) {
        normalized = digits.slice(2);
    }
    else if (digits.length === 11 && digits.startsWith('0')) {
        normalized = digits.slice(1);
    }
    return /^[6-9]\d{9}$/.test(normalized) ? normalized : null;
}
export function maskMobile(mobile) {
    if (mobile.length < 4)
        return '****';
    return `${'*'.repeat(Math.max(0, mobile.length - 4))}${mobile.slice(-4)}`;
}
let SmsOtpService = SmsOtpService_1 = class SmsOtpService {
    config;
    logger = new Logger(SmsOtpService_1.name);
    constructor(config) {
        this.config = config;
    }
    async sendVerificationOtp(phoneInput, otp) {
        const normalizedPhone = normalizeIndianMobile(phoneInput);
        if (!normalizedPhone) {
            throw new AppError('INVALID_MOBILE', 'Please enter a valid 10-digit Indian mobile number.', 400);
        }
        const simulate = this.config.get('SMS_SIMULATE') || this.config.get('NODE_ENV') === 'test';
        if (simulate) {
            const messageId = `sim_${Date.now()}`;
            this.logger.log(`[SIMULATED SMS] Phone: ${maskMobile(normalizedPhone)}, Message ID: ${messageId}`);
            return {
                success: true,
                messageId,
                phone: normalizedPhone,
                simulated: true,
            };
        }
        const baseUrl = this.config.get('SMS_GATEWAY_URL');
        const mobile = this.config.get('SMS_GATEWAY_MOBILE');
        const pass = this.config.get('SMS_GATEWAY_PASSWORD');
        const apiKey = this.config.get('SMS_GATEWAY_APIKEY');
        const peid = this.config.get('SMS_GATEWAY_PEID');
        const templateId = this.config.get('SMS_GATEWAY_TEMPLATE_ID');
        const senderId = this.config.get('SMS_GATEWAY_SENDER_ID');
        if (!baseUrl ||
            !mobile ||
            !pass ||
            !apiKey ||
            !peid ||
            !templateId ||
            !senderId) {
            this.logger.error('SMS OTP gateway configuration is incomplete');
            throw new AppError('SMS_GATEWAY_NOT_CONFIGURED', 'SMS verification service is temporarily unavailable. Please try email login or contact support.', 503);
        }
        const message = `Dear User, PGInfo login verification code is ${otp}. This OTP is valid for 5 minutes. Do not share this OTP with anyone. - PGInfo`;
        const url = new URL(baseUrl);
        url.searchParams.set('mobile', mobile);
        url.searchParams.set('pass', pass);
        url.searchParams.set('to', normalizedPhone);
        url.searchParams.set('msg', message);
        url.searchParams.set('peid', peid);
        url.searchParams.set('templateid', templateId);
        url.searchParams.set('restype', 'json');
        url.searchParams.set('apikey', apiKey);
        url.searchParams.set('senderid', senderId);
        let rawText = '';
        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                redirect: 'error',
                signal: AbortSignal.timeout(15000),
            });
            rawText = await response.text();
            if (!response.ok) {
                throw new AppError('SMS_GATEWAY_ERROR', 'Failed to send verification SMS. Please try again.', 502);
            }
        }
        catch (err) {
            if (err instanceof AppError) {
                throw err;
            }
            this.logger.error(`SMS request failed for ${maskMobile(normalizedPhone)}: ${err instanceof Error ? err.message : String(err)}`);
            throw new AppError('SMS_GATEWAY_ERROR', 'Failed to send verification SMS. Please try again.', 502);
        }
        let responseData = rawText.trim();
        if (typeof responseData === 'string' && responseData.length > 0) {
            try {
                responseData = JSON.parse(responseData);
            }
            catch {
            }
        }
        if (!responseData) {
            throw new AppError('SMS_GATEWAY_EMPTY_RESPONSE', 'SMS provider returned an empty response.', 502);
        }
        const parsedObj = typeof responseData === 'object' ? responseData : undefined;
        const statusCode = parsedObj?.['status'] != null ? String(parsedObj['status']).trim() : null;
        const isSuccess = statusCode === '000';
        if (!isSuccess) {
            const safeStatus = statusCode && /^\d{3}$/.test(statusCode) ? statusCode : 'unknown';
            this.logger.error(`SMS provider returned error for ${maskMobile(normalizedPhone)}: status=${safeStatus}`);
            throw new AppError('SMS_GATEWAY_ERROR', 'Failed to send verification SMS. Please try again.', 502);
        }
        const messageId = parsedObj?.['messageid'] != null
            ? String(parsedObj['messageid']).trim()
            : undefined;
        this.logger.log(`SMS submitted successfully. Phone: ${maskMobile(normalizedPhone)}, Message ID: ${messageId ?? 'n/a'}`);
        return {
            success: true,
            messageId,
            phone: normalizedPhone,
        };
    }
};
SmsOtpService = SmsOtpService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], SmsOtpService);
export { SmsOtpService };
//# sourceMappingURL=sms-otp.service.js.map