import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { ConflictError, NotFoundError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import type {
  CreateChargeDto,
  DiscountDto,
  GenerateMonthlyDuesDto,
  QueryBillingDto,
} from '../api/dto/billing.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates rent dues for active residents whose billing cycle is due.
   * Completely idempotent: running multiple times for the same month/year
   * will never produce duplicate billing records.
   */
  async generateMonthlyDues(
    dto: GenerateMonthlyDuesDto,
    orgId: string,
    userId?: string,
  ) {
    // One INSERT ... SELECT replaces a resident scan and two round trips per
    // resident. Both unique constraints remain the concurrency authority.
    const startOfMonth = new Date(
      Date.UTC(dto.billingYear, dto.billingMonth - 1, 1),
    );
    const endOfMonth = new Date(Date.UTC(dto.billingYear, dto.billingMonth, 0));
    const monthName = startOfMonth.toLocaleString('en-US', {
      month: 'long',
      timeZone: 'UTC',
    });
    const [result] = await this.prisma.$queryRaw<
      { generatedCount: number; skippedCount: number; totalAmount: number }[]
    >(Prisma.sql`
      WITH candidates AS MATERIALIZED (
        SELECT r.id,r.organization_id,r.property_id,r.monthly_rent,r.rental_frequency_months,
          COALESCE(r.move_in_date,r.joining_date)::date AS rent_start,
          LEAST(COALESCE(r.rent_due_day,p.rent_due_day),${endOfMonth.getUTCDate()}) AS due_day
        FROM residents r JOIN properties p ON p.id=r.property_id
        CROSS JOIN LATERAL (
          SELECT (${dto.billingYear}::int - EXTRACT(YEAR FROM COALESCE(r.move_in_date,r.joining_date)))::int * 12
            + ${dto.billingMonth}::int - EXTRACT(MONTH FROM COALESCE(r.move_in_date,r.joining_date))::int AS months_since_start
        ) cycle
        WHERE cycle.months_since_start >= CASE WHEN r.skip_first_rent THEN 1 ELSE 0 END
          AND cycle.months_since_start % r.rental_frequency_months = 0
          AND r.organization_id=${orgId}::uuid AND r.status IN ('ACTIVE','NOTICE_PERIOD')
          ${dto.propertyId ? Prisma.sql`AND r.property_id=${dto.propertyId}::uuid` : Prisma.empty}
      ), inserted AS (
        INSERT INTO billing_records (id,organization_id,resident_id,property_id,type,status,amount,billing_month,billing_year,due_date,period_start,period_end,description,idempotency_key,updated_at)
        SELECT gen_random_uuid(),organization_id,id,property_id,'RENT','ISSUED',monthly_rent * rental_frequency_months,${dto.billingMonth},${dto.billingYear},
          GREATEST(make_date(${dto.billingYear}::int,${dto.billingMonth}::int,due_day::int),rent_start),
          GREATEST(${startOfMonth}::date,rent_start),
          (${startOfMonth}::date + make_interval(months => rental_frequency_months) - interval '1 day')::date,${`Rent for ${monthName} ${dto.billingYear}`},
          'rent_'||id::text||'_'||${String(dto.billingYear)}||'_'||${String(dto.billingMonth)},NOW()
        FROM candidates ON CONFLICT DO NOTHING RETURNING amount
      ) SELECT (SELECT COUNT(*)::int FROM inserted) AS "generatedCount",
        ((SELECT COUNT(*) FROM candidates)-(SELECT COUNT(*) FROM inserted))::int AS "skippedCount",
        COALESCE((SELECT SUM(amount) FROM inserted),0)::float8 AS "totalAmount"
    `);
    const { generatedCount, skippedCount, totalAmount } = result!;

    if (userId || generatedCount > 0)
      await this.prisma.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'billing.generate_monthly_dues',
          metadata: {
            billingMonth: dto.billingMonth,
            billingYear: dto.billingYear,
            propertyId: dto.propertyId,
            generatedCount,
            skippedCount,
            totalAmount,
          },
        },
      });

    this.logger.log(
      `Generated ${generatedCount} dues (${skippedCount} skipped) totaling ₹${totalAmount / 100} for ${dto.billingMonth}/${dto.billingYear}`,
    );

    return {
      billingMonth: dto.billingMonth,
      billingYear: dto.billingYear,
      generatedCount,
      skippedCount,
      totalAmountPaise: totalAmount,
    };
  }

  /**
   * Creates an ad-hoc charge for a resident (e.g. electricity, water, damage penalty).
   */
  async createCharge(dto: CreateChargeDto, orgId: string, userId: string) {
    const resident = await this.prisma.resident.findFirst({
      where: { id: dto.residentId, organizationId: orgId },
    });

    if (!resident) {
      throw new NotFoundError('Resident', dto.residentId);
    }

    const charge = await this.prisma.billingRecord.create({
      data: {
        organizationId: orgId,
        residentId: dto.residentId,
        propertyId: resident.propertyId,
        type: dto.type,
        status: 'ISSUED',
        amount: dto.amount,
        dueDate: dto.dueDate,
        description: dto.description,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'billing.create_charge',
        entityType: 'BillingRecord',
        entityId: charge.id,
        metadata: { amount: dto.amount, type: dto.type },
      },
    });

    return charge;
  }

  /**
   * Lists billing records with pagination and filters.
   */
  async discount(id: string, dto: DiscountDto, orgId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.billingRecord.findFirst({
        where: { id, organizationId: orgId },
        include: { _count: { select: { rentInvoices: true } } },
      });
      if (!record) throw new NotFoundError('Billing record', id);
      if (record._count.rentInvoices > 0) {
        throw new ConflictError(
          'Discounts require a charge without a linked rent invoice',
        );
      }
      const remaining = record.amount - record.paidAmount;
      if (
        !['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'].includes(
          record.status,
        ) ||
        dto.amount > remaining
      ) {
        throw new ConflictError('Discount exceeds the outstanding amount');
      }
      const updated = await tx.billingRecord.update({
        where: { id, version: record.version },
        data: {
          amount: { decrement: dto.amount },
          discountAmount: { increment: dto.amount },
          status: remaining === dto.amount ? 'PAID' : record.status,
          version: { increment: 1 },
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          entityType: 'Resident',
          entityId: record.residentId,
          action: 'billing.discount',
          metadata: {
            amount: dto.amount,
            billingRecordId: id,
            reason: dto.reason,
          },
        },
      });
      return updated;
    });
  }

  async findAll(orgId: string, query: QueryBillingDto) {
    const where: Prisma.BillingRecordWhereInput = {
      organizationId: orgId,
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.residentId ? { residentId: query.residentId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.month ? { billingMonth: query.month } : {}),
      ...(query.year ? { billingYear: query.year } : {}),
      ...(query.search
        ? {
            resident: {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { mobile: { contains: query.search } },
              ],
            },
          }
        : {}),
    };

    const [total, records] = await Promise.all([
      this.prisma.billingRecord.count({ where }),
      this.prisma.billingRecord.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ dueDate: 'desc' }, { id: 'desc' }],
        include: {
          resident: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mobile: true,
              room: { select: { roomNumber: true } },
              bed: { select: { bedNumber: true } },
            },
          },
        },
      }),
    ]);

    if (query.residentId && records.length) {
      const authors = await this.prisma.auditLog.findMany({
        where: {
          organizationId: orgId,
          entityType: 'BillingRecord',
          action: 'billing.create_charge',
          entityId: { in: records.map((record) => record.id) },
        },
        select: {
          entityId: true,
          user: { select: { firstName: true, lastName: true } },
        },
      });
      const names = new Map(
        authors.map(({ entityId, user }) => [
          entityId,
          user
            ? [user.firstName, user.lastName].filter(Boolean).join(' ')
            : null,
        ]),
      );
      return buildOffsetResponse(
        records.map((record) => ({
          ...record,
          addedBy: names.get(record.id) ?? null,
        })),
        total,
        query.page,
        query.limit,
      );
    }

    return buildOffsetResponse(records, total, query.page, query.limit);
  }

  /**
   * Retrieves single billing record by ID.
   */
  async findById(id: string, orgId: string) {
    const record = await this.prisma.billingRecord.findFirst({
      where: { id, organizationId: orgId },
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mobile: true,
            email: true,
            property: { select: { id: true, name: true } },
            room: { select: { roomNumber: true } },
            bed: { select: { bedNumber: true } },
          },
        },
        payments: {
          where: { status: 'CONFIRMED' },
          select: {
            id: true,
            amount: true,
            mode: true,
            collectionDate: true,
            reference: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundError('Billing Record', id);
    }

    return record;
  }

  /**
   * Cancels an unpaid billing record.
   */
  async cancelBill(id: string, orgId: string, userId: string, reason?: string) {
    const record = await this.prisma.billingRecord.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!record) {
      throw new NotFoundError('Billing Record', id);
    }

    if (record.paidAmount > 0) {
      throw new BadRequestException(
        'Cannot cancel a billing record that has partial or full payments. Refund or adjust payments first.',
      );
    }

    const updated = await this.prisma.billingRecord.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        description: reason
          ? `${record.description ?? ''} (Cancelled: ${reason})`
          : record.description,
        version: { increment: 1 },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'billing.cancel',
        entityType: 'BillingRecord',
        entityId: id,
        metadata: { reason },
      },
    });

    return updated;
  }
}
