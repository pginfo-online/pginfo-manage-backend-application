import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { Monetary } from '../../finance/domain/monetary.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import type { ActivityQueryDto } from '../api/dto/activity.dto.js';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getActivity(orgId: string, query: ActivityQueryDto) {
    const where = {
      organizationId: orgId,
      entityType: query.entityType,
      entityId: query.entityId,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          action: true,
          metadata: true,
          createdAt: true,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return buildOffsetResponse(items, total, query.page, query.limit);
  }

  /**
   * Aggregates organization-wide or property-specific operational & financial metrics.
   */
  async getMetrics(
    orgId: string,
    propertyId?: string,
    month?: number,
    year?: number,
  ) {
    const propertyFilter = propertyId ? { id: propertyId } : {};
    const residentFilter = propertyId ? { propertyId } : {};
    const billingFilter = propertyId ? { propertyId } : {};
    const expenseFilter = propertyId ? { propertyId } : {};
    const complaintFilter = propertyId ? { propertyId } : {};

    const now = new Date();
    const selectedMonth = month ?? now.getMonth() + 1;
    const selectedYear = year ?? now.getFullYear();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    const monthStart = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

    const [
      propertiesCount,
      roomsCount,
      bedStats,
      activeResidentsCount,
      periodMoveIns,
      periodMoveOuts,
      pendingMoveIns,
      billingAggregates,
      currentDuesAggregate,
      futureDuesAggregate,
      monthBillingAggregate,
      paymentsAggregate,
      todayPaymentsAggregate,
      monthPaymentsAggregate,
      expensesAggregate,
      monthExpensesAggregate,
      securityDepositsAggregate,
      pendingDepositsAggregate,
      pendingComplaintsCount,
      periodComplaintsCreated,
      periodComplaintsResolved,
    ] = await this.prisma.$transaction([
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

      this.prisma.resident.count({
        where: {
          organizationId: orgId,
          moveInDate: { gte: monthStart, lte: monthEnd },
          ...residentFilter,
        },
      }),

      this.prisma.resident.count({
        where: {
          organizationId: orgId,
          moveOutDate: { gte: monthStart, lte: monthEnd },
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

      this.prisma.billingRecord.aggregate({
        where: {
          organizationId: orgId,
          status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
          dueDate: { lte: now },
          ...billingFilter,
        },
        _sum: { amount: true, paidAmount: true },
      }),

      this.prisma.billingRecord.aggregate({
        where: {
          organizationId: orgId,
          status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID'] },
          dueDate: { gt: now },
          ...billingFilter,
        },
        _sum: { amount: true, paidAmount: true },
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
          paidAmount: true,
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

      this.prisma.expense.aggregate({
        where: {
          organizationId: orgId,
          ...expenseFilter,
          expenseDate: { gte: monthStart, lte: monthEnd },
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

      this.prisma.billingRecord.aggregate({
        where: {
          organizationId: orgId,
          type: 'SECURITY_DEPOSIT',
          status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
          ...billingFilter,
        },
        _sum: { amount: true, paidAmount: true },
      }),

      // Pending complaints
      this.prisma.complaint.count({
        where: {
          organizationId: orgId,
          status: { not: 'RESOLVED' },
          ...complaintFilter,
        },
      }),

      this.prisma.complaint.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: monthStart, lte: monthEnd },
          ...complaintFilter,
        },
      }),

      this.prisma.complaint.count({
        where: {
          organizationId: orgId,
          status: 'RESOLVED',
          updatedAt: { gte: monthStart, lte: monthEnd },
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
    const monthOutstanding = Math.max(
      0,
      monthBilled - (monthBillingAggregate._sum.paidAmount ?? 0),
    );
    const totalCollected = paymentsAggregate._sum.amount ?? 0;
    const todayCollected = todayPaymentsAggregate._sum.amount ?? 0;
    const monthCollected = monthPaymentsAggregate._sum.amount ?? 0;
    const totalOutstanding = Math.max(
      0,
      totalBilled - (billingAggregates._sum.paidAmount ?? 0),
    );
    const totalExpenses = expensesAggregate._sum.amount ?? 0;
    const monthExpenses = monthExpensesAggregate._sum.amount ?? 0;
    const netCashflow = totalCollected - totalExpenses;
    const securityDepositsHeld =
      securityDepositsAggregate._sum.securityDeposit ?? 0;
    const pendingDeposits = Math.max(
      0,
      (pendingDepositsAggregate._sum.amount ?? 0) -
        (pendingDepositsAggregate._sum.paidAmount ?? 0),
    );
    const currentDues = Math.max(
      0,
      (currentDuesAggregate._sum.amount ?? 0) -
        (currentDuesAggregate._sum.paidAmount ?? 0),
    );
    const futureDues = Math.max(
      0,
      (futureDuesAggregate._sum.amount ?? 0) -
        (futureDuesAggregate._sum.paidAmount ?? 0),
    );

    return {
      period: { month: selectedMonth, year: selectedYear },
      operational: {
        totalProperties: propertiesCount,
        totalRooms: roomsCount,
        totalBeds,
        occupiedBeds,
        availableBeds,
        occupancyRate,
        currentResidents: activeResidentsCount,
        upcomingMoveIns: pendingMoveIns,
        periodMoveIns,
        periodMoveOuts,
        pendingComplaints: pendingComplaintsCount,
        periodComplaintsCreated,
        periodComplaintsResolved,
      },
      financial: {
        todayCollectedPaise: todayCollected,
        todayCollectedFormatted: Monetary.formatINR(todayCollected),
        monthCollectedPaise: monthCollected,
        monthCollectedFormatted: Monetary.formatINR(monthCollected),
        monthBilledPaise: monthBilled,
        monthBilledFormatted: Monetary.formatINR(monthBilled),
        monthOutstandingPaise: monthOutstanding,
        monthOutstandingFormatted: Monetary.formatINR(monthOutstanding),
        totalBilledPaise: totalBilled,
        totalBilledFormatted: Monetary.formatINR(totalBilled),
        totalCollectedPaise: totalCollected,
        totalCollectedFormatted: Monetary.formatINR(totalCollected),
        outstandingBalancePaise: totalOutstanding,
        outstandingBalanceFormatted: Monetary.formatINR(totalOutstanding),
        totalExpensesPaise: totalExpenses,
        totalExpensesFormatted: Monetary.formatINR(totalExpenses),
        monthExpensesPaise: monthExpenses,
        monthExpensesFormatted: Monetary.formatINR(monthExpenses),
        netCashflowPaise: netCashflow,
        netCashflowFormatted: Monetary.formatINR(netCashflow),
        securityDepositsHeldPaise: securityDepositsHeld,
        securityDepositsHeldFormatted: Monetary.formatINR(securityDepositsHeld),
        pendingDepositsPaise: pendingDeposits,
        pendingDepositsFormatted: Monetary.formatINR(pendingDeposits),
        currentDuesPaise: currentDues,
        currentDuesFormatted: Monetary.formatINR(currentDues),
        futureDuesPaise: futureDues,
        futureDuesFormatted: Monetary.formatINR(futureDues),
      },
    };
  }
}
