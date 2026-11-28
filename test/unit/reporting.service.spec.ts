import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from '../../src/modules/reporting/application/dashboard.service.js';
import { ExportService } from '../../src/modules/reporting/application/export.service.js';
import { confirmedCollectionLines } from '../../src/modules/finance/domain/collection-lines.js';

describe('DashboardService & ExportService', () => {
  let dashboardService: DashboardService;
  let exportService: ExportService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{
          totalBilled: 12000000n,
          totalOutstanding: 2000000n,
          rentDefaulters: 2n,
        }])
        .mockResolvedValueOnce([{ created: 4n, resolved: 1n }])
        .mockResolvedValueOnce([
          { dimension: 'Total', label: 'All', amount: 10000000n },
        ])
        .mockResolvedValueOnce([{ recent: 1n, week: 2n, older: 3n }]),
      $transaction: vi.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
      property: {
        count: vi.fn().mockResolvedValue(2),
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: 'p1', name: 'A', type: 'PG' }]),
      },
      room: {
        count: vi.fn().mockResolvedValue(10),
      },
      bed: {
        groupBy: vi.fn().mockResolvedValue([
          { status: 'OCCUPIED', _count: 15 },
          { status: 'AVAILABLE', _count: 5 },
        ]),
      },
      resident: {
        count: vi.fn().mockResolvedValue(15),
        groupBy: vi.fn().mockResolvedValue([
          { status: 'ACTIVE', _count: 12 },
          { status: 'NOTICE_PERIOD', _count: 3 },
        ]),
        aggregate: vi.fn().mockResolvedValue({
          _sum: { securityDeposit: 15000000 },
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'res-1',
            firstName: 'Sneha',
            lastName: 'Patil',
            mobile: '9876543210',
            email: 'sneha@example.com',
            monthlyRent: 800000,
            securityDeposit: 1000000,
            joiningDate: new Date('2026-10-01'),
            status: 'ACTIVE',
            property: { name: 'Sunrise PG' },
            room: { roomNumber: '101' },
            bed: { bedNumber: 'A' },
          },
        ]),
      },
      payment: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { amount: 10000000 },
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'pay-1',
            amount: 800000,
            mode: 'UPI',
            collectionDate: new Date('2026-10-05'),
            reference: 'UPI123456',
            resident: {
              firstName: 'Sneha',
              lastName: 'Patil',
              mobile: '9876543210',
              property: { name: 'Sunrise PG' },
            },
          },
        ]),
      },
      expense: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { amount: 3000000 },
        }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      complaint: {
        count: vi.fn().mockResolvedValue(3),
      },
      booking: {
        groupBy: vi
          .fn()
          .mockResolvedValue([{ status: 'CONFIRMED', _count: 4 }]),
      },
      lead: { count: vi.fn().mockResolvedValue(5) },
    };

    dashboardService = new DashboardService(mockPrisma as any);
    exportService = new ExportService(mockPrisma as any);
  });

  it('includes resident IDs in collection lines for overview property grouping', () => {
    expect(confirmedCollectionLines('org-1').sql).toContain('p.resident_id');
  });

  it('should compute operational and financial indicators accurately', async () => {
    const metrics = await dashboardService.getMetrics('org-1');

    // Operational
    expect(metrics.operational.totalProperties).toBe(2);
    expect(metrics.operational.totalRooms).toBe(10);
    expect(metrics.operational.totalBeds).toBe(20);
    expect(metrics.operational.occupiedBeds).toBe(15);
    expect(metrics.operational.availableBeds).toBe(5);
    expect(metrics.operational.occupancyRate).toBe(75);
    expect(metrics.operational.currentResidents).toBe(15);
    expect(metrics.operational.pendingComplaints).toBe(3);
    expect(metrics.operational.activeTenants).toBe(15);
    expect(metrics.operational.currentBookings).toBe(4);
    expect(metrics.operational.activeLeads).toBe(5);
    expect(metrics.operational.rentDefaulters).toBe(2);

    // Financial (1 INR = 100 paise)
    expect(metrics.financial.totalBilledPaise).toBe(12000000); // 1,20,000 INR
    expect(metrics.financial.totalCollectedPaise).toBe(10000000); // 1,00,000 INR
    expect(metrics.financial.outstandingBalancePaise).toBe(2000000); // 20,000 INR
    expect(metrics.financial.totalExpensesPaise).toBe(3000000); // 30,000 INR
    expect(metrics.financial.netCashflowPaise).toBe(7000000); // 70,000 INR
    await dashboardService.getMetrics('org-1');
    expect(mockPrisma.property.count).toHaveBeenCalledTimes(1);
  });

  it('lists dashboard properties without loading nested inventory', async () => {
    const result = await dashboardService.getProperties('org-1', {
      search: 'A',
      page: 1,
    });
    expect(result.items).toHaveLength(1);
    expect(result.hasMore).toBe(false);
    expect(mockPrisma.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, name: true, type: true },
        take: 21,
      }),
    );
  });

  it('exportCollectionsCsv should return valid CSV headers and data rows', async () => {
    const csv = await exportService.exportCollectionsCsv('org-1');
    expect(csv).toContain(
      'Payment ID,Date,Resident Name,Mobile,Property,Amount (INR),Mode,Reference',
    );
    expect(csv).toContain('Sneha Patil');
    expect(csv).toContain('8000'); // 8000 INR
  });

  it('exportResidentsCsv should return valid CSV rows', async () => {
    const csv = await exportService.exportResidentsCsv('org-1');
    expect(csv).toContain(
      'Resident ID,First Name,Last Name,Mobile,Email,Property,Room,Bed',
    );
    expect(csv).toContain('Sneha');
    expect(csv).toContain('Sunrise PG');
  });

  it('getOverview returns property cards, pending tasks, occupancy breakdown, journey, and issues', async () => {
    mockPrisma.$queryRaw = vi
      .fn()
      .mockResolvedValueOnce([{ rentDefaulters: 1n }])
      .mockResolvedValueOnce([{ created: 1n, resolved: 1n }])
      .mockResolvedValueOnce([
        { dimension: 'Total', label: 'All', amount: 500000n },
        { dimension: 'Total', label: 'Today', amount: 100000n },
        { dimension: 'Total', label: 'Period', amount: 500000n },
      ])
      .mockResolvedValueOnce([{ recent: 1n, week: 0n, older: 0n }])
      .mockResolvedValueOnce([{ propertyId: 'p1', amount: 500000n }]);

    mockPrisma.property.findMany.mockResolvedValue([
      { id: 'p1', name: 'Sunrise PG', type: 'PG', city: 'Bengaluru' },
    ]);
    mockPrisma.room.findMany = vi.fn().mockResolvedValue([
      {
        id: 'r1',
        propertyId: 'p1',
        isDisabledForRent: false,
        beds: [
          {
            id: 'b1',
            status: 'OCCUPIED',
            isDisabledForRent: false,
            residents: [{ id: 'res-1', status: 'ACTIVE' }],
            bookings: [],
          },
          {
            id: 'b2',
            status: 'AVAILABLE',
            isDisabledForRent: false,
            residents: [],
            bookings: [],
          },
        ],
      },
    ]);
    mockPrisma.resident.findMany.mockResolvedValue([
      {
        id: 'res-1',
        propertyId: 'p1',
        status: 'ACTIVE',
        idProofUrl: null,
        agreementUrl: null,
        email: null,
      },
    ]);
    mockPrisma.resident.aggregate.mockResolvedValue({
      _sum: { securityDeposit: 1000000, monthlyRent: 800000 },
      _count: 1,
    });
    mockPrisma.billingRecord = {
      groupBy: vi.fn().mockResolvedValue([
        { propertyId: 'p1', _sum: { amount: 500000, paidAmount: 0 } },
      ]),
    };
    mockPrisma.lead.groupBy = vi
      .fn()
      .mockResolvedValue([{ status: 'NEW', _count: 3 }]);
    mockPrisma.complaint.findMany = vi.fn().mockResolvedValue([
      {
        id: 'c1',
        status: 'RECEIVED',
        assignedTo: null,
        category: { name: 'Plumbing' },
      },
    ]);

    const overview = await dashboardService.getOverview('org-1');

    expect(overview.properties).toHaveLength(1);
    expect(overview.properties[0]).toMatchObject({
      id: 'p1',
      name: 'Sunrise PG',
      totalBeds: 2,
      occupiedBeds: 1,
      activeTenants: 1,
      pendingDuesPaise: 500000,
      monthCollectedPaise: 500000,
    });
    expect(overview.pendingTasks.tenantsWithoutIdProof).toBe(1);
    expect(overview.pendingTasks.tenantsWithoutAgreement).toBe(1);
    expect(overview.occupancyBreakdown.units.semiVacant).toBe(1);
    expect(overview.journey.leads.newCount).toBe(3);
    expect(overview.issuesOverview.byCategory).toEqual([
      { label: 'Plumbing', count: 1 },
    ]);
  });
});
