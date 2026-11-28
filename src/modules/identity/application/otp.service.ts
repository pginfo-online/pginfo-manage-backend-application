import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import type { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../../../platform/database/index.js';
import type { EnvConfig } from '../../../config/index.js';
import {
  AppError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../../common/errors/index.js';
import {
  SmsOtpService,
  normalizeIndianMobile,
  maskMobile,
} from '../infrastructure/sms-otp.service.js';

export interface SendOtpResult {
  success: true;
  message: string;
  mobile: string;
  maskedMobile: string;
  purpose: OtpPurpose;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private static readonly RATE_LIMIT_WINDOW_MINUTES = 15;
  private static readonly MAX_SENDS_PER_WINDOW = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly smsOtpService: SmsOtpService,
  ) {}

  private getExpirySeconds(): number {
    return this.config.get('OTP_EXPIRY_SECONDS') ?? 300;
  }

  private getResendCooldownSeconds(): number {
    return this.config.get('OTP_RESEND_COOLDOWN_SECONDS') ?? 30;
  }

  private getMaxAttempts(): number {
    return this.config.get('OTP_MAX_ATTEMPTS') ?? 5;
  }

  private hashOtp(otp: string, salt: string): string {
    const hash = createHmac('sha256', this.config.get('JWT_SECRET'))
      .update(`pginfo:mobile-otp:v1:${salt}:${otp}`)
      .digest('hex');
    return `hmac-v1:${hash}`;
  }

  private safeEqualHex(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }

  /**
   * Validates user eligibility and issues a 4-digit OTP via SMS.
   */
  async sendOtp(
    input: { mobile: string; purpose: OtpPurpose; email?: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<SendOtpResult> {
    const mobile = normalizeIndianMobile(input.mobile);
    if (!mobile) {
      throw new AppError(
        'INVALID_MOBILE',
        'Please enter a valid 10-digit Indian mobile number.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 1. Validate account state for LOGIN vs REGISTER
    if (input.purpose === 'LOGIN') {
      const user = await this.prisma.user.findUnique({
        where: { mobile },
        select: { id: true, isActive: true },
      });
      if (!user) {
        throw new NotFoundError('Account');
      }
      if (!user.isActive) {
        throw new UnauthorizedError(
          'Account is disabled. Please contact support.',
        );
      }
    } else {
      const existingMobile = await this.prisma.user.findUnique({
        where: { mobile },
        select: { id: true },
      });
      if (existingMobile) {
        throw new ConflictError(
          'A user with this mobile number already exists. Please sign in instead.',
        );
      }
      if (input.email) {
        const existingEmail = await this.prisma.user.findUnique({
          where: { email: input.email.toLowerCase().trim() },
          select: { id: true },
        });
        if (existingEmail) {
          throw new ConflictError(
            'A user with this email address already exists',
          );
        }
      }
    }

    const cooldownSeconds = this.getResendCooldownSeconds();
    const expirySeconds = this.getExpirySeconds();
    const otp = randomInt(10_000).toString().padStart(4, '0');
    const salt = randomBytes(16).toString('hex');
    const otpHash = this.hashOtp(otp, salt);

    const { record, issuedAt, expiresAt } = await this.prisma.$transaction(
      async (tx) => {
        const lockKey = `identity:otp:${input.purpose}:${mobile}`;
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
        const issuedAt = new Date();
        const windowMs = OtpService.RATE_LIMIT_WINDOW_MINUTES * 60_000;
        const recent = await tx.otpVerification.findMany({
          where: {
            mobile,
            purpose: input.purpose,
            createdAt: { gte: new Date(issuedAt.getTime() - windowMs) },
            OR: [{ providerMessageId: { not: null } }, { invalidatedAt: null }],
          },
          orderBy: { createdAt: 'desc' },
          take: OtpService.MAX_SENDS_PER_WINDOW + 1,
          select: { createdAt: true, providerMessageId: true },
        });

        const latest = recent[0];
        if (latest) {
          const elapsedMs = issuedAt.getTime() - latest.createdAt.getTime();
          // Give an in-flight SMS submission time to finish before replacing its code.
          const minimumWait = latest.providerMessageId
            ? cooldownSeconds
            : Math.max(cooldownSeconds, 20);
          const retryAfterSeconds = Math.ceil(minimumWait - elapsedMs / 1000);
          if (retryAfterSeconds > 0) {
            throw new AppError(
              'OTP_COOLDOWN',
              `Please wait ${retryAfterSeconds} seconds before requesting another OTP.`,
              HttpStatus.TOO_MANY_REQUESTS,
              { retryAfterSeconds },
            );
          }
        }

        const oldest = recent.filter(
          (entry) => entry.providerMessageId !== null,
        )[OtpService.MAX_SENDS_PER_WINDOW - 1];
        if (oldest) {
          const retryAfterSeconds = Math.max(
            1,
            Math.ceil(
              (oldest.createdAt.getTime() + windowMs - issuedAt.getTime()) /
                1000,
            ),
          );
          throw new AppError(
            'OTP_RATE_LIMITED',
            'Too many OTP requests. Please try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
            { retryAfterSeconds },
          );
        }

        const expiresAt = new Date(issuedAt.getTime() + expirySeconds * 1000);
        await tx.otpVerification.updateMany({
          where: {
            mobile,
            purpose: input.purpose,
            consumedAt: null,
            invalidatedAt: null,
          },
          data: { invalidatedAt: issuedAt },
        });
        const record = await tx.otpVerification.create({
          data: {
            mobile,
            purpose: input.purpose,
            otpHash,
            salt,
            maxAttempts: this.getMaxAttempts(),
            createdAt: issuedAt,
            expiresAt,
            ipAddress: meta?.ipAddress,
            userAgent: meta?.userAgent,
          },
        });
        return { record, issuedAt, expiresAt };
      },
    );

    // 4. Dispatch SMS; if gateway fails, invalidate this record so cooldown isn't stuck
    try {
      const smsResult = await this.smsOtpService.sendVerificationOtp(
        mobile,
        otp,
      );
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { providerMessageId: smsResult.messageId ?? 'sent' },
      });
    } catch (err) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { invalidatedAt: new Date() },
      });
      throw err;
    }

    const now = Date.now();
    return {
      success: true,
      message: 'Verification code sent to your mobile number.',
      mobile,
      maskedMobile: maskMobile(mobile),
      purpose: input.purpose,
      expiresInSeconds: Math.max(
        0,
        Math.ceil((expiresAt.getTime() - now) / 1000),
      ),
      resendAfterSeconds: Math.max(
        0,
        Math.ceil((issuedAt.getTime() + cooldownSeconds * 1000 - now) / 1000),
      ),
    };
  }

  /**
   * Verifies a 4-digit OTP with constant-time comparison, expiry checks,
   * brute-force attempt limits, and atomic single-use consumption.
   */
  async verifyAndConsumeOtp(
    mobileInput: string,
    otpInput: string,
    purpose: OtpPurpose,
  ): Promise<string> {
    const mobile = normalizeIndianMobile(mobileInput);
    if (!mobile) {
      throw new AppError(
        'INVALID_MOBILE',
        'Please enter a valid 10-digit Indian mobile number.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const otp = otpInput.trim();
    if (!/^\d{4}$/.test(otp)) {
      throw new AppError(
        'INVALID_OTP_FORMAT',
        'OTP must be a 4-digit numeric code.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const record = await this.prisma.otpVerification.findFirst({
      where: {
        mobile,
        purpose,
        consumedAt: null,
        invalidatedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    const unavailable = () =>
      new AppError(
        'OTP_UNAVAILABLE',
        'Invalid or expired OTP. Please request a new code.',
        HttpStatus.UNAUTHORIZED,
      );
    if (!record) throw unavailable();

    const now = new Date();
    if (now >= record.expiresAt) {
      await this.prisma.otpVerification.updateMany({
        where: { id: record.id, consumedAt: null, invalidatedAt: null },
        data: { invalidatedAt: now },
      });
      throw new AppError(
        'OTP_EXPIRED',
        'OTP has expired. Please request a new code.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const attemptsExceeded = () =>
      new AppError(
        'OTP_ATTEMPTS_EXCEEDED',
        'Too many incorrect OTP attempts. Please request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    if (record.attempts >= record.maxAttempts) throw attemptsExceeded();

    // Accept outstanding codes issued before keyed OTP hashes were introduced.
    const version = 'hmac-v1:';
    const isKeyed = record.otpHash.startsWith(version);
    const expectedHash = isKeyed
      ? record.otpHash.slice(version.length)
      : record.otpHash;
    const candidateHash = isKeyed
      ? this.hashOtp(otp, record.salt).slice(version.length)
      : createHash('sha256').update(`${record.salt}:${otp}`).digest('hex');
    const available = {
      id: record.id,
      consumedAt: null,
      invalidatedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: record.maxAttempts },
    };

    if (!this.safeEqualHex(candidateHash, expectedHash)) {
      const [attempt] = await this.prisma.otpVerification.updateManyAndReturn({
        where: available,
        data: { attempts: { increment: 1 } },
        select: { attempts: true },
      });
      if (!attempt) throw unavailable();

      const remaining = record.maxAttempts - attempt.attempts;
      this.logger.warn(
        `Invalid OTP attempt for ${maskMobile(mobile)} (${purpose}), remaining=${remaining}`,
      );
      if (remaining === 0) throw attemptsExceeded();
      throw new AppError(
        'OTP_INVALID',
        `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const consumed = await this.prisma.otpVerification.updateMany({
      where: available,
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw unavailable();

    return mobile;
  }
}
