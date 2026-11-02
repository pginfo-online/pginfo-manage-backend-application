import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayoutsService } from '../../src/modules/finance/application/payouts.service.js';

describe('PayoutsService (Landlord Onboarding & Route)', () => {
  let service: PayoutsService;
  let mockPrisma: any;
  let mockRazorpayAdapter: any;

  const orgId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const propertyId = '00000000-0000-0000-0000-000000000003';

  beforeEach(() => {
    mockPrisma = {
      organization: {
        findUnique: vi.fn().mockResolvedValue({ id: orgId, name: 'Acme Properties' }),
      },
      property: {
        findFirst: vi.fn().mockResolvedValue({ id: propertyId, organizationId: orgId, name: 'Sunrise PG' }),
      },
      landlordPayoutAccount: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    mockRazorpayAdapter = {
      createLinkedAccount: vi.fn().mockResolvedValue({
        accountId: 'acc_route_12345',
        status: 'created',
        email: 'landlord@example.com',
      }),
    };

    service = new PayoutsService(mockPrisma as any, mockRazorpayAdapter as any);
  });

  it('should successfully onboard a landlord and create Razorpay Route sub-merchant account', async () => {
    mockPrisma.landlordPayoutAccount.findFirst.mockResolvedValue(null);
    mockPrisma.landlordPayoutAccount.create.mockImplementation(({ data }: any) => ({
      id: 'payout-acc-1',
      ...data,
    }));

    const result = await service.onboardOwner(
      {
        ownerName: 'Ramesh Sharma',
        email: 'ramesh@example.com',
        phone: '9876543210',
        businessName: 'Sharma Properties',
        businessType: 'individual',
        accountNumber: '123456789012',
        ifscCode: 'HDFC0001234',
        propertyId,
      },
      orgId,
      userId,
    );

    expect(result.accountId).toBe('acc_route_12345');
    expect(result.businessName).toBe('Sharma Properties');
    expect(result.accountNumberMasked).toBe('••••••••9012');
    expect(result.status).toBe('ACTIVE');
    expect(result.alreadyExisted).toBe(false);

    expect(mockRazorpayAdapter.createLinkedAccount).toHaveBeenCalledWith({
      email: 'ramesh@example.com',
      phone: '9876543210',
      legalBusinessName: 'Sharma Properties',
      businessType: 'individual',
      contactName: 'Ramesh Sharma',
      accountNumber: '123456789012',
      ifscCode: 'HDFC0001234',
      beneficiaryName: 'Ramesh Sharma',
      notes: expect.any(Object),
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });

  it('should return existing account idempotently if already registered', async () => {
    mockPrisma.landlordPayoutAccount.findFirst.mockResolvedValue({
      id: 'existing-payout-acc',
      razorpayAccountId: 'acc_route_existing',
      businessName: 'Sharma Properties',
      beneficiaryName: 'Ramesh Sharma',
      accountNumberMasked: '••••••••9012',
      ifscCode: 'HDFC0001234',
      status: 'ACTIVE',
      kycStatus: 'VERIFIED',
    });

    const result = await service.onboardOwner(
      {
        ownerName: 'Ramesh Sharma',
        email: 'ramesh@example.com',
        phone: '9876543210',
        businessName: 'Sharma Properties',
        businessType: 'individual',
        accountNumber: '123456789012',
        ifscCode: 'HDFC0001234',
        propertyId,
      },
      orgId,
      userId,
    );

    expect(result.alreadyExisted).toBe(true);
    expect(result.accountId).toBe('acc_route_existing');
    expect(mockRazorpayAdapter.createLinkedAccount).not.toHaveBeenCalled();
  });
});
