import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OtpService } from '../../src/modules/identity/application/otp.service.js';
import {
  SmsOtpService,
  normalizeIndianMobile,
  maskMobile,
} from '../../src/modules/identity/infrastructure/sms-otp.service.js';
import {
  AppError,
  ConflictError,
  NotFoundError,
} from '../../src/common/errors/index.js';

describe('SmsOtpService & mobile helpers', () => {
  it('normalizes valid Indian mobile formats to 10 digits', () => {
    expect(normalizeIndianMobile('9876543210')).toBe('9876543210');
    expect(normalizeIndianMobile('+91 98765-43210')).toBe('9876543210');
    expect(normalizeIndianMobile('919876543210')).toBe('9876543210');
    expect(normalizeIndianMobile('09876543210')).toBe('9876543210');
    expect(normalizeIndianMobile('1234567890')).toBeNull();
    expect(normalizeIndianMobile('98765')).toBeNull();
  });

  it('masks mobile numbers safely', () => {
    expect(maskMobile('9876543210')).toBe('******3210');
  });

  it('sends SMS via gateway with exact template and validates status 000', async () => {
    const mockConfig = {
      get: vi.fn((key: string) => {
        const values: Record<string, unknown> = {
          SMS_SIMULATE: false,
          NODE_ENV: 'production',
          SMS_GATEWAY_URL:
            'http://trans.dreamztechnolgy.org/smsstatuswithid.aspx',
          SMS_GATEWAY_MOBILE: '9923400506',
          SMS_GATEWAY_PASSWORD: 'secret',
          SMS_GATEWAY_APIKEY: 'apikey123',
          SMS_GATEWAY_PEID: 'peid123',
          SMS_GATEWAY_TEMPLATE_ID: 'tmpl123',
          SMS_GATEWAY_SENDER_ID: 'PGINF',
        };
        return values[key];
      }),
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: '000',
          statusdesc: 'success',
          messageid: 'msg-42',
        }),
        { status: 200 },
      ),
    );

    const smsService = new SmsOtpService(mockConfig as any);
    const result = await smsService.sendVerificationOtp('9876543210', '4829');

    expect(result).toEqual({
      success: true,
      messageId: 'msg-42',
      phone: '9876543210',
    });

    const calledUrl = new URL(String(fetchSpy.mock.calls[0]?.[0]));
    expect(calledUrl.searchParams.get('to')).toBe('9876543210');
    expect(calledUrl.searchParams.get('senderid')).toBe('PGINF');
    expect(calledUrl.searchParams.get('msg')).toBe(
      'Dear User, PGInfo login verification code is 4829. This OTP is valid for 5 minutes. Do not share this OTP with anyone. - PGInfo',
    );
    fetchSpy.mockRestore();
  });

  it('throws 502 AppError when gateway returns non-000 status', async () => {
    const mockConfig = {
      get: vi.fn((key: string) => {
        const values: Record<string, unknown> = {
          SMS_SIMULATE: false,
          NODE_ENV: 'production',
          SMS_GATEWAY_URL:
            'http://trans.dreamztechnolgy.org/smsstatuswithid.aspx',
          SMS_GATEWAY_MOBILE: '9923400506',
          SMS_GATEWAY_PASSWORD: 'secret',
          SMS_GATEWAY_APIKEY: 'apikey123',
          SMS_GATEWAY_PEID: 'peid123',
          SMS_GATEWAY_TEMPLATE_ID: 'tmpl123',
          SMS_GATEWAY_SENDER_ID: 'PGINF',
        };
        return values[key];
      }),
    };

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ status: '101', statusdesc: 'Invalid API Key' }),
          { status: 200 },
        ),
      );

    const smsService = new SmsOtpService(mockConfig as any);
    await expect(
      smsService.sendVerificationOtp('9876543210', '1234'),
    ).rejects.toMatchObject({
      status: 502,
      errorCode: 'SMS_GATEWAY_ERROR',
    });
    fetchSpy.mockRestore();
  });
});

describe('OtpService', () => {
  let otpService: OtpService;
  let mockPrisma: any;
  let mockSmsOtpService: any;
  let mockConfig: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      otpVerification: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: 'otp-rec-1' }),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        updateManyAndReturn: vi.fn(),
      },
      $queryRaw: vi.fn(),
      $transaction: vi.fn(async (cb: (tx: any) => Promise<unknown>) =>
        cb(mockPrisma),
      ),
    };

    mockConfig = {
      get: vi.fn((key: string) => {
        const map: Record<string, unknown> = {
          JWT_SECRET: 'otp-unit-test-signing-key',
          OTP_EXPIRY_SECONDS: 300,
          OTP_RESEND_COOLDOWN_SECONDS: 30,
          OTP_MAX_ATTEMPTS: 5,
        };
        return map[key];
      }),
    };

    mockSmsOtpService = {
      sendVerificationOtp: vi.fn().mockResolvedValue({
        success: true,
        messageId: 'msg-1',
        phone: '9876543210',
      }),
    };

    otpService = new OtpService(mockPrisma, mockConfig, mockSmsOtpService);
  });

  it('rejects LOGIN OTP when no user matches mobile', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(
      otpService.sendOtp({ mobile: '9876543210', purpose: 'LOGIN' }),
    ).rejects.toThrow(NotFoundError);
    expect(mockSmsOtpService.sendVerificationOtp).not.toHaveBeenCalled();
  });

  it('rejects REGISTER OTP when mobile is already registered', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });
    await expect(
      otpService.sendOtp({ mobile: '9876543210', purpose: 'REGISTER' }),
    ).rejects.toThrow(ConflictError);
    expect(mockSmsOtpService.sendVerificationOtp).not.toHaveBeenCalled();
  });

  it('generates and sends a 4-digit OTP and records providerMessageId', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      isActive: true,
    });

    const result = await otpService.sendOtp({
      mobile: '+91 9876543210',
      purpose: 'LOGIN',
    });

    expect(result.success).toBe(true);
    expect(result.mobile).toBe('9876543210');
    expect(result.maskedMobile).toBe('******3210');
    expect(result.expiresInSeconds).toBe(300);
    expect(result.resendAfterSeconds).toBe(30);
    expect(mockSmsOtpService.sendVerificationOtp).toHaveBeenCalledWith(
      '9876543210',
      expect.stringMatching(/^\d{4}$/),
    );
  });

  it('enforces resend cooldown window', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      isActive: true,
    });
    mockPrisma.otpVerification.findMany.mockResolvedValue([
      {
        id: 'prev-1',
        createdAt: new Date(Date.now() - 10_000), // 10s ago (< 30s cooldown)
        invalidatedAt: null,
        providerMessageId: 'msg-prev',
      },
    ]);

    await expect(
      otpService.sendOtp({ mobile: '9876543210', purpose: 'LOGIN' }),
    ).rejects.toMatchObject({
      status: 429,
      errorCode: 'OTP_COOLDOWN',
    });
  });

  it('verifies a valid 4-digit OTP and consumes it atomically', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      isActive: true,
    });

    let sentOtp = '';
    mockSmsOtpService.sendVerificationOtp.mockImplementation(
      async (_phone: string, otp: string) => {
        sentOtp = otp;
        return { success: true, messageId: 'm1', phone: '9876543210' };
      },
    );

    let storedRecord: any = null;
    mockPrisma.otpVerification.create.mockImplementation(
      async ({ data }: any) => {
        storedRecord = { id: 'otp-1', attempts: 0, ...data };
        return storedRecord;
      },
    );

    await otpService.sendOtp({ mobile: '9876543210', purpose: 'LOGIN' });
    expect(storedRecord.otpHash).toMatch(/^hmac-v1:[a-f0-9]{64}$/);
    mockPrisma.otpVerification.findFirst.mockResolvedValue(storedRecord);

    const verifiedMobile = await otpService.verifyAndConsumeOtp(
      '9876543210',
      sentOtp,
      'LOGIN',
    );
    expect(verifiedMobile).toBe('9876543210');
    expect(mockPrisma.otpVerification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'otp-1',
          consumedAt: null,
          invalidatedAt: null,
          attempts: { lt: 5 },
        }),
      }),
    );
  });

  it('rejects expired OTP', async () => {
    mockPrisma.otpVerification.findFirst.mockResolvedValue({
      id: 'otp-expired',
      mobile: '9876543210',
      purpose: 'LOGIN',
      otpHash: 'deadbeef',
      salt: 'salt',
      attempts: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      otpService.verifyAndConsumeOtp('9876543210', '1234', 'LOGIN'),
    ).rejects.toMatchObject({ status: 401, errorCode: 'OTP_EXPIRED' });
  });

  it('counts failed guesses atomically and rejects the last allowed attempt', async () => {
    mockPrisma.otpVerification.findFirst.mockResolvedValue({
      id: 'otp-attempts',
      otpHash: '00'.repeat(32),
      salt: 'salt',
      attempts: 3,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 30_000),
    });
    mockPrisma.otpVerification.updateManyAndReturn.mockResolvedValue([
      { attempts: 5 },
    ]);

    await expect(
      otpService.verifyAndConsumeOtp('9876543210', '1234', 'LOGIN'),
    ).rejects.toMatchObject({
      status: 429,
      errorCode: 'OTP_ATTEMPTS_EXCEEDED',
    });
    expect(mockPrisma.otpVerification.updateManyAndReturn).toHaveBeenCalledWith(
      {
        where: expect.objectContaining({
          attempts: { lt: 5 },
          consumedAt: null,
        }),
        data: { attempts: { increment: 1 } },
        select: { attempts: true },
      },
    );
  });

  it('rejects non-4-digit OTP format', async () => {
    await expect(
      otpService.verifyAndConsumeOtp('9876543210', '123456', 'LOGIN'),
    ).rejects.toThrow(AppError);
  });
});
