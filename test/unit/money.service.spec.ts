import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MoneyService } from '../../src/modules/finance/application/money.service.js';
import {
  moneyPaymentSchema,
  moneyDate,
  moneyQuerySchema,
  packageSchema,
  offerSchema,
} from '../../src/modules/finance/api/dto/money.dto.js';

const residentId = '00000000-0000-4000-8000-000000000001';
const billId = '00000000-0000-4000-8000-000000000002';
const input = () =>
  moneyPaymentSchema.parse({
    residentId,
    amount: 9000,
    mode: 'CASH',
    collectionDate: '2026-01-01',
    idempotencyKey: '00000000-0000-4000-8000-000000000003',
    allocations: [{ billingRecordId: billId, amount: 9000 }],
  });
describe('Money validation', () => {
  it('rejects impossible dates, duplicate allocations, and mismatched sums', () => {
    expect(moneyDate.safeParse('2026-02-30').success).toBe(false);
    expect(moneyDate.safeParse('2026-02-28').success).toBe(true);
    const dto = input();
    expect(moneyPaymentSchema.safeParse({ ...dto, amount: 9001 }).success).toBe(
      false,
    );
    expect(
      moneyPaymentSchema.safeParse({
        ...dto,
        amount: 18000,
        allocations: [...dto.allocations, ...dto.allocations],
      }).success,
    ).toBe(false);
    expect(
      moneyPaymentSchema.safeParse({ ...dto, mode: 'RAZORPAY' }).success,
    ).toBe(false);
  });
  it('requires an amount for fixed packages and custom minimums', () => {
    expect(
      packageSchema.safeParse({
        name: 'Rent',
        propertyType: 'PG',
        category: 'Rent',
        billing: 'FIXED',
        amount: 0,
      }).success,
    ).toBe(false);
    expect(
      packageSchema.safeParse({
        name: 'Power',
        propertyType: 'PG',
        category: 'Electricity',
        billing: 'VARIABLE',
        amount: 0,
      }).success,
    ).toBe(true);
    expect(
      offerSchema.safeParse({
        amount: 10,
        validTill: '2026-12-01',
        minimumPayment: 'CUSTOM',
        description: 'offer',
      }).success,
    ).toBe(false);
  });
});
describe('Money payment consistency', () => {
  let db: any, service: MoneyService;
  beforeEach(() => {
    db = {
      resident: { findFirst: vi.fn().mockResolvedValue({ id: residentId }) },
      $queryRaw: vi.fn().mockResolvedValue([{ id: residentId }]),
      $executeRaw: vi.fn().mockResolvedValue(1),
      payment: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        createManyAndReturn: vi
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve(data.map((p: any) => ({ id: 'payment-1', ...p }))),
          ),
      },
      billingRecord: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: billId,
            amount: 10000,
            paidAmount: 0,
            status: 'ISSUED',
            version: 1,
            _count: { rentInvoices: 0 },
          },
        ]),
        update: vi.fn(),
      },
      discountOffer: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      rentInvoice: { updateMany: vi.fn() },
      auditLog: { create: vi.fn() },
    };
    db.$transaction = vi.fn((fn) => fn(db));
    service = new MoneyService(db);
  });
  it('records exact allocations, optimistic versions, and an audit entry', async () => {
    const result = await service.record(input(), 'org', 'user');
    expect(result.payments).toHaveLength(1);
    expect(db.$executeRaw).toHaveBeenCalledOnce();
    expect(db.$executeRaw.mock.calls[0][0].values).toContain('PARTIALLY_PAID');
    expect(db.$executeRaw.mock.calls[0][0].sql).toContain(
      'b.version=v.version',
    );
    expect(db.auditLog.create).toHaveBeenCalledOnce();
  });
  it('applies an eligible discount exactly once in the same transaction', async () => {
    db.discountOffer.findFirst.mockResolvedValue({
      id: 'offer',
      amount: 1000,
      minimumPayment: 'FULL',
    });
    const result = await service.record(input(), 'org', 'user');
    expect(result.discount).toBe(1000);
    expect(db.$executeRaw.mock.calls[0][0].values).toContain('PAID');
    expect(db.$executeRaw.mock.calls[0][0].values).toContain(1000);
    expect(db.discountOffer.update).toHaveBeenCalledOnce();
  });
  it('does not apply a discount below its custom payment minimum', async () => {
    db.discountOffer.findFirst.mockResolvedValue({
      id: 'offer',
      amount: 1000,
      minimumPayment: 'CUSTOM',
      minimumAmount: 9500,
    });
    expect((await service.record(input(), 'org', 'user')).discount).toBe(0);
    expect(db.discountOffer.update).not.toHaveBeenCalled();
  });
  it('rejects a bill belonging to a different resident before writing', async () => {
    db.billingRecord.findMany.mockResolvedValue([]);
    await expect(service.record(input(), 'org', 'user')).rejects.toThrow();
    expect(db.payment.create).not.toHaveBeenCalled();
  });
  it('returns the prior payment after an ambiguous network failure', async () => {
    db.payment.findMany.mockResolvedValue([
      {
        id: 'payment-1',
        amount: 9000,
        residentId,
        mode: 'CASH',
        billingRecordId: billId,
        collectionDate: new Date('2026-01-01'),
      },
    ]);
    expect((await service.record(input(), 'org', 'user')).replayed).toBe(true);
    expect(db.billingRecord.update).not.toHaveBeenCalled();
    await expect(
      service.record({ ...input(), amount: 8000 }, 'org', 'user'),
    ).rejects.toThrow();
  });
  it('accepts a partial collection and leaves its linked invoice open', async () => {
    db.billingRecord.findMany.mockResolvedValue([
      {
        id: billId,
        amount: 10000,
        paidAmount: 0,
        status: 'ISSUED',
        version: 1,
        _count: { rentInvoices: 1 },
      },
    ]);
    const result = await service.record(input(), 'org', 'user');
    expect(result.payments).toEqual([
      expect.objectContaining({ amount: 9000 }),
    ]);
    expect(db.rentInvoice.updateMany).not.toHaveBeenCalled();
  });
  it('exports in bounded batches and neutralizes spreadsheet formula injection', async () => {
    db.expense = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: '1',
          expenseDate: new Date('2026-01-01'),
          category: { name: 'Other' },
          property: { name: 'Fixture' },
          paymentMode: 'CASH',
          amount: 100,
          description: '=HYPERLINK("x")',
        },
      ]),
    };
    let csv = '';
    for await (const chunk of service.report(
      'expenses',
      'org',
      moneyQuerySchema.parse({}),
    ))
      csv += chunk;
    expect(csv).toContain("'=HYPERLINK");
    expect(db.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 500,
        where: expect.objectContaining({ organizationId: 'org' }),
      }),
    );
  });
});
