import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResidentsService } from '../../src/modules/occupancy/application/residents.service.js';
import { BillingService } from '../../src/modules/finance/application/billing.service.js';
import { ConflictError } from '../../src/common/errors/index.js';

describe('Concurrency & Race Condition Defenses', () => {
  let residentsService: ResidentsService;
  let billingService: BillingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      property: {
        findFirst: vi.fn().mockResolvedValue({ id: 'prop-1', rentDueDay: 1 }),
      },
      bed: {
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        groupBy: vi.fn().mockResolvedValue([
          { status: 'OCCUPIED', _count: 1 },
          { status: 'AVAILABLE', _count: 1 },
        ]),
        findMany: vi.fn().mockResolvedValue([]),
      },
      room: {
        findFirst: vi.fn().mockResolvedValue({ id: 'room-1' }),
        update: vi.fn(),
      },
      resident: {
        create: vi
          .fn()
          .mockImplementation(({ data }: any) =>
            Promise.resolve({ id: `res-${Math.random()}`, ...data }),
          ),
        findMany: vi.fn(),
      },
      occupancyRecord: {
        create: vi.fn(),
      },
      billingRecord: {
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $queryRaw: vi.fn(),
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    residentsService = new ResidentsService(mockPrisma as any);
    billingService = new BillingService(mockPrisma as any);
  });

  it('Concurrent Bed Allocation: Prevents double allocation of the same bed', async () => {
    mockPrisma.bed.findFirst.mockResolvedValue({
      id: 'bed-1',
      roomId: 'room-1',
      bedNumber: 'A',
      residents: [],
    });
    let claimed = false;
    mockPrisma.bed.updateMany.mockImplementation(() => {
      if (claimed) return Promise.resolve({ count: 0 });
      claimed = true;
      return Promise.resolve({ count: 1 });
    });

    const candidate1 = residentsService.create(
      {
        propertyId: 'prop-1',
        roomId: 'room-1',
        bedId: 'bed-1',
        firstName: 'Candidate 1',
        mobile: '9876543210',
        monthlyRent: 800000,
        securityDeposit: 0,
        joiningDate: new Date('2026-11-01'),
        profession: 'STUDENT',
      },
      'org-1',
      'user-1',
    );

    const candidate2 = residentsService.create(
      {
        propertyId: 'prop-1',
        roomId: 'room-1',
        bedId: 'bed-1',
        firstName: 'Candidate 2',
        mobile: '9876543211',
        monthlyRent: 800000,
        securityDeposit: 0,
        joiningDate: new Date('2026-11-01'),
        profession: 'WORKING_PROFESSIONAL',
      },
      'org-1',
      'user-2',
    );

    const results = await Promise.allSettled([candidate1, candidate2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConflictError,
    );
  });

  it('Concurrent Billing Runs: atomic insert skips conflicting monthly dues', async () => {
    mockPrisma.resident.findMany.mockResolvedValue([
      {
        id: 'res-10',
        propertyId: 'prop-1',
        monthlyRent: 750000,
        rentDueDay: 1,
        property: { rentDueDay: 1 },
      },
    ]);

    let firstInserted = false;
    mockPrisma.$queryRaw.mockImplementation(() => {
      const generated = firstInserted ? 0 : 1;
      firstInserted = true;
      return Promise.resolve([
        {
          generatedCount: generated,
          skippedCount: 1 - generated,
          totalAmount: generated * 750000,
        },
      ]);
    });

    // Run two billing jobs concurrently
    const [run1, run2] = await Promise.all([
      billingService.generateMonthlyDues(
        { billingMonth: 12, billingYear: 2026 },
        'org-1',
        'user-1',
      ),
      billingService.generateMonthlyDues(
        { billingMonth: 12, billingYear: 2026 },
        'org-1',
        'user-1',
      ),
    ]);

    // One created, one skipped gracefully due to P2002 unique constraint
    expect(run1.generatedCount + run2.generatedCount).toBe(1);
    expect(run1.skippedCount + run2.skippedCount).toBe(1);
  });
});
