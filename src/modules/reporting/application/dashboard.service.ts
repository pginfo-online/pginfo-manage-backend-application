import { Prisma } from '@prisma/client';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { dateKeyInTimeZone } from '../../../common/time/property-date.js';
import { confirmedCollectionLines } from '../../finance/domain/collection-lines.js';
import { Monetary } from '../../finance/domain/monetary.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import type { ActivityQueryDto } from '../api/dto/activity.dto.js';
import type { DashboardPropertiesQueryDto } from '../api/dto/dashboard.dto.js';

type BillingAmount = bigint | Prisma.Decimal | null;

type BillingTotals = {
  totalBilled: BillingAmount;
  totalOutstanding: BillingAmount;
  periodBilled: BillingAmount;
  periodOutstanding: BillingAmount;
  pendingDeposits: BillingAmount;
  currentDues: BillingAmount;
  futureDues: BillingAmount;
  overdueDues: BillingAmount;
  weekDues: BillingAmount;
  pastDues: BillingAmount;
  todayDues: BillingAmount;
  rentDefaulters: bigint;
};

async function inBatches<T extends readonly PromiseLike<unknown>[]>(
  queries: T,
  batchSize = 8,
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const results: unknown[] = [];
  for (let index = 0; index < queries.length; index += batchSize) {
    results.push(
      ...(await Promise.all(queries.slice(index, index + batchSize))),
    );
  }
  return results as { [K in keyof T]: Awaited<T[K]> };
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly metricsCache = new Map<
    string,
    {
      expiresAt: number;
      value: Promise<Awaited<ReturnType<DashboardService['computeMetrics']>>>;
    }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async getProperties(orgId: string, query: DashboardPropertiesQueryDto) {
    const pageSize = 20;
    const rows = await this.prisma.property.findMany({
      where: {
        organizationId: orgId,
        status: 'ACTIVE',
        ...(query.search
          ? { name: { contains: query.search, mode: 'insensitive' } }
          : {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * pageSize,
      take: pageSize + 1,
      select: { id: true, name: true, type: true },
    });
    return { items: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
  }

  async getPropertyLabel(orgId: string, id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, organizationId: orgId, status: 'ACTIVE' },
      select: { id: true, name: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async getActivity(orgId: string, query: ActivityQueryDto) {
    if (query.entityType === 'Resident') {
      const where = Prisma.sql`
        audit.organization_id = ${orgId}::uuid AND (
          (audit.entity_type = 'Resident' AND audit.entity_id = ${query.entityId}) OR
          (audit.entity_type = 'BillingRecord' AND EXISTS (
            SELECT 1 FROM billing_records bill
            WHERE bill.id::text = audit.entity_id AND bill.organization_id = audit.organization_id
              AND bill.resident_id = ${query.entityId}::uuid
          )) OR
          (audit.entity_type = 'Payment' AND EXISTS (
            SELECT 1 FROM payments payment
            WHERE payment.id::text = audit.entity_id AND payment.organization_id = audit.organization_id
              AND payment.resident_id = ${query.entityId}::uuid
          ))
        )
      `;
      const [items, counts] = await Promise.all([
        this.prisma.$queryRaw<Record<string, unknown>[]>`
          SELECT audit.id, audit.action, audit.metadata, audit.created_at AS "createdAt",
                 NULLIF(concat_ws(' ', actor.first_name, actor.last_name), '') AS actor
          FROM audit_logs audit LEFT JOIN users actor ON actor.id = audit.user_id
          WHERE ${where}
          ORDER BY audit.created_at DESC, audit.id DESC
          OFFSET ${(query.page - 1) * query.limit} LIMIT ${query.limit}
        `,
        this.prisma.$queryRaw<{ count: bigint }[]>`
          SELECT count(*) AS count FROM audit_logs audit WHERE ${where}
        `,
      ]);
      return buildOffsetResponse(
        items,
        Number(counts[0]?.count ?? 0),
        query.page,
        query.limit,
      );
    }
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
  getMetrics(
    orgId: string,
    propertyId?: string,
    month?: number,
    year?: number,
    fy = false,
  ) {
    const key = JSON.stringify([orgId, propertyId, month, year, fy]);
    const cached = this.metricsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    this.metricsCache.delete(key);
    // Coalesce simultaneous tabs and property cards, with a short bounded
    // TTL so recent writes become visible without explicit cross-module hooks.
    const value = this.computeMetrics(orgId, propertyId, month, year, fy);
    const entry = { expiresAt: Number.POSITIVE_INFINITY, value };
    this.metricsCache.set(key, entry);
    if (this.metricsCache.size > 500) {
      this.metricsCache.delete(this.metricsCache.keys().next().value!);
    }
    void value.then(
      () => {
        entry.expiresAt = Date.now() + 5000;
      },
      () => {
        if (this.metricsCache.get(key)?.value === value)
          this.metricsCache.delete(key);
      },
    );
    return value;
  }

  private getBillingTotals(
    orgId: string,
    propertyId: string | undefined,
    today: string,
    start: string,
    end: string,
  ) {
    return this.prisma.$queryRaw<BillingTotals[]>`
      SELECT
        SUM(amount) FILTER (WHERE billed) AS "totalBilled",
        SUM(balance) FILTER (WHERE billed) AS "totalOutstanding",
        SUM(amount) FILTER (WHERE in_period AND billed) AS "periodBilled",
        SUM(balance) FILTER (WHERE in_period AND billed) AS "periodOutstanding",
        SUM(balance) FILTER (WHERE unpaid AND type = 'SECURITY_DEPOSIT') AS "pendingDeposits",
        SUM(balance) FILTER (WHERE unpaid AND due_date <= ${today}::date) AS "currentDues",
        SUM(balance) FILTER (WHERE unpaid AND due_date >= ${today}::date + 7) AS "futureDues",
        SUM(balance) FILTER (WHERE unpaid AND due_date < ${today}::date) AS "overdueDues",
        SUM(balance) FILTER (WHERE unpaid AND due_date > ${today}::date AND due_date < ${today}::date + 7) AS "weekDues",
        SUM(balance) FILTER (WHERE unpaid AND due_date < ${start}::date) AS "pastDues",
        SUM(balance) FILTER (WHERE unpaid AND due_date = ${today}::date) AS "todayDues",
        COUNT(DISTINCT resident_id) FILTER (
          WHERE unpaid AND type = 'RENT' AND due_date < ${today}::date AND balance > 0
        ) AS "rentDefaulters"
      FROM (
        SELECT amount, amount::bigint - paid_amount AS balance, type, due_date, resident_id,
          status <> 'CANCELLED' AS billed,
          status IN ('ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE') AS unpaid,
          due_date >= ${start}::date AND due_date < ${end}::date AS in_period
        FROM billing_records
        WHERE organization_id = ${orgId}::uuid
          ${propertyId ? Prisma.sql`AND property_id = ${propertyId}::uuid` : Prisma.empty}
      ) AS scoped
    `;
  }

  private async computeMetrics(
    orgId: string,
    propertyId?: string,
    month?: number,
    year?: number,
    fy = false,
  ) {
    const propertyFilter = propertyId ? { id: propertyId } : {};
    const residentFilter = propertyId ? { propertyId } : {};
    const expenseFilter = propertyId ? { propertyId } : {};
    const complaintFilter = propertyId ? { propertyId } : {};

    const property = propertyId
      ? await this.prisma.property.findFirst({
          where: { id: propertyId, organizationId: orgId },
          select: { timezone: true },
        })
      : null;
    if (propertyId && !property)
      throw new NotFoundException('Property not found');
    const now = new Date();
    const timezone = property?.timezone ?? 'Asia/Kolkata';
    const todayStart = new Date(dateKeyInTimeZone(now, timezone));
    const selectedMonth = month ?? todayStart.getUTCMonth() + 1;
    const selectedYear = year ?? todayStart.getUTCFullYear();
    const fyYear = selectedMonth >= 4 ? selectedYear : selectedYear - 1;
    const monthStart = fy
      ? new Date(Date.UTC(fyYear, 3, 1))
      : new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
    const monthEnd = fy
      ? new Date(Date.UTC(fyYear + 1, 3, 1))
      : new Date(Date.UTC(selectedYear, selectedMonth, 1));
    const startKey = monthStart.toISOString().slice(0, 10);
    const endKey = monthEnd.toISOString().slice(0, 10);
    const todayKey = todayStart.toISOString().slice(0, 10);
    const timestampStart = Prisma.sql`(${startKey}::date::timestamp AT TIME ZONE ${timezone})`;
    const timestampEnd = Prisma.sql`(${endKey}::date::timestamp AT TIME ZONE ${timezone})`;
    const [
      propertiesCount,
      roomsCount,
      bedStats,
      activeResidentsCount,
      periodMoveIns,
      periodMoveOuts,
      pendingMoveIns,
      [billing],
      expensesAggregate,
      monthExpensesAggregate,
      securityDepositsAggregate,
      pendingComplaintsCount,
      complaintPeriod,
      residentStatuses,
      bookingStatuses,
      activeLeads,
      monthlyRentAggregate,
      residentsWithIdProof,
      collectionBreakdownRows,
      complaintAgeRows,
    ] = await inBatches([
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
          status: { notIn: ['ARCHIVED', 'UNDER_MAINTENANCE'] },
          isDisabledForRent: false,
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
          moveInDate: { gte: monthStart, lt: monthEnd },
          ...residentFilter,
        },
      }),

      this.prisma.resident.count({
        where: {
          organizationId: orgId,
          moveOutDate: { gte: monthStart, lt: monthEnd },
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

      this.getBillingTotals(orgId, propertyId, todayKey, startKey, endKey),

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
          expenseDate: { gte: monthStart, lt: monthEnd },
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

      this.prisma.$queryRaw<{ created: bigint; resolved: bigint }[]>`
        SELECT COUNT(*) FILTER (WHERE created_at >= ${timestampStart} AND created_at < ${timestampEnd}) AS created,
          COUNT(*) FILTER (WHERE status = 'RESOLVED' AND resolved_at >= ${timestampStart} AND resolved_at < ${timestampEnd}) AS resolved
        FROM complaints
        WHERE organization_id = ${orgId}::uuid
          ${propertyId ? Prisma.sql`AND property_id = ${propertyId}::uuid` : Prisma.empty}
      `,
      this.prisma.resident.groupBy({
        by: ['status'],
        where: { organizationId: orgId, ...residentFilter },
        _count: true,
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { organizationId: orgId, ...(propertyId ? { propertyId } : {}) },
        _count: true,
      }),
      this.prisma.lead.count({
        where: {
          organizationId: orgId,
          ...(propertyId ? { propertyId } : {}),
          status: { in: ['NEW', 'CONTACTED', 'VISITED', 'TOKEN_PAID'] },
        },
      }),
      this.prisma.resident.aggregate({
        where: {
          organizationId: orgId,
          ...residentFilter,
          status: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
        },
        _sum: { monthlyRent: true },
      }),
      this.prisma.resident.count({
        where: {
          organizationId: orgId,
          ...residentFilter,
          status: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
          idProofUrl: { not: null },
        },
      }),
      this.prisma.$queryRaw<
        { dimension: string; label: string; amount: bigint }[]
      >`
        WITH scoped AS MATERIALIZED (
          ${confirmedCollectionLines(orgId, propertyId)}
        ), period AS (
          SELECT s.amount, s.mode, s.status, COALESCE(s.category, 'Unallocated') AS category,
            COALESCE(NULLIF(concat_ws(' ', u.first_name, u.last_name), ''),
              CASE WHEN s.mode = 'RAZORPAY' THEN 'Online' ELSE 'Unspecified' END) AS recorded_by
          FROM scoped s
          LEFT JOIN users u ON u.id = s.recorded_by
          WHERE s.collection_date >= ${startKey}::date AND s.collection_date < ${endKey}::date
        )
        SELECT 'Total' AS dimension, 'All' AS label, COALESCE(SUM(amount), 0) AS amount FROM scoped
        UNION ALL SELECT 'Total', 'Today', COALESCE(SUM(amount), 0) FROM scoped WHERE collection_date = ${todayKey}::date
        UNION ALL SELECT 'Total', 'Period', COALESCE(SUM(amount), 0) FROM period
        UNION ALL SELECT 'Category', category, SUM(amount) FROM period GROUP BY category
        UNION ALL SELECT 'Status', status, SUM(amount) FROM period GROUP BY status
        UNION ALL SELECT 'Mode', mode, SUM(amount) FROM period GROUP BY mode
        UNION ALL SELECT 'Received By', recorded_by, SUM(amount) FROM period GROUP BY recorded_by
      `,
      this.prisma.$queryRaw<{ recent: bigint; week: bigint; older: bigint }[]>`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= ${new Date(now.getTime() - 7 * 86400000)}) AS recent,
          COUNT(*) FILTER (WHERE created_at < ${new Date(now.getTime() - 7 * 86400000)}
            AND created_at >= ${new Date(now.getTime() - 30 * 86400000)}) AS week,
          COUNT(*) FILTER (WHERE created_at < ${new Date(now.getTime() - 30 * 86400000)}) AS older
        FROM complaints
        WHERE organization_id = ${orgId}::uuid
          AND (${propertyId ?? null}::uuid IS NULL OR property_id = ${propertyId ?? null}::uuid)
          AND status <> 'RESOLVED'
      `,
    ] as const);

    // Compute bed counts
    let totalBeds = 0;
    let occupiedBeds = 0;
    let availableBeds = 0;
    let reservedBeds = 0;

    for (const stat of bedStats) {
      totalBeds += stat._count;
      if (stat.status === 'OCCUPIED') {
        occupiedBeds += stat._count;
      }
      if (stat.status === 'AVAILABLE') availableBeds += stat._count;
      if (stat.status === 'RESERVED') reservedBeds += stat._count;
    }

    const occupancyRate =
      totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    const totalBilled = Number(billing?.totalBilled ?? 0);
    const monthBilled = Number(billing?.periodBilled ?? 0);
    const unpaid = (key: keyof BillingTotals) => Math.max(0, Number(billing?.[key] ?? 0));
    const monthOutstanding = unpaid('periodOutstanding');
    const totalFor = (label: string) =>
      Number(
        collectionBreakdownRows.find(
          (row) => row.dimension === 'Total' && row.label === label,
        )?.amount ?? 0,
      );
    const totalCollected = totalFor('All');
    const todayCollected = totalFor('Today');
    const monthCollected = totalFor('Period');
    const totalOutstanding = unpaid('totalOutstanding');
    const totalExpenses = expensesAggregate._sum.amount ?? 0;
    const monthExpenses = monthExpensesAggregate._sum.amount ?? 0;
    const netCashflow = totalCollected - totalExpenses;
    const securityDepositsHeld =
      securityDepositsAggregate._sum.securityDeposit ?? 0;
    const pendingDeposits = unpaid('pendingDeposits');
    const currentDues = unpaid('currentDues');
    const futureDues = unpaid('futureDues');
    const residentCount = (status: string) =>
      residentStatuses.find((row) => row.status === status)?._count ?? 0;
    const bookingCount = (status: string) =>
      bookingStatuses.find((row) => row.status === status)?._count ?? 0;

    return {
      period: { month: selectedMonth, year: selectedYear, fy },
      operational: {
        totalProperties: propertiesCount,
        totalRooms: roomsCount,
        totalBeds,
        occupiedBeds,
        availableBeds,
        reservedBeds,
        occupancyRate,
        currentResidents: activeResidentsCount,
        upcomingMoveIns: pendingMoveIns,
        periodMoveIns,
        periodMoveOuts,
        pendingComplaints: pendingComplaintsCount,
        periodComplaintsCreated: Number(complaintPeriod[0]?.created ?? 0),
        periodComplaintsResolved: Number(complaintPeriod[0]?.resolved ?? 0),
        activeTenants: residentCount('ACTIVE') + residentCount('NOTICE_PERIOD'),
        noticePeriodTenants: residentCount('NOTICE_PERIOD'),
        currentBookings: bookingCount('CONFIRMED'),
        approvedBookings:
          bookingCount('CONFIRMED') + bookingCount('CHECKED_IN'),
        activeLeads,
        rentDefaulters: Number(billing?.rentDefaulters ?? 0),
        residentsWithIdProof,
        complaintAgeing: {
          under7Days: Number(complaintAgeRows[0]?.recent ?? 0),
          days7To30: Number(complaintAgeRows[0]?.week ?? 0),
          over30Days: Number(complaintAgeRows[0]?.older ?? 0),
        },
      },
      financial: {
        collectionBreakdown: collectionBreakdownRows
          .filter((row) => row.dimension !== 'Total')
          .map((row) => ({
            dimension: row.dimension,
            label: row.label,
            amountPaise: Number(row.amount),
          })),
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
        overdueDuesPaise: unpaid('overdueDues'),
        weekDuesPaise: unpaid('weekDues'),
        pastDuesPaise: unpaid('pastDues'),
        potentialRentPaise: monthlyRentAggregate._sum.monthlyRent ?? 0,
        todayDuesPaise: unpaid('todayDues'),
        monthProfitPaise: monthCollected - monthExpenses,
      },
    };
  }

  /**
   * Returns complete live data for the redesigned Overview page:
   * metrics, property overview cards, pending tasks, occupancy breakdown,
   * journey funnel, and issues overview.
   */
  async getOverview(
    orgId: string,
    propertyId?: string,
    month?: number,
    year?: number,
    fy = false,
  ) {
    const metrics = await this.getMetrics(orgId, propertyId, month, year, fy);

    const now = new Date();
    const todayStart = new Date(dateKeyInTimeZone(now, 'Asia/Kolkata'));
    const selectedMonth = metrics.period.month;
    const selectedYear = metrics.period.year;
    const fyYear = selectedMonth >= 4 ? selectedYear : selectedYear - 1;
    const periodStart = fy
      ? new Date(Date.UTC(fyYear, 3, 1))
      : new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
    const periodEnd = fy
      ? new Date(Date.UTC(fyYear + 1, 3, 1))
      : new Date(Date.UTC(selectedYear, selectedMonth, 1));
    const startKey = periodStart.toISOString().slice(0, 10);
    const endKey = periodEnd.toISOString().slice(0, 10);
    const renewalWindowEnd = new Date(todayStart.getTime() + 30 * 86400000);

    const [
      properties,
      roomsWithBeds,
      residentsCompliance,
      bookingsByProperty,
      unpaidDuesByProperty,
      collectedByProperty,
      leadStatuses,
      bookingStatuses,
      residentJourneyCounts,
      openComplaints,
    ] = await inBatches([
      this.prisma.property.findMany({
        where: {
          organizationId: orgId,
          status: 'ACTIVE',
          ...(propertyId ? { id: propertyId } : {}),
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: 50,
        select: { id: true, name: true, type: true, city: true },
      }),
      this.prisma.room.findMany({
        where: {
          organizationId: orgId,
          status: { not: 'ARCHIVED' },
          ...(propertyId ? { propertyId } : {}),
        },
        select: {
          id: true,
          propertyId: true,
          isDisabledForRent: true,
          beds: {
            where: { status: { not: 'ARCHIVED' } },
            select: {
              id: true,
              status: true,
              isDisabledForRent: true,
              residents: {
                where: {
                  status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
                },
                select: { id: true, status: true },
              },
              bookings: {
                where: { status: 'CONFIRMED' },
                select: { id: true },
              },
            },
          },
        },
      }),
      this.prisma.resident.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
          ...(propertyId ? { propertyId } : {}),
        },
        select: {
          id: true,
          propertyId: true,
          status: true,
          idProofUrl: true,
          agreementUrl: true,
          email: true,
        },
      }),
      this.prisma.booking.groupBy({
        by: ['propertyId'],
        where: {
          organizationId: orgId,
          status: 'CONFIRMED',
          ...(propertyId ? { propertyId } : {}),
        },
        _count: true,
      }),
      this.prisma.billingRecord.groupBy({
        by: ['propertyId'],
        where: {
          organizationId: orgId,
          status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
          ...(propertyId ? { propertyId } : {}),
        },
        _sum: { amount: true, paidAmount: true },
      }),
      this.prisma.$queryRaw<{ propertyId: string; amount: bigint }[]>`
        WITH scoped AS MATERIALIZED (
          ${confirmedCollectionLines(orgId, propertyId)}
        )
        SELECT r.property_id AS "propertyId", COALESCE(SUM(s.amount), 0) AS amount
        FROM scoped s
        JOIN residents r ON r.id = s.resident_id
        WHERE s.collection_date >= ${startKey}::date
          AND s.collection_date < ${endKey}::date
        GROUP BY r.property_id
      `,
      this.prisma.lead.groupBy({
        by: ['status'],
        where: {
          organizationId: orgId,
          ...(propertyId ? { propertyId } : {}),
        },
        _count: true,
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: {
          organizationId: orgId,
          ...(propertyId ? { propertyId } : {}),
        },
        _count: true,
      }),
      this.prisma.resident.aggregate({
        where: {
          organizationId: orgId,
          status: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
          expectedVacatingDate: { gte: todayStart, lte: renewalWindowEnd },
          ...(propertyId ? { propertyId } : {}),
        },
        _count: true,
      }),
      this.prisma.complaint.findMany({
        where: {
          organizationId: orgId,
          status: { not: 'RESOLVED' },
          ...(propertyId ? { propertyId } : {}),
        },
        select: {
          id: true,
          status: true,
          assignedTo: true,
          category: { select: { name: true } },
        },
      }),
    ] as const);

    // Build staff lookup for complaint assignee names
    const assigneeIds = Array.from(
      new Set(
        openComplaints
          .map((c) => c.assignedTo)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const staffList =
      assigneeIds.length > 0
        ? await this.prisma.staff.findMany({
            where: { id: { in: assigneeIds }, organizationId: orgId },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const staffNameMap = new Map(
      staffList.map((s) => [
        s.id,
        [s.firstName, s.lastName].filter(Boolean).join(' '),
      ]),
    );

    // Aggregate per-property and global occupancy breakdown (Units & Beds)
    const propOccupancy = new Map<
      string,
      { totalBeds: number; occupiedBeds: number }
    >();
    let totalUnits = 0;
    let occupiedUnits = 0;
    let vacantUnits = 0;
    let semiVacantUnits = 0;
    let overbookedUnits = 0;
    let totalBeds = 0;
    let occupiedBeds = 0;
    let vacantBeds = 0;
    let reservedBeds = 0;
    let overbookedBeds = 0;
    let underNoticeWithBooking = 0;

    for (const room of roomsWithBeds) {
      totalUnits += 1;
      const propStats = propOccupancy.get(room.propertyId) ?? {
        totalBeds: 0,
        occupiedBeds: 0,
      };
      let roomActiveBeds = 0;
      let roomOccupiedCount = 0;
      let roomBookingCount = 0;

      for (const bed of room.beds) {
        const isDisabled = room.isDisabledForRent || bed.isDisabledForRent;
        const activeOrNoticeCount = bed.residents.filter(
          (r) => r.status === 'ACTIVE' || r.status === 'NOTICE_PERIOD',
        ).length;
        const noticeCount = bed.residents.filter(
          (r) => r.status === 'NOTICE_PERIOD',
        ).length;
        const bookingsCount = bed.bookings.length;

        if (noticeCount > 0 && bookingsCount > 0) {
          underNoticeWithBooking += 1;
        }

        if (!isDisabled) {
          totalBeds += 1;
          propStats.totalBeds += 1;
          roomActiveBeds += 1;

          if (activeOrNoticeCount > 0 || bed.status === 'OCCUPIED') {
            occupiedBeds += 1;
            propStats.occupiedBeds += 1;
            roomOccupiedCount += 1;
          } else if (bed.status === 'RESERVED' || bookingsCount > 0) {
            reservedBeds += 1;
          } else if (bed.status === 'AVAILABLE') {
            vacantBeds += 1;
          }
        }

        if (
          activeOrNoticeCount > 1 ||
          (activeOrNoticeCount >= 1 && bookingsCount > 0)
        ) {
          overbookedBeds += 1;
        }
        roomBookingCount += bookingsCount;
      }

      propOccupancy.set(room.propertyId, propStats);

      if (roomActiveBeds > 0) {
        if (roomOccupiedCount === 0 && !room.isDisabledForRent) {
          vacantUnits += 1;
        } else if (roomOccupiedCount >= roomActiveBeds) {
          occupiedUnits += 1;
        } else if (roomOccupiedCount > 0) {
          semiVacantUnits += 1;
        }
        if (roomOccupiedCount + roomBookingCount > roomActiveBeds) {
          overbookedUnits += 1;
        }
      }
    }

    const activeTenantsByProp = new Map<string, number>();
    const evictionByProp = new Map<string, number>();
    let tenantsWithoutIdProof = 0;
    let tenantsWithoutAgreement = 0;
    let tenantsWithoutEmail = 0;

    for (const res of residentsCompliance) {
      if (res.status === 'ACTIVE' || res.status === 'NOTICE_PERIOD') {
        activeTenantsByProp.set(
          res.propertyId,
          (activeTenantsByProp.get(res.propertyId) ?? 0) + 1,
        );
      }
      if (res.status === 'NOTICE_PERIOD') {
        evictionByProp.set(
          res.propertyId,
          (evictionByProp.get(res.propertyId) ?? 0) + 1,
        );
      }
      if (!res.idProofUrl) tenantsWithoutIdProof += 1;
      if (!res.agreementUrl) tenantsWithoutAgreement += 1;
      if (!res.email) tenantsWithoutEmail += 1;
    }

    const bookingsByPropMap = new Map(
      bookingsByProperty.map((b) => [b.propertyId, b._count]),
    );
    const duesByPropMap = new Map(
      unpaidDuesByProperty.map((d) => [
        d.propertyId,
        Math.max(0, (d._sum.amount ?? 0) - (d._sum.paidAmount ?? 0)),
      ]),
    );
    const collectedByPropMap = new Map(
      collectedByProperty.map((c) => [c.propertyId, Number(c.amount)]),
    );

    const propertyCards = properties.map((p) => {
      const occ = propOccupancy.get(p.id) ?? { totalBeds: 0, occupiedBeds: 0 };
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        city: p.city,
        code: p.id.replace(/-/g, '').slice(0, 10).toUpperCase(),
        totalBeds: occ.totalBeds,
        occupiedBeds: occ.occupiedBeds,
        vacantBeds: Math.max(0, occ.totalBeds - occ.occupiedBeds),
        activeTenants: activeTenantsByProp.get(p.id) ?? 0,
        underEvictionCount: evictionByProp.get(p.id) ?? 0,
        currentBookings: bookingsByPropMap.get(p.id) ?? 0,
        pendingDuesPaise: duesByPropMap.get(p.id) ?? 0,
        monthCollectedPaise: collectedByPropMap.get(p.id) ?? 0,
      };
    });

    const leadCount = (status: string) =>
      leadStatuses.find((r) => r.status === status)?._count ?? 0;
    const totalLeads = leadStatuses.reduce((sum, r) => sum + r._count, 0);

    const bookingCount = (status: string) =>
      bookingStatuses.find((r) => r.status === status)?._count ?? 0;
    const totalBookings = bookingStatuses.reduce((sum, r) => sum + r._count, 0);

    const categoryMap = new Map<string, number>();
    const statusMap = new Map<string, number>();
    const assigneeMap = new Map<string, number>();
    for (const complaint of openComplaints) {
      const cat = complaint.category?.name ?? 'General';
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
      const st = complaint.status.replaceAll('_', ' ');
      statusMap.set(st, (statusMap.get(st) ?? 0) + 1);
      const assignee = complaint.assignedTo
        ? (staffNameMap.get(complaint.assignedTo) ?? 'Assigned Staff')
        : 'Unassigned';
      assigneeMap.set(assignee, (assigneeMap.get(assignee) ?? 0) + 1);
    }

    const unitOccupancyRate =
      totalUnits > 0
        ? Math.round(((occupiedUnits + semiVacantUnits) / totalUnits) * 100)
        : 0;
    const bedOccupancyRate =
      totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      ...metrics,
      properties: propertyCards,
      pendingTasks: {
        tenantsWithoutIdProof,
        tenantsWithoutAgreement,
        tenantsWithoutEmail,
        pendingComplaints: metrics.operational.pendingComplaints,
        rentDefaulters: metrics.operational.rentDefaulters,
      },
      occupancyBreakdown: {
        units: {
          total: totalUnits,
          occupied: occupiedUnits,
          vacant: vacantUnits,
          semiVacant: semiVacantUnits,
          occupancyRate: unitOccupancyRate,
          underNotice: metrics.operational.noticePeriodTenants,
          underNoticeWithBooking,
          overbooked: overbookedUnits,
        },
        beds: {
          total: totalBeds,
          occupied: occupiedBeds,
          vacant: vacantBeds,
          reserved: reservedBeds,
          occupancyRate: bedOccupancyRate,
          underNotice: metrics.operational.noticePeriodTenants,
          underNoticeWithBooking,
          overbooked: overbookedBeds,
        },
      },
      journey: {
        leads: {
          total: totalLeads,
          newCount: leadCount('NEW'),
          contacted: leadCount('CONTACTED'),
          visited: leadCount('VISITED'),
          tokenPaid: leadCount('TOKEN_PAID'),
          converted: leadCount('CONVERTED'),
          lost: leadCount('LOST'),
        },
        bookings: {
          total: totalBookings,
          confirmed: bookingCount('CONFIRMED'),
          checkedIn: bookingCount('CHECKED_IN'),
          cancelled: bookingCount('CANCELLED'),
          expired: bookingCount('EXPIRED'),
        },
        tenants: {
          total: metrics.operational.currentResidents,
          active: Math.max(
            0,
            metrics.operational.activeTenants -
              metrics.operational.noticePeriodTenants,
          ),
          noticeRaised: metrics.operational.noticePeriodTenants,
          confirmedEviction: metrics.operational.noticePeriodTenants,
          renewalsDue: residentJourneyCounts._count ?? 0,
        },
      },
      issuesOverview: {
        totalOpen: openComplaints.length,
        byCategory: Array.from(categoryMap.entries()).map(([label, count]) => ({
          label,
          count,
        })),
        byStatus: Array.from(statusMap.entries()).map(([label, count]) => ({
          label,
          count,
        })),
        byAssignee: Array.from(assigneeMap.entries()).map(([label, count]) => ({
          label,
          count,
        })),
      },
    };
  }
}
