import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from '../../src/modules/reporting/application/dashboard.service.js';
import { ExportService } from '../../src/modules/reporting/application/export.service.js';

describe('DashboardService & ExportService', () => {
  let dashboardService: DashboardService;
  let exportService: ExportService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ count: 2n }])
        .mockResolvedValueOnce([])
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
      billingRecord: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { amount: 12000000, paidAmount: 10000000 },
        }),
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
});
