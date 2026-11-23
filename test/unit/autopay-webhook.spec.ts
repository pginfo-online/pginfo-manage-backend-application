import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RazorpayWebhookService } from '../../src/modules/finance/application/razorpay-webhook.service.js';

describe('RazorpayWebhookService (Autopay Webhook Engine & Route Transfers)', () => {
  let service: RazorpayWebhookService;
  let mockPrisma: any;
  let mockRazorpayAdapter: any;
  let mockConfig: any;
  let mockWhatsAppAdapter: any;
  let mockEmailAdapter: any;
  let mockMoneyLinks: any;

  const orgId = '00000000-0000-0000-0000-000000000001';
  const tenantId = '00000000-0000-0000-0000-000000000010';
  const propertyId = '00000000-0000-0000-0000-000000000020';
  const mandateId = '00000000-0000-0000-0000-000000000050';
  const landlordAccountId = 'acc_landlord_route_999';

  beforeEach(() => {
    mockPrisma = {
      webhookEvent: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'evt-rec-1' }),
      },
      tenantMandate: {
        findUnique: vi.fn().mockResolvedValue({
          id: mandateId,
          organizationId: orgId,
          tenantId,
          propertyId,
          unitId: 'unit-1',
          rentAmount: 2500000, // ₹25,000
          billingDay: 5,
          status: 'CREATED',
          razorpaySubscriptionId: 'sub_test_123',
          tenant: {
            id: tenantId,
            firstName: 'Aarav',
            lastName: 'Patel',
            mobile: '9876543210',
            whatsappNumber: '9876543210',
            email: 'aarav@example.com',
          },
          property: { id: propertyId, name: 'Royal Residency' },
          unit: { roomNumber: '101' },
          landlordPayoutAccount: {
            razorpayAccountId: landlordAccountId,
            status: 'ACTIVE',
            kycStatus: 'VERIFIED',
            metadata: { routeProductId: 'acc_prd_123' },
            phone: '9123456789',
            beneficiaryName: 'Mr. Landlord',
          },
        }),
        update: vi.fn().mockResolvedValue({ id: mandateId, status: 'ACTIVE' }),
      },
      rentInvoice: {
        findUnique: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        upsert: vi.fn().mockResolvedValue({
          id: 'inv-1',
          status: 'PAID',
          invoiceNumber: 'INV-202611-AARAV',
        }),
        update: vi.fn().mockResolvedValue({ id: 'inv-1' }),
      },
      billingRecord: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      payment: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'pay-db-1' }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      $queryRaw: vi.fn(),
      $transaction: vi.fn().mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      }),
    };

    mockRazorpayAdapter = {
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
      transferPayment: vi.fn().mockResolvedValue({
        transferId: 'trf_split_777',
        accountId: landlordAccountId,
        amount: 2497000, // ₹24,970 (₹25,000 - ₹30 fee)
        status: 'processed',
      }),
    };

    mockMoneyLinks = {
      create: vi.fn().mockResolvedValue({
        paymentLink: 'https://rzp.io/i/fallback_instant',
      }),
    };

    mockConfig = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'PLATFORM_FEE_PAISE') return 3000; // ₹30 fee
        return null;
      }),
    };

    mockWhatsAppAdapter = {
      send: vi.fn().mockResolvedValue({ success: true, messageId: 'wa_ok' }),
    };

    mockEmailAdapter = {
      send: vi.fn().mockResolvedValue({ success: true }),
    };

    service = new RazorpayWebhookService(
      mockPrisma as any,
      mockRazorpayAdapter as any,
      mockConfig as any,
      mockWhatsAppAdapter as any,
      mockEmailAdapter as any,
      undefined,
      mockMoneyLinks,
    );
  });

  it('should reject webhook with 401 Unauthorized when signature is invalid', async () => {
    mockRazorpayAdapter.verifyWebhookSignature.mockReturnValue(false);

    await expect(
      service.handleWebhook(
        JSON.stringify({ event: 'subscription.charged' }),
        'invalid_sig',
      ),
    ).rejects.toThrow('Invalid webhook signature');
  });

  it('should handle duplicate webhook events idempotently', async () => {
    mockPrisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'evt-1',
      eventId: 'evt_test_duplicate',
      status: 'SUCCESS',
      processedAt: new Date(),
    });

    const payload = JSON.stringify({
      id: 'evt_test_duplicate',
      event: 'subscription.charged',
      payload: {},
    });

    const result = await service.handleWebhook(payload, 'valid_sig');
    expect(result.status).toBe('already_processed');
    expect(mockRazorpayAdapter.transferPayment).not.toHaveBeenCalled();
  });

  it('should handle subscription.authenticated: activate mandate and store references', async () => {
    const rawPayload = JSON.stringify({
      id: 'evt_auth_1',
      event: 'subscription.authenticated',
      payload: {
        subscription: {
          entity: {
            id: 'sub_test_123',
            customer_id: 'cust_abc_1',
            token_id: 'token_xyz_1',
          },
        },
        payment: {
          entity: {
            id: 'pay_token_auth',
            bank: 'HDFC Bank',
            acquirer_data: {
              bank_transaction_id: 'bank_ref_9999',
            },
          },
        },
      },
    });

    const result = await service.handleWebhook(rawPayload, 'valid_sig');
    expect(result.received).toBe(true);
    expect(result.event).toBe('subscription.authenticated');

    expect(mockPrisma.tenantMandate.update).toHaveBeenCalledWith({
      where: { id: mandateId },
      data: expect.objectContaining({
        status: 'ACTIVE',
        razorpayCustomerId: 'cust_abc_1',
        razorpayTokenId: 'token_xyz_1',
        bankReference: 'bank_ref_9999',
        collectionMode: 'AUTOPAY',
      }),
    });
  });

  it('should handle subscription.charged: route transfer (amount - platform_fee) to landlord & mark invoice PAID', async () => {
    mockPrisma.billingRecord.findFirst.mockResolvedValue({
      id: 'bill-1',
      amount: 2500000,
      paidAmount: 0,
      status: 'ISSUED',
      version: 1,
    });
    const rawPayload = JSON.stringify({
      id: 'evt_charge_1',
      event: 'subscription.charged',
      payload: {
        subscription: {
          entity: {
            id: 'sub_test_123',
            paid_count: 1,
          },
        },
        payment: {
          entity: {
            id: 'pay_charged_555',
            amount: 2500000, // ₹25,000
            status: 'captured',
            subscription_id: 'sub_test_123',
          },
        },
      },
    });

    const result = await service.handleWebhook(rawPayload, 'valid_sig');
    expect(result.received).toBe(true);

    // Verify invoice upsert
    expect(mockPrisma.rentInvoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: 'PAID',
          amount: 2500000,
          platformFee: 3000, // ₹30 retained
          transferAmount: 2497000, // ₹24,970 transferred
          collectionType: 'AUTOPAY',
          razorpayPaymentId: 'pay_charged_555',
        }),
      }),
    );

    // Verify Razorpay Route transfer
    expect(mockRazorpayAdapter.transferPayment).toHaveBeenCalledWith(
      'pay_charged_555',
      {
        account: landlordAccountId,
        amount: 2497000, // exact split
        currency: 'INR',
        notes: expect.any(Object),
      },
    );

    // Verify notification sent
    expect(mockWhatsAppAdapter.send).toHaveBeenCalled();
  });

  it('does not transfer a capture when the rent due was already paid by another method', async () => {
    mockPrisma.billingRecord.findFirst.mockResolvedValue({
      id: 'bill-1',
      amount: 2500000,
      paidAmount: 2500000,
      status: 'PAID',
      version: 2,
    });
    await service.handleWebhook(
      JSON.stringify({
        id: 'evt_charge_overpaid',
        event: 'subscription.charged',
        payload: {
          payment: {
            entity: {
              id: 'pay_overpaid',
              subscription_id: 'sub_test_123',
              amount: 2500000,
            },
          },
        },
      }),
      'valid_sig',
    );
    expect(mockPrisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DISPUTED' }),
      }),
    );
    expect(mockRazorpayAdapter.transferPayment).not.toHaveBeenCalled();
  });

  it('does not settle or transfer a gateway payment twice across webhook types', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({ id: 'existing-payment' });
    const raw = JSON.stringify({
      id: 'evt_capture_second_type',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_replayed',
            subscription_id: 'sub_test_123',
            amount: 2500000,
          },
        },
      },
    });
    await service.handleWebhook(raw, 'valid_sig');
    expect(mockPrisma.rentInvoice.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    expect(mockRazorpayAdapter.transferPayment).not.toHaveBeenCalled();
  });

  it('should handle payment.failed: mark invoice FAILED & send one-time fallback payment link', async () => {
    const rawPayload = JSON.stringify({
      id: 'evt_fail_1',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_999',
            subscription_id: 'sub_test_123',
            amount: 2500000,
            error_code: 'BAD_REQUEST_ERROR',
            error_description: 'Insufficient funds in customer bank account',
          },
        },
      },
    });

    mockPrisma.rentInvoice.upsert.mockResolvedValue({
      id: 'inv-1',
      status: 'FAILED',
    });
    const result = await service.handleWebhook(rawPayload, 'valid_sig');
    expect(result.received).toBe(true);

    expect(mockMoneyLinks.create).toHaveBeenCalledWith(tenantId, orgId);

    // Verify invoice updated with status FAILED and retryCount
    expect(mockPrisma.rentInvoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: 'FAILED',
          collectionType: 'FALLBACK_LINK',
          retryCount: 0,
          failureReason: 'Insufficient funds in customer bank account',
          fallbackPaymentUrl: 'https://rzp.io/i/fallback_instant',
        }),
      }),
    );

    // Verify fallback alert sent to tenant via WhatsApp
    expect(mockWhatsAppAdapter.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '9876543210',
        message: expect.stringContaining('https://rzp.io/i/fallback_instant'),
      }),
    );
  });

  it('should handle subscription.cancelled: revoke mandate and flag unit as MANUAL_COLLECTION', async () => {
    const rawPayload = JSON.stringify({
      id: 'evt_cancel_1',
      event: 'subscription.cancelled',
      payload: {
        subscription: {
          entity: {
            id: 'sub_test_123',
            status: 'cancelled',
          },
        },
      },
    });

    const result = await service.handleWebhook(rawPayload, 'valid_sig');
    expect(result.received).toBe(true);

    expect(mockPrisma.tenantMandate.update).toHaveBeenCalledWith({
      where: { id: mandateId },
      data: expect.objectContaining({
        status: 'REVOKED',
        collectionMode: 'MANUAL_COLLECTION',
        cancelledAt: expect.any(Date),
      }),
    });

    // Verify landlord was alerted
    expect(mockWhatsAppAdapter.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '9123456789',
        message: expect.stringContaining('MANUAL_COLLECTION'),
      }),
    );
  });
});
