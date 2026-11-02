import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { Monetary } from '../../finance/domain/monetary.js';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregates organization-wide or property-specific operational & financial metrics.
   */
  async getMetrics(orgId: string, propertyId?: string) {
    const propertyFilter = propertyId ? { id: propertyId } : {};
    const residentFilter = propertyId ? { propertyId } : {};
    const billingFilter = propertyId ? { propertyId } : {};
    const expenseFilter = propertyId ? { propertyId } : {};
    const complaintFilter = propertyId ? { propertyId } : {};

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      propertiesCount,
      roomsCount,
      bedStats,
      activeResidentsCount,
      pendingMoveIns,
      billingAggregates,
      monthBillingAggregate,
      paymentsAggregate,
      todayPaymentsAggregate,
      monthPaymentsAggregate,
      expensesAggregate,
      securityDepositsAggregate,
      pendingComplaintsCount,
    ] = await Promise.all([
      // Total properties
      this.prisma.property.count({
        where: { organizationId: orgId, status: 'ACTIVE', ...propertyFilter },
      }),

      // Total rooms
      this.prisma.room.count({
        where: {
          organizationId: orgId,
          status: { not: 'ARCHIVED' },
          ...(propertyId ? { propertyId } : {}),
        },
      }),

      // Beds breakdown
      this.prisma.bed.groupBy({
        by: ['status'],
        where: {
          organizationId: orgId,
          status: { not: 'ARCHIVED' },
          ...(propertyId ? { room: { propertyId } } : {}),
        },
        _count: true,
      }),

      // Active residents (including pending move-ins)
      this.prisma.resident.count({
        where: {
          organizationId: orgId,
          status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
          ...residentFilter,
        },
      }),

      // Upcoming move-ins
      this.prisma.resident.count({
        where: {
          organizationId: orgId,
          status: 'PENDING_MOVE_IN',
          ...residentFilter,
        },
      }),

      // Billed dues total
      this.prisma.billingRecord.aggregate({
        where: {
          organizationId: orgId,
          status: { not: 'CANCELLED' },
          ...billingFilter,
        },
        _sum: {
          amount: true,
          paidAmount: true,
        },
      }),

      // Current Month Billed dues
      this.prisma.billingRecord.aggregate({
        where: {
          organizationId: orgId,
          status: { not: 'CANCELLED' },
          ...billingFilter,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: {
          amount: true,
        },
      }),

      // Total collected payments
      this.prisma.payment.aggregate({
        where: {
          organizationId: orgId,
          status: 'CONFIRMED',
          ...(propertyId ? { resident: { propertyId } } : {}),
        },
        _sum: { amount: true },
      }),

      // Today collected payments
      this.prisma.payment.aggregate({
        where: {
          organizationId: orgId,
          status: 'CONFIRMED',
          ...(propertyId ? { resident: { propertyId } } : {}),
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { amount: true },
      }),

      // Month collected payments
      this.prisma.payment.aggregate({
        where: {
          organizationId: orgId,
          status: 'CONFIRMED',
          ...(propertyId ? { resident: { propertyId } } : {}),
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),

      // Operating expenses
      this.prisma.expense.aggregate({
        where: {
          organizationId: orgId,
          ...expenseFilter,
        },
        _sum: { amount: true },
      }),

      // Security deposits currently held
      this.prisma.resident.aggregate({
        where: {
          organizationId: orgId,
          status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
          ...residentFilter,
        },
        _sum: { securityDeposit: true },
      }),

      // Pending complaints
      this.prisma.complaint.count({
        where: {
          organizationId: orgId,
          status: { not: 'RESOLVED' },
          ...complaintFilter,
        },
      }),
    ]);

    // Compute bed counts
    let totalBeds = 0;
    let occupiedBeds = 0;
    let availableBeds = 0;

    for (const stat of bedStats) {
      totalBeds += stat._count;
      if (stat.status === 'OCCUPIED' || stat.status === 'RESERVED') {
        occupiedBeds += stat._count;
      }
      if (stat.status === 'AVAILABLE') availableBeds += stat._count;
    }

    const occupancyRate =
      totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    const totalBilled = billingAggregates._sum.amount ?? 0;
    const monthBilled = monthBillingAggregate._sum.amount ?? 0;
    const totalCollected = paymentsAggregate._sum.amount ?? 0;
    const todayCollected = todayPaymentsAggregate._sum.amount ?? 0;
    const monthCollected = monthPaymentsAggregate._sum.amount ?? 0;
    const totalOutstanding = Math.max(
      0,
      totalBilled - (billingAggregates._sum.paidAmount ?? 0),
    );
    const totalExpenses = expensesAggregate._sum.amount ?? 0;
    const netCashflow = totalCollected - totalExpenses;
    const securityDepositsHeld =
      securityDepositsAggregate._sum.securityDeposit ?? 0;

    return {
      operational: {
        totalProperties: propertiesCount,
        totalRooms: roomsCount,
        totalBeds,
        occupiedBeds,
        availableBeds,
        occupancyRate,
        currentResidents: activeResidentsCount,
        upcomingMoveIns: pendingMoveIns,
        pendingComplaints: pendingComplaintsCount,
      },
      financial: {
        todayCollectedPaise: todayCollected,
        todayCollectedFormatted: Monetary.formatINR(todayCollected),
        monthCollectedPaise: monthCollected,
        monthCollectedFormatted: Monetary.formatINR(monthCollected),
        monthBilledPaise: monthBilled,
        monthBilledFormatted: Monetary.formatINR(monthBilled),
        totalBilledPaise: totalBilled,
        totalBilledFormatted: Monetary.formatINR(totalBilled),
        totalCollectedPaise: totalCollected,
        totalCollectedFormatted: Monetary.formatINR(totalCollected),
        outstandingBalancePaise: totalOutstanding,
        outstandingBalanceFormatted: Monetary.formatINR(totalOutstanding),
        totalExpensesPaise: totalExpenses,
        totalExpensesFormatted: Monetary.formatINR(totalExpenses),
        netCashflowPaise: netCashflow,
        netCashflowFormatted: Monetary.formatINR(netCashflow),
        securityDepositsHeldPaise: securityDepositsHeld,
        securityDepositsHeldFormatted: Monetary.formatINR(securityDepositsHeld),
      },
    };
  }
}
