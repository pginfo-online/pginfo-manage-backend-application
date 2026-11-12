import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Monetary } from '../../src/modules/finance/domain/monetary.js';
import { BillingService } from '../../src/modules/finance/application/billing.service.js';
import { RazorpayAdapter } from '../../src/modules/finance/infrastructure/razorpay.adapter.js';

describe('Finance & Monetary Domain', () => {
  it('Monetary toPaise and toRupees conversion', () => {
    expect(Monetary.toPaise(1500.5)).toBe(150050);
    expect(Monetary.toRupees(150050)).toBe(1500.5);
    expect(Monetary.toPaise(0)).toBe(0);
  });

  it('Monetary formatINR should format Indian currency string', () => {
    const formatted = Monetary.formatINR(1250000); // 12,500 INR
    expect(formatted).toContain('12,500');
  });

  it('Monetary calculateLateFee', () => {
    const fee = Monetary.calculateLateFee(5000, 5); // 50 INR daily for 5 days = 250 INR
    expect(fee).toBe(25000);
    expect(Monetary.calculateLateFee(5000, 0)).toBe(0);
  });
});

describe('RazorpayAdapter HMAC Signature Verification', () => {
  let adapter: RazorpayAdapter;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'RAZORPAY_KEY_SECRET') return 'test_secret_key_123';
        if (key === 'RAZORPAY_WEBHOOK_SECRET') return 'test_webhook_secret_123';
        return '';
      }),
    };
    adapter = new RazorpayAdapter(mockConfig as any);
  });

  it('should verify correct payment signature', () => {
    const orderId = 'order_ABC123';
    const paymentId = 'pay_XYZ789';

    // Generate expected signature
    const crypto = require('crypto');
    const validSignature = crypto
      .createHmac('sha256', 'test_secret_key_123')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = adapter.verifyPaymentSignature(
      orderId,
      paymentId,
      validSignature,
    );
    expect(isValid).toBe(true);

    const isInvalid = adapter.verifyPaymentSignature(
      orderId,
      paymentId,
      'tampered_signature',
    );
    expect(isInvalid).toBe(false);
  });
});

describe('BillingService Idempotency', () => {
  let service: BillingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([
          { generatedCount: 0, skippedCount: 1, totalAmount: 0 },
        ]),
      resident: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'res-1',
            propertyId: 'prop-1',
            monthlyRent: 800000,
            rentDueDay: 5,
            property: { rentDueDay: 1 },
          },
        ]),
      },
      billingRecord: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    service = new BillingService(mockPrisma as any);
  });

  it('should skip duplicate dues when idempotency key or bill already exists', async () => {
    // Simulate bill already existing
    mockPrisma.billingRecord.findFirst.mockResolvedValue({
      id: 'existing-bill-id',
      idempotencyKey: 'rent_res-1_2026_11',
    });

    const result = await service.generateMonthlyDues(
      { billingMonth: 11, billingYear: 2026 },
      'org-1',
      'user-1',
    );

    expect(result.generatedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(mockPrisma.$queryRaw).toHaveBeenCalledOnce();
    expect(mockPrisma.$queryRaw.mock.calls[0][0].sql).toContain(
      'ON CONFLICT DO NOTHING',
    );
    expect(mockPrisma.billingRecord.create).not.toHaveBeenCalled();
  });
});
