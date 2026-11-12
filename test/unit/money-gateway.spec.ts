import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsService } from '../../src/modules/finance/application/payments.service.js';
import { MoneyLinksService } from '../../src/modules/finance/application/money-links.service.js';
import { RazorpayWebhookService } from '../../src/modules/finance/application/razorpay-webhook.service.js';

describe('Money gateway safety', () => {
  let db: any, payments: PaymentsService;
  beforeEach(() => {
    db = {
      payment: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'payment',
          amount: 100,
          organizationId: 'org',
          residentId: 'resident',
        }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'payment',
          amount: 100,
          organizationId: 'org',
          residentId: 'resident',
          version: 1,
          status: 'PENDING',
        }),
        update: vi
          .fn()
          .mockImplementation(({ data }) => ({ ...data, id: 'payment' })),
      },
      billingRecord: {
        aggregate: vi
          .fn()
          .mockResolvedValue({ _sum: { amount: 0, paidAmount: 0 } }),
      },
      auditLog: { create: vi.fn() },
      $queryRaw: vi.fn().mockResolvedValue([]),
    };
    db.$transaction = vi.fn((fn) => fn(db));
    payments = new PaymentsService(db, {} as any);
  });
  it('never looks up an unspecified order ID', async () => {
    expect(
      await payments.captureOnlinePayment({
        gatewayPaymentId: 'pay_1',
        amount: 100,
        currency: 'INR',
      }),
    ).toBeUndefined();
    expect(db.payment.findFirst).not.toHaveBeenCalled();
  });
  it('rejects amount and currency mismatches before touching the ledger', async () => {
    await expect(
      payments.captureOnlinePayment({
        orderId: 'order_1',
        gatewayPaymentId: 'pay_1',
        amount: 101,
        currency: 'INR',
      }),
    ).rejects.toThrow('does not match');
    await expect(
      payments.captureOnlinePayment({
        orderId: 'order_1',
        gatewayPaymentId: 'pay_1',
        amount: 100,
        currency: 'USD',
      }),
    ).rejects.toThrow('does not match');
    expect(db.payment.update).not.toHaveBeenCalled();
  });
  it('keeps a real captured payment for review when dues changed', async () => {
    const result = await payments.captureOnlinePayment({
      orderId: 'order_1',
      gatewayPaymentId: 'pay_1',
      amount: 100,
      currency: 'INR',
    });
    expect(result?.status).toBe('DISPUTED');
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'payment.reconciliation_required',
        }),
      }),
    );
  });
  it('does not allocate an already confirmed capture a second time', async () => {
    db.payment.findUniqueOrThrow.mockResolvedValue({
      id: 'payment',
      status: 'CONFIRMED',
      razorpayPaymentId: 'pay_1',
    });
    expect(
      (
        await payments.captureOnlinePayment({
          orderId: 'order_1',
          gatewayPaymentId: 'pay_1',
          amount: 100,
          currency: 'INR',
        })
      )?.status,
    ).toBe('CONFIRMED');
    expect(db.payment.update).not.toHaveBeenCalled();
  });
  it('does not interpret non-UUID references on unrelated payment links as internal IDs', async () => {
    db.payment.findFirst.mockResolvedValue(null);
    await payments.captureOnlinePayment({
      linkId: 'plink_1',
      referenceId: 'Invoice ABC',
      gatewayPaymentId: 'pay_1',
      amount: 100,
      currency: 'INR',
    });
    expect(db.payment.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ paymentLinkId: 'plink_1' }] },
    });
  });
});

describe('Expiring Money payment links', () => {
  it('fails clearly when gateway or webhook configuration is missing', async () => {
    const money = {
      paymentContext: vi.fn().mockResolvedValue({
        totalDues: 100,
        resident: { property: { name: 'Fixture' } },
      }),
    };
    const gateway = {
      canCreateMoneyLinks: vi.fn().mockReturnValue(false),
      createPaymentLink: vi.fn(),
    };
    const service = new MoneyLinksService(
      {} as any,
      gateway as any,
      money as any,
    );
    await expect(service.create('resident', 'org', 'user')).rejects.toThrow(
      'Configure Razorpay',
    );
    expect(gateway.createPaymentLink).not.toHaveBeenCalled();
  });
  it('creates a durable intent and disables automatic customer notifications', async () => {
    const intent = {
      id: 'intent',
      amount: 100,
      paymentLinkExpiresAt: new Date(Date.now() + 1800000),
    };
    const db: any = {
      resident: {},
      $queryRaw: vi.fn(),
      billingRecord: {
        aggregate: vi
          .fn()
          .mockResolvedValue({ _sum: { amount: 100, paidAmount: 0 } }),
      },
      payment: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(intent),
        update: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    };
    db.$transaction = vi.fn((fn) => fn(db));
    const gateway = {
      canCreateMoneyLinks: vi.fn().mockReturnValue(true),
      createPaymentLink: vi.fn().mockResolvedValue({
        paymentLinkId: 'plink_1',
        shortUrl: 'https://rzp.io/i/test',
      }),
    };
    const money = {
      paymentContext: vi.fn().mockResolvedValue({
        totalDues: 100,
        resident: {
          firstName: 'Fixture',
          mobile: '9999999999',
          property: { name: 'Fixture' },
        },
      }),
    };
    const service = new MoneyLinksService(db, gateway as any, money as any);
    expect((await service.create('resident', 'org', 'user')).paymentLink).toBe(
      'https://rzp.io/i/test',
    );
    expect(gateway.createPaymentLink).toHaveBeenCalledWith(
      expect.objectContaining({
        notify: false,
        requireConfigured: true,
        referenceId: 'intent',
        notes: expect.objectContaining({ moneyPaymentId: 'intent' }),
      }),
    );
  });
});

describe('Authoritative Money link webhook routing', () => {
  it('routes signed payment_link.paid payloads and retries prior failed events', async () => {
    const db: any = {
      webhookEvent: {
        findUnique: vi.fn().mockResolvedValue({ status: 'FAILED' }),
        update: vi.fn(),
        create: vi.fn(),
      },
    };
    const payments = { captureOnlinePayment: vi.fn() };
    const service = new RazorpayWebhookService(
      db,
      { verifyWebhookSignature: () => true } as any,
      { get: () => 3000 } as any,
      undefined,
      undefined,
      payments as any,
    );
    await service.handleWebhook(
      JSON.stringify({
        id: 'evt_link',
        event: 'payment_link.paid',
        payload: {
          payment_link: { entity: { id: 'plink_1', reference_id: 'ref' } },
          payment: {
            entity: {
              id: 'pay_1',
              status: 'captured',
              amount: 100,
              currency: 'INR',
            },
          },
        },
      }),
      'signature',
    );
    expect(payments.captureOnlinePayment).toHaveBeenCalledWith({
      linkId: 'plink_1',
      referenceId: 'ref',
      gatewayPaymentId: 'pay_1',
      amount: 100,
      currency: 'INR',
    });
    expect(db.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SUCCESS', error: null }),
      }),
    );
  });
});
