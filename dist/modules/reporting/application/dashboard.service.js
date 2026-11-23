var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DashboardService_1;
import { Prisma } from '@prisma/client';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { Monetary } from '../../finance/domain/monetary.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
async function inBatches(queries, batchSize = 8) {
    const results = [];
    for (let index = 0; index < queries.length; index += batchSize) {
        results.push(...(await Promise.all(queries.slice(index, index + batchSize))));
    }
    return results;
}
let DashboardService = DashboardService_1 = class DashboardService {
    prisma;
    logger = new Logger(DashboardService_1.name);
    metricsCache = new Map();
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProperties(orgId, query) {
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
    async getPropertyLabel(orgId, id) {
        const property = await this.prisma.property.findFirst({
            where: { id, organizationId: orgId, status: 'ACTIVE' },
            select: { id: true, name: true },
        });
        if (!property)
            throw new NotFoundException('Property not found');
        return property;
    }
    async getActivity(orgId, query) {
        if (query.entityType === 'Resident') {
            const where = Prisma.sql `
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
                this.prisma.$queryRaw `
          SELECT audit.id, audit.action, audit.metadata, audit.created_at AS "createdAt",
                 NULLIF(concat_ws(' ', actor.first_name, actor.last_name), '') AS actor
          FROM audit_logs audit LEFT JOIN users actor ON actor.id = audit.user_id
          WHERE ${where}
          ORDER BY audit.created_at DESC, audit.id DESC
          OFFSET ${(query.page - 1) * query.limit} LIMIT ${query.limit}
        `,
                this.prisma.$queryRaw `
          SELECT count(*) AS count FROM audit_logs audit WHERE ${where}
        `,
            ]);
            return buildOffsetResponse(items, Number(counts[0]?.count ?? 0), query.page, query.limit);
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
    getMetrics(orgId, propertyId, month, year, fy = false) {
        const key = JSON.stringify([orgId, propertyId, month, year, fy]);
        const cached = this.metricsCache.get(key);
        if (cached && cached.expiresAt > Date.now())
            return cached.value;
        this.metricsCache.delete(key);
        const value = this.computeMetrics(orgId, propertyId, month, year, fy);
        const entry = { expiresAt: Number.POSITIVE_INFINITY, value };
        this.metricsCache.set(key, entry);
        if (this.metricsCache.size > 500) {
            this.metricsCache.delete(this.metricsCache.keys().next().value);
        }
        void value.then(() => {
            entry.expiresAt = Date.now() + 5000;
        }, () => {
            if (this.metricsCache.get(key)?.value === value)
                this.metricsCache.delete(key);
        });
        return value;
    }
    async computeMetrics(orgId, propertyId, month, year, fy = false) {
        const propertyFilter = propertyId ? { id: propertyId } : {};
        const residentFilter = propertyId ? { propertyId } : {};
        const billingFilter = propertyId ? { propertyId } : {};
        const expenseFilter = propertyId ? { propertyId } : {};
        const complaintFilter = propertyId ? { propertyId } : {};
        const now = new Date();
        const selectedMonth = month ?? now.getMonth() + 1;
        const selectedYear = year ?? now.getFullYear();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const fyYear = selectedMonth >= 4 ? selectedYear : selectedYear - 1;
        const monthStart = fy
            ? new Date(fyYear, 3, 1)
            : new Date(selectedYear, selectedMonth - 1, 1);
        const monthEnd = fy
            ? new Date(fyYear + 1, 3, 1)
            : new Date(selectedYear, selectedMonth, 1);
        const [propertiesCount, roomsCount, bedStats, activeResidentsCount, periodMoveIns, periodMoveOuts, pendingMoveIns, billingAggregates, currentDuesAggregate, futureDuesAggregate, monthBillingAggregate, paymentsAggregate, todayPaymentsAggregate, monthPaymentsAggregate, expensesAggregate, monthExpensesAggregate, securityDepositsAggregate, pendingDepositsAggregate, pendingComplaintsCount, periodComplaintsCreated, periodComplaintsResolved, residentStatuses, bookingStatuses, activeLeads, overdueDuesAggregate, weekDuesAggregate, pastDuesAggregate, monthlyRentAggregate, todayDuesAggregate, rentDefaulters, residentsWithIdProof, collectionBreakdownRows, complaintAgeRows,] = await inBatches([
            this.prisma.property.count({
                where: { organizationId: orgId, status: 'ACTIVE', ...propertyFilter },
            }),
            this.prisma.room.count({
                where: {
                    organizationId: orgId,
                    status: { not: 'ARCHIVED' },
                    ...(propertyId ? { propertyId } : {}),
                },
            }),
            this.prisma.bed.groupBy({
                by: ['status'],
                where: {
                    organizationId: orgId,
                    status: { not: 'ARCHIVED' },
                    ...(propertyId ? { room: { propertyId } } : {}),
                },
                _count: true,
            }),
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
            this.prisma.resident.count({
                where: {
                    organizationId: orgId,
                    status: 'PENDING_MOVE_IN',
                    ...residentFilter,
                },
            }),
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
            this.prisma.billingRecord.aggregate({
                where: {
                    organizationId: orgId,
                    status: { not: 'CANCELLED' },
                    ...billingFilter,
                    createdAt: { gte: monthStart, lt: monthEnd },
                },
                _sum: {
                    amount: true,
                    paidAmount: true,
                },
            }),
            this.prisma.payment.aggregate({
                where: {
                    organizationId: orgId,
                    status: 'CONFIRMED',
                    ...(propertyId ? { resident: { propertyId } } : {}),
                },
                _sum: { amount: true },
            }),
            this.prisma.payment.aggregate({
                where: {
                    organizationId: orgId,
                    status: 'CONFIRMED',
                    ...(propertyId ? { resident: { propertyId } } : {}),
                    createdAt: { gte: todayStart, lte: todayEnd },
                },
                _sum: { amount: true },
            }),
            this.prisma.payment.aggregate({
                where: {
                    organizationId: orgId,
                    status: 'CONFIRMED',
                    ...(propertyId ? { resident: { propertyId } } : {}),
                    createdAt: { gte: monthStart, lt: monthEnd },
                },
                _sum: { amount: true },
            }),
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
                    createdAt: { gte: monthStart, lt: monthEnd },
                    ...complaintFilter,
                },
            }),
            this.prisma.complaint.count({
                where: {
                    organizationId: orgId,
                    status: 'RESOLVED',
                    updatedAt: { gte: monthStart, lt: monthEnd },
                    ...complaintFilter,
                },
            }),
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
            this.prisma.billingRecord.aggregate({
                where: {
                    organizationId: orgId,
                    ...billingFilter,
                    status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
                    dueDate: { lt: todayStart },
                },
                _sum: { amount: true, paidAmount: true },
            }),
            this.prisma.billingRecord.aggregate({
                where: {
                    organizationId: orgId,
                    ...billingFilter,
                    status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
                    dueDate: {
                        gte: todayStart,
                        lt: new Date(todayStart.getTime() + 7 * 86400000),
                    },
                },
                _sum: { amount: true, paidAmount: true },
            }),
            this.prisma.billingRecord.aggregate({
                where: {
                    organizationId: orgId,
                    ...billingFilter,
                    status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
                    dueDate: { lt: monthStart },
                },
                _sum: { amount: true, paidAmount: true },
            }),
            this.prisma.resident.aggregate({
                where: {
                    organizationId: orgId,
                    ...residentFilter,
                    status: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
                },
                _sum: { monthlyRent: true },
            }),
            this.prisma.billingRecord.aggregate({
                where: {
                    organizationId: orgId,
                    ...billingFilter,
                    status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
                    dueDate: { gte: todayStart, lte: todayEnd },
                },
                _sum: { amount: true, paidAmount: true },
            }),
            this.prisma.$queryRaw `
        SELECT COUNT(DISTINCT resident_id) AS count FROM billing_records
        WHERE organization_id = ${orgId}::uuid
          AND (${propertyId ?? null}::uuid IS NULL OR property_id = ${propertyId ?? null}::uuid)
          AND type = 'RENT' AND status IN ('ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE')
          AND due_date < ${todayStart}::date AND amount > paid_amount
      `,
            this.prisma.resident.count({
                where: {
                    organizationId: orgId,
                    ...residentFilter,
                    status: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
                    idProofUrl: { not: null },
                },
            }),
            this.prisma.$queryRaw `
        WITH scoped AS MATERIALIZED (
          SELECT p.amount, p.mode::text AS mode, p.status::text AS status,
                 COALESCE(p.recorded_by::text, 'Online') AS recorded_by,
                 COALESCE(b.type::text, 'Unallocated') AS category
          FROM payments p
          JOIN residents r ON r.id = p.resident_id
          LEFT JOIN billing_records b ON b.id = p.billing_record_id
          WHERE p.organization_id = ${orgId}::uuid
            AND (${propertyId ?? null}::uuid IS NULL OR r.property_id = ${propertyId ?? null}::uuid)
            AND p.status = 'CONFIRMED'
            AND p.created_at >= ${monthStart} AND p.created_at < ${monthEnd}
        )
        SELECT 'Category' AS dimension, category AS label, SUM(amount)::bigint AS amount FROM scoped GROUP BY category
        UNION ALL SELECT 'Status', status, SUM(amount)::bigint FROM scoped GROUP BY status
        UNION ALL SELECT 'Mode', mode, SUM(amount)::bigint FROM scoped GROUP BY mode
        UNION ALL SELECT 'Received By', recorded_by, SUM(amount)::bigint FROM scoped GROUP BY recorded_by
      `,
            this.prisma.$queryRaw `
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
        ]);
        let totalBeds = 0;
        let occupiedBeds = 0;
        let availableBeds = 0;
        for (const stat of bedStats) {
            totalBeds += stat._count;
            if (stat.status === 'OCCUPIED' || stat.status === 'RESERVED') {
                occupiedBeds += stat._count;
            }
            if (stat.status === 'AVAILABLE')
                availableBeds += stat._count;
        }
        const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
        const totalBilled = billingAggregates._sum.amount ?? 0;
        const monthBilled = monthBillingAggregate._sum.amount ?? 0;
        const monthOutstanding = Math.max(0, monthBilled - (monthBillingAggregate._sum.paidAmount ?? 0));
        const totalCollected = paymentsAggregate._sum.amount ?? 0;
        const todayCollected = todayPaymentsAggregate._sum.amount ?? 0;
        const monthCollected = monthPaymentsAggregate._sum.amount ?? 0;
        const totalOutstanding = Math.max(0, totalBilled - (billingAggregates._sum.paidAmount ?? 0));
        const totalExpenses = expensesAggregate._sum.amount ?? 0;
        const monthExpenses = monthExpensesAggregate._sum.amount ?? 0;
        const netCashflow = totalCollected - totalExpenses;
        const securityDepositsHeld = securityDepositsAggregate._sum.securityDeposit ?? 0;
        const pendingDeposits = Math.max(0, (pendingDepositsAggregate._sum.amount ?? 0) -
            (pendingDepositsAggregate._sum.paidAmount ?? 0));
        const currentDues = Math.max(0, (currentDuesAggregate._sum.amount ?? 0) -
            (currentDuesAggregate._sum.paidAmount ?? 0));
        const futureDues = Math.max(0, (futureDuesAggregate._sum.amount ?? 0) -
            (futureDuesAggregate._sum.paidAmount ?? 0));
        const unpaid = (aggregate) => Math.max(0, (aggregate._sum.amount ?? 0) - (aggregate._sum.paidAmount ?? 0));
        const residentCount = (status) => residentStatuses.find((row) => row.status === status)?._count ?? 0;
        const bookingCount = (status) => bookingStatuses.find((row) => row.status === status)?._count ?? 0;
        return {
            period: { month: selectedMonth, year: selectedYear, fy },
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
                activeTenants: residentCount('ACTIVE') + residentCount('NOTICE_PERIOD'),
                noticePeriodTenants: residentCount('NOTICE_PERIOD'),
                currentBookings: bookingCount('CONFIRMED'),
                approvedBookings: bookingCount('CONFIRMED') + bookingCount('CHECKED_IN'),
                activeLeads,
                rentDefaulters: Number(rentDefaulters[0]?.count ?? 0),
                residentsWithIdProof,
                complaintAgeing: {
                    under7Days: Number(complaintAgeRows[0]?.recent ?? 0),
                    days7To30: Number(complaintAgeRows[0]?.week ?? 0),
                    over30Days: Number(complaintAgeRows[0]?.older ?? 0),
                },
            },
            financial: {
                collectionBreakdown: collectionBreakdownRows.map((row) => ({
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
                overdueDuesPaise: unpaid(overdueDuesAggregate),
                weekDuesPaise: unpaid(weekDuesAggregate),
                pastDuesPaise: unpaid(pastDuesAggregate),
                potentialRentPaise: monthlyRentAggregate._sum.monthlyRent ?? 0,
                todayDuesPaise: unpaid(todayDuesAggregate),
                monthProfitPaise: monthCollected - monthExpenses,
            },
        };
    }
};
DashboardService = DashboardService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], DashboardService);
export { DashboardService };
//# sourceMappingURL=dashboard.service.js.map