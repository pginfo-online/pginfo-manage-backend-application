import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MandatesService } from '../../src/modules/finance/application/mandates.service.js';

describe('MandatesService (Rent Autopay Mandates & WhatsApp Invite)', () => {
  let service: MandatesService;
  let mockPrisma: any;
  let mockRazorpayAdapter: any;
  let mockPayoutsService: any;
  let mockWhatsAppAdapter: any;

  const orgId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const tenantId = '00000000-0000-0000-0000-000000000010';
  const propertyId = '00000000-0000-0000-0000-000000000020';
  const unitId = '00000000-0000-0000-0000-000000000030';

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ acquired: true }]),
      $transaction: vi.fn((fn) => fn(mockPrisma)),
      resident: {
        findFirst: vi.fn().mockResolvedValue({
          id: tenantId,
          organizationId: orgId,
          propertyId,
          roomId: unitId,
          bedId: '00000000-0000-0000-0000-000000000040',
          firstName: 'Aarav',
          lastName: 'Patel',
          mobile: '9876543210',
          whatsappNumber: '9876543210',
          status: 'ACTIVE',
          property: { id: propertyId, name: 'Grand PG' },
          room: { id: unitId, roomNumber: '204' },
        }),
      },
      room: {
        findFirst: vi.fn().mockResolvedValue({ id: unitId, roomNumber: '204' }),
      },
      tenantMandate: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    mockRazorpayAdapter = {
      canCreateMoneyLinks: vi.fn().mockReturnValue(true),
      createPlan: vi.fn().mockResolvedValue({ planId: 'plan_rent_123' }),
      createSubscription: vi.fn().mockResolvedValue({
        subscriptionId: 'sub_rent_456',
        planId: 'plan_rent_123',
        status: 'created',
        shortUrl: 'https://rzp.io/i/auth_mandate_456',
        totalCount: 11,
        paidCount: 0,
      }),
      cancelSubscription: vi
        .fn()
        .mockResolvedValue({ id: 'sub_rent_456', status: 'cancelled' }),
    };

    mockPayoutsService = {
      getActivePayoutAccount: vi.fn().mockResolvedValue({
        id: 'payout-1',
        razorpayAccountId: 'acc_route_landlord',
      }),
    };

    mockWhatsAppAdapter = {
      send: vi.fn().mockResolvedValue({ success: true, messageId: 'wa_123' }),
    };

    service = new MandatesService(
      mockPrisma as any,
      mockRazorpayAdapter as any,
      mockPayoutsService as any,
      mockWhatsAppAdapter as any,
    );
  });

  it('should create a recurring mandate subscription and return WhatsApp notification payload', async () => {
    mockPrisma.tenantMandate.create.mockImplementation(({ data }: any) => ({
      id: 'mandate-1',
      ...data,
    }));

    const result = await service.createMandate(
      {
        tenantId,
        unitId,
        rentAmount: 2500000, // ₹25,000 in paise
        billingDay: 5,
        tenureMonths: 11,
        mandateChannel: 'UPI',
        sendWhatsAppNotification: true,
      },
      orgId,
      userId,
    );

    expect(result.subscriptionId).toBe('sub_rent_456');
    expect(result.shortUrl).toBe('https://rzp.io/i/auth_mandate_456');
    expect(result.rentAmountRupees).toBe(25000);
    expect(result.billingDay).toBe(5);
    expect(result.notificationSent).toBe(true);

    // Verify WhatsApp payload
    expect(result.whatsappPayload.to).toBe('9876543210');
    expect(result.whatsappPayload.message).toContain('₹25,000');
    expect(result.whatsappPayload.message).toContain(
      'https://rzp.io/i/auth_mandate_456',
    );
    expect(mockWhatsAppAdapter.send).toHaveBeenCalled();

    // Verify Razorpay plan creation
    expect(mockRazorpayAdapter.createPlan).toHaveBeenCalledWith({
      name: expect.stringContaining('204'),
      amountPaise: 2500000,
      currency: 'INR',
      description: expect.any(String),
      notes: expect.any(Object),
    });

    expect(result.nextChargeDate.getUTCDate()).toBe(5);
    expect(result.nextChargeDate.getTime()).toBeGreaterThan(Date.now());

    // Verify subscription creation
    expect(mockRazorpayAdapter.createSubscription).toHaveBeenCalledWith({
      planId: 'plan_rent_123',
      totalCount: 11,
      customerNotify: 1,
      startAt: Math.floor(result.nextChargeDate.getTime() / 1000),
      notes: expect.any(Object),
    });

    // Verify database record
    expect(mockPrisma.tenantMandate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: orgId,
          tenantId,
          rentAmount: 2500000,
          billingDay: 5,
          status: 'CREATED',
          collectionMode: 'AUTOPAY',
        }),
      }),
    );
  });

  it('should reject mandate generation if tenant already has an active mandate', async () => {
    mockPrisma.tenantMandate.findFirst.mockResolvedValue({
      id: 'existing-mandate',
      status: 'ACTIVE',
    });

    await expect(
      service.createMandate(
        {
          tenantId,
          unitId,
          rentAmount: 2500000,
          billingDay: 5,
          tenureMonths: 11,
          mandateChannel: 'UPI',
          sendWhatsAppNotification: false,
        },
        orgId,
        userId,
      ),
    ).rejects.toThrow('An active or pending mandate already exists');
  });

  it('should cancel mandate and set collectionMode to MANUAL_COLLECTION', async () => {
    mockPrisma.tenantMandate.findFirst.mockResolvedValue({
      id: 'mandate-1',
      organizationId: orgId,
      razorpaySubscriptionId: 'sub_rent_456',
      status: 'ACTIVE',
    });
    mockPrisma.tenantMandate.update.mockResolvedValue({
      id: 'mandate-1',
      status: 'REVOKED',
      collectionMode: 'MANUAL_COLLECTION',
    });

    const result = await service.cancelMandate('mandate-1', orgId, userId);
    expect(mockRazorpayAdapter.cancelSubscription).toHaveBeenCalledWith(
      'sub_rent_456',
      false,
    );
    expect(result.status).toBe('REVOKED');
    expect(result.collectionMode).toBe('MANUAL_COLLECTION');
  });
});
