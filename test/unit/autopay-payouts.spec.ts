import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { PayoutsService } from '../../src/modules/finance/application/payouts.service.js';
import { BankAccountCipher } from '../../src/modules/finance/infrastructure/bank-account-cipher.js';
import type { EnvConfig } from '../../src/config/index.js';

describe('Bank submissions for manual payouts', () => {
  let service: PayoutsService;
  let db: any;
  let gateway: any;
  let cipher: BankAccountCipher;
  const orgId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const propertyId = '00000000-0000-0000-0000-000000000003';
  const input = {
    ownerName: 'Fixture Owner',
    businessName: 'Fixture PG',
    email: 'owner@example.test',
    phone: '9876543210',
    businessType: 'individual' as const,
    accountNumber: '001234567890',
    ifscCode: 'HDFC0001234',
    propertyId,
  };

  beforeEach(() => {
    db = {
      $queryRaw: vi.fn(),
      $transaction: vi.fn((run) => run(db)),
      property: { findFirst: vi.fn().mockResolvedValue({ id: propertyId }) },
      landlordPayoutAccount: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(({ data }) => data),
      },
      auditLog: { create: vi.fn() },
    };
    gateway = { createLinkedAccount: vi.fn() };
    cipher = new BankAccountCipher({
      get: () => 'ab'.repeat(32),
    } as unknown as ConfigService<EnvConfig, true>);
    service = new PayoutsService(db, gateway, cipher);
  });

  it('stores ciphertext and returns only the masked bank number', async () => {
    const bank = await service.onboardOwner(input, orgId, userId);
    expect(bank).toMatchObject({
      status: 'PENDING',
      kycStatus: 'SUBMITTED',
      accountNumberMasked: '••••••••7890',
      alreadyExisted: false,
    });
    const stored = db.landlordPayoutAccount.create.mock.calls[0][0].data;
    expect(cipher.decrypt(stored.accountNumberEncrypted, bank.id)).toBe(
      input.accountNumber,
    );
    expect(() =>
      cipher.decrypt(stored.accountNumberEncrypted, 'other-id'),
    ).toThrow();
    expect(JSON.stringify(bank)).not.toContain(input.accountNumber);
    expect(gateway.createLinkedAccount).not.toHaveBeenCalled();
    expect(db.auditLog.create).toHaveBeenCalledOnce();
  });

  it('reuses an identical submission without rewriting the audit log', async () => {
    const prior = await service.onboardOwner(input, orgId, userId);
    const stored = db.landlordPayoutAccount.create.mock.calls[0][0].data;
    db.landlordPayoutAccount.findMany.mockResolvedValue([stored]);
    const result = await service.onboardOwner(input, orgId, userId);
    expect(result).toMatchObject({ id: prior.id, alreadyExisted: true });
    expect(db.landlordPayoutAccount.create).toHaveBeenCalledOnce();
    expect(db.auditLog.create).toHaveBeenCalledOnce();
  });
});
