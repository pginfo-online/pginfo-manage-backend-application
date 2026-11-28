import { paymentPropertyScope } from '../../finance/domain/collection-lines.js';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { NotFoundError } from '../../../common/errors/index.js';
import type {
  AdminAuditQueryDto,
  AdminAnnouncementsQueryDto,
  AdminBookingsQueryDto,
  AdminComplaintsQueryDto,
  AdminDashboardQueryDto,
  AdminInventoryQueryDto,
  AdminOrganizationsQueryDto,
  AdminPaymentsQueryDto,
  AdminPayoutsQueryDto,
  AdminPropertiesQueryDto,
  AdminResidentsQueryDto,
  AdminUsersQueryDto,
} from '../api/dto/admin.dto.js';

@Injectable()
export class AdminQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(query: AdminDashboardQueryDto) {
    const now = new Date();
    const from =
      query.from ??
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const to = query.to ?? now;
    const organization = query.organizationId
      ? { organizationId: query.organizationId }
      : {};
    const propertyOrganization = query.organizationId
      ? { organizationId: query.organizationId }
      : {};
    const userOrganization = query.organizationId
      ? { memberships: { some: { organizationId: query.organizationId } } }
      : {};

    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalOrganizations,
      activeOrganizations,
      totalProperties,
      propertyStatuses,
      totalRooms,
      bedStatuses,
      residentStatuses,
      paymentTotals,
      pendingPaymentTotals,
      disputedPayments,
      expenseTotals,
      invoiceTotals,
      payoutKycStatuses,
      complaintStatuses,
      criticalOpenComplaints,
      caseStatuses,
      overdueCases,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: userOrganization }),
      this.prisma.user.count({
        where: { ...userOrganization, isActive: true },
      }),
      this.prisma.user.count({
        where: { ...userOrganization, createdAt: { gte: from, lte: to } },
      }),
      this.prisma.organization.count({
        where: query.organizationId ? { id: query.organizationId } : {},
      }),
      this.prisma.organization.count({
        where: {
          ...(query.organizationId ? { id: query.organizationId } : {}),
          isActive: true,
        },
      }),
      this.prisma.property.count({ where: propertyOrganization }),
      this.prisma.property.groupBy({
        by: ['status'],
        where: propertyOrganization,
        _count: true,
      }),
      this.prisma.room.count({ where: propertyOrganization }),
      this.prisma.bed.groupBy({
        by: ['status'],
        where: organization,
        _count: true,
      }),
      this.prisma.resident.groupBy({
        by: ['status'],
        where: organization,
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: {
          ...organization,
          status: 'CONFIRMED',
          collectionDate: { gte: from, lte: to },
        },
        _sum: { amount: true, gatewayRefundedAmount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: { ...organization, status: 'PENDING' },
        _sum: { amount: true, gatewayRefundedAmount: true },
        _count: true,
      }),
      this.prisma.payment.count({
        where: { ...organization, status: 'DISPUTED' },
      }),
      this.prisma.expense.aggregate({
        where: {
          ...organization,
          expenseDate: { gte: from, lte: to },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.rentInvoice.aggregate({
        where: {
          ...organization,
          createdAt: { gte: from, lte: to },
          status: { not: 'CANCELLED' },
        },
        _sum: { amount: true, platformFee: true, transferAmount: true },
        _count: true,
      }),
      this.prisma.landlordPayoutAccount.groupBy({
        by: ['kycStatus'],
        where: organization,
        _count: true,
      }),
      this.prisma.complaint.groupBy({
        by: ['status'],
        where: organization,
        _count: true,
      }),
      this.prisma.complaint.count({
        where: {
          ...organization,
          urgency: 'CRITICAL',
          status: { not: 'RESOLVED' },
        },
      }),
      this.prisma.adminCase.groupBy({
        by: ['status'],
        where: query.organizationId
          ? { organizationId: query.organizationId }
          : {},
        _count: true,
      }),
      this.prisma.adminCase.count({
        where: {
          ...(query.organizationId
            ? { organizationId: query.organizationId }
            : {}),
          status: { in: ['OPEN', 'IN_REVIEW', 'BLOCKED'] },
          dueAt: { lt: now },
        },
      }),
    ]);

    return {
      period: { from, to },
      users: { total: totalUsers, active: activeUsers, new: newUsers },
      organizations: { total: totalOrganizations, active: activeOrganizations },
      properties: { total: totalProperties, byStatus: propertyStatuses },
      inventory: { rooms: totalRooms, bedsByStatus: bedStatuses },
      residents: { byStatus: residentStatuses },
      finance: {
        collectedPaise:
          (paymentTotals._sum.amount ?? 0) -
          (paymentTotals._sum.gatewayRefundedAmount ?? 0),
        collections: paymentTotals._count,
        pendingPaise: pendingPaymentTotals._sum.amount ?? 0,
        pendingPayments: pendingPaymentTotals._count,
        disputedPayments,
        expensesPaise: expenseTotals._sum.amount ?? 0,
        expenses: expenseTotals._count,
        grossRentPaise: invoiceTotals._sum.amount ?? 0,
        platformFeesPaise: invoiceTotals._sum.platformFee ?? 0,
        ownerTransfersPaise: invoiceTotals._sum.transferAmount ?? 0,
        invoices: invoiceTotals._count,
      },
      banks: { kycByStatus: payoutKycStatuses },
      support: {
        complaintsByStatus: complaintStatuses,
        criticalOpenComplaints,
        casesByStatus: caseStatuses,
        overdueCases,
      },
    };
  }

  /**
   * Constant-round-trip dashboard query for platform scale. The regular
   * Prisma aggregates are intentionally collapsed into one parameterized SQL
   * statement so a hosted connection pool does not serialize 20+ queries.
   */
  async dashboardSnapshot(query: AdminDashboardQueryDto) {
    const now = new Date();
    const from =
      query.from ??
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const to = query.to ?? now;
    const orgId = query.organizationId;
    const userOrg = orgId
      ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM "organization_members" member
          WHERE member."user_id" = subject."id"
            AND member."organization_id" = ${orgId}::uuid
        )`
      : Prisma.empty;
    const organizationId = orgId
      ? Prisma.sql`AND "id" = ${orgId}::uuid`
      : Prisma.empty;
    const scoped = orgId
      ? Prisma.sql`AND "organization_id" = ${orgId}::uuid`
      : Prisma.empty;

    type Snapshot = {
      total_users: bigint;
      active_users: bigint;
      new_users: bigint;
      total_organizations: bigint;
      active_organizations: bigint;
      total_properties: bigint;
      total_rooms: bigint;
      collected_paise: bigint;
      collections: bigint;
      pending_paise: bigint;
      pending_payments: bigint;
      disputed_payments: bigint;
      expenses_paise: bigint;
      expenses: bigint;
      gross_rent_paise: bigint;
      platform_fees_paise: bigint;
      owner_transfers_paise: bigint;
      invoices: bigint;
      critical_open_complaints: bigint;
      overdue_cases: bigint;
      property_statuses: Record<string, number>;
      bed_statuses: Record<string, number>;
      resident_statuses: Record<string, number>;
      payout_kyc_statuses: Record<string, number>;
      complaint_statuses: Record<string, number>;
      case_statuses: Record<string, number>;
    };

    const [snapshot] = await this.prisma.$queryRaw<Snapshot[]>(Prisma.sql`
      SELECT
        (SELECT count(*) FROM "users" subject WHERE true ${userOrg}) AS total_users,
        (SELECT count(*) FROM "users" subject WHERE subject."is_active" = true ${userOrg}) AS active_users,
        (SELECT count(*) FROM "users" subject WHERE subject."created_at" BETWEEN ${from} AND ${to} ${userOrg}) AS new_users,
        (SELECT count(*) FROM "organizations" WHERE true ${organizationId}) AS total_organizations,
        (SELECT count(*) FROM "organizations" WHERE "is_active" = true ${organizationId}) AS active_organizations,
        (SELECT count(*) FROM "properties" WHERE true ${scoped}) AS total_properties,
        (SELECT count(*) FROM "rooms" WHERE true ${scoped}) AS total_rooms,
        payment_totals.*,
        (SELECT coalesce(sum("amount"), 0) FROM "expenses" WHERE "expense_date" BETWEEN ${from} AND ${to} ${scoped}) AS expenses_paise,
        (SELECT count(*) FROM "expenses" WHERE "expense_date" BETWEEN ${from} AND ${to} ${scoped}) AS expenses,
        (SELECT coalesce(sum("amount"), 0) FROM "rent_invoices" WHERE "status" != 'CANCELLED' AND "created_at" BETWEEN ${from} AND ${to} ${scoped}) AS gross_rent_paise,
        (SELECT coalesce(sum("platform_fee"), 0) FROM "rent_invoices" WHERE "status" != 'CANCELLED' AND "created_at" BETWEEN ${from} AND ${to} ${scoped}) AS platform_fees_paise,
        (SELECT coalesce(sum("transfer_amount"), 0) FROM "rent_invoices" WHERE "status" != 'CANCELLED' AND "created_at" BETWEEN ${from} AND ${to} ${scoped}) AS owner_transfers_paise,
        (SELECT count(*) FROM "rent_invoices" WHERE "status" != 'CANCELLED' AND "created_at" BETWEEN ${from} AND ${to} ${scoped}) AS invoices,
        (SELECT count(*) FROM "complaints" WHERE "urgency" = 'CRITICAL' AND "status" != 'RESOLVED' ${scoped}) AS critical_open_complaints,
        (SELECT count(*) FROM "admin_cases" WHERE "status" IN ('OPEN', 'IN_REVIEW', 'BLOCKED') AND "due_at" < ${now} ${scoped}) AS overdue_cases,
        coalesce((SELECT jsonb_object_agg(grouped.status, grouped.total) FROM (
          SELECT "status"::text AS status, count(*)::int AS total FROM "properties" WHERE true ${scoped} GROUP BY "status"
        ) grouped), '{}'::jsonb) AS property_statuses,
        coalesce((SELECT jsonb_object_agg(grouped.status, grouped.total) FROM (
          SELECT "status"::text AS status, count(*)::int AS total FROM "beds" WHERE true ${scoped} GROUP BY "status"
        ) grouped), '{}'::jsonb) AS bed_statuses,
        coalesce((SELECT jsonb_object_agg(grouped.status, grouped.total) FROM (
          SELECT "status"::text AS status, count(*)::int AS total FROM "residents" WHERE true ${scoped} GROUP BY "status"
        ) grouped), '{}'::jsonb) AS resident_statuses,
        coalesce((SELECT jsonb_object_agg(grouped.status, grouped.total) FROM (
          SELECT "kyc_status"::text AS status, count(*)::int AS total FROM "landlord_payout_accounts" WHERE true ${scoped} GROUP BY "kyc_status"
        ) grouped), '{}'::jsonb) AS payout_kyc_statuses,
        coalesce((SELECT jsonb_object_agg(grouped.status, grouped.total) FROM (
          SELECT "status"::text AS status, count(*)::int AS total FROM "complaints" WHERE true ${scoped} GROUP BY "status"
        ) grouped), '{}'::jsonb) AS complaint_statuses,
        coalesce((SELECT jsonb_object_agg(grouped.status, grouped.total) FROM (
          SELECT "status"::text AS status, count(*)::int AS total FROM "admin_cases" WHERE true ${scoped} GROUP BY "status"
        ) grouped), '{}'::jsonb) AS case_statuses
      FROM (
        SELECT
          coalesce(sum("amount" - "gateway_refunded_amount") FILTER (WHERE "status" = 'CONFIRMED'), 0) AS collected_paise,
          count(*) FILTER (WHERE "status" = 'CONFIRMED') AS collections,
          coalesce(sum("amount") FILTER (WHERE "status" = 'PENDING'), 0) AS pending_paise,
          count(*) FILTER (WHERE "status" = 'PENDING') AS pending_payments,
          count(*) FILTER (WHERE "status" = 'DISPUTED') AS disputed_payments
        FROM "payments"
        WHERE ("status" IN ('PENDING', 'DISPUTED') OR
          ("status" = 'CONFIRMED' AND "collection_date" BETWEEN ${from} AND ${to}))
          ${scoped}
      ) payment_totals
    `);
    if (!snapshot) throw new Error('Dashboard snapshot query returned no row');
    const count = (value: bigint) => Number(value);
    const groups = (value: Record<string, number>) =>
      Object.entries(value).map(([status, total]) => ({
        status,
        _count: Number(total),
      }));
    return {
      period: { from, to },
      users: {
        total: count(snapshot.total_users),
        active: count(snapshot.active_users),
        new: count(snapshot.new_users),
      },
      organizations: {
        total: count(snapshot.total_organizations),
        active: count(snapshot.active_organizations),
      },
      properties: {
        total: count(snapshot.total_properties),
        byStatus: groups(snapshot.property_statuses),
      },
      inventory: {
        rooms: count(snapshot.total_rooms),
        bedsByStatus: groups(snapshot.bed_statuses),
      },
      residents: { byStatus: groups(snapshot.resident_statuses) },
      finance: {
        collectedPaise: count(snapshot.collected_paise),
        collections: count(snapshot.collections),
        pendingPaise: count(snapshot.pending_paise),
        pendingPayments: count(snapshot.pending_payments),
        disputedPayments: count(snapshot.disputed_payments),
        expensesPaise: count(snapshot.expenses_paise),
        expenses: count(snapshot.expenses),
        grossRentPaise: count(snapshot.gross_rent_paise),
        platformFeesPaise: count(snapshot.platform_fees_paise),
        ownerTransfersPaise: count(snapshot.owner_transfers_paise),
        invoices: count(snapshot.invoices),
      },
      banks: { kycByStatus: groups(snapshot.payout_kyc_statuses) },
      support: {
        complaintsByStatus: groups(snapshot.complaint_statuses),
        criticalOpenComplaints: count(snapshot.critical_open_complaints),
        casesByStatus: groups(snapshot.case_statuses),
        overdueCases: count(snapshot.overdue_cases),
      },
    };
  }

  async users(query: AdminUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.organizationId
        ? { memberships: { some: { organizationId: query.organizationId } } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { mobile: { contains: query.search } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          email: true,
          mobile: true,
          firstName: true,
          lastName: true,
          emailVerified: true,
          mobileVerified: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          platformAdmin: { select: { role: true, status: true } },
          memberships: {
            select: {
              id: true,
              role: true,
              isActive: true,
              organization: {
                select: { id: true, name: true, isActive: true },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return buildOffsetResponse(items, total, query.page, query.limit);
  }

  async user(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        mobile: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        mobileVerified: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        platformAdmin: {
          select: {
            id: true,
            role: true,
            status: true,
            permissionOverrides: true,
          },
        },
        memberships: {
          include: {
            organization: {
              select: { id: true, name: true, slug: true, isActive: true },
            },
          },
          orderBy: { joinedAt: 'desc' },
        },
        payoutAccounts: {
          select: {
            id: true,
            businessName: true,
            accountNumberMasked: true,
            status: true,
            kycStatus: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundError('User', id);
    return user;
  }

  async organizations(query: AdminOrganizationsQueryDto) {
    const where: Prisma.OrganizationWhereInput = {
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          _count: {
            select: {
              members: true,
              properties: true,
              payoutAccounts: true,
              mandates: true,
            },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);
    return buildOffsetResponse(items, total, query.page, query.limit);
  }

  async organization(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          where: { role: { in: ['OWNER', 'ADMIN'] } },
          select: {
            id: true,
            role: true,
            isActive: true,
            user: {
              select: {
                id: true,
                email: true,
                mobile: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            properties: true,
            payoutAccounts: true,
            mandates: true,
            rentInvoices: true,
          },
        },
      },
    });
    if (!organization) throw new NotFoundError('Organization', id);
    const [residents, collections, outstanding] =
      await this.prisma.$transaction([
        this.prisma.resident.count({
          where: {
            organizationId: id,
            status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
          },
        }),
        this.prisma.payment.aggregate({
          where: { organizationId: id, status: 'CONFIRMED' },
          _sum: { amount: true, gatewayRefundedAmount: true },
        }),
        this.prisma.billingRecord.aggregate({
          where: {
            organizationId: id,
            status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
          },
          _sum: { amount: true, paidAmount: true },
        }),
      ]);
    return {
      ...organization,
      metrics: {
        activeResidents: residents,
        collectedPaise:
          (collections._sum.amount ?? 0) -
          (collections._sum.gatewayRefundedAmount ?? 0),
        outstandingPaise: Math.max(
          0,
          (outstanding._sum.amount ?? 0) - (outstanding._sum.paidAmount ?? 0),
        ),
      },
    };
  }

  async properties(query: AdminPropertiesQueryDto) {
    const where: Prisma.PropertyWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { ownerName: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
              { pincode: { contains: query.search } },
              { addressLine1: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          organization: { select: { id: true, name: true, isActive: true } },
          _count: {
            select: {
              rooms: true,
              residents: true,
              staff: true,
              complaints: true,
            },
          },
        },
      }),
      this.prisma.property.count({ where }),
    ]);
    return buildOffsetResponse(items, total, query.page, query.limit);
  }

  async property(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
        _count: {
          select: {
            rooms: true,
            residents: true,
            staff: true,
            expenses: true,
            complaints: true,
            bookings: true,
          },
        },
      },
    });
    if (!property) throw new NotFoundError('Property', id);
    const [beds, activeResidents, collections, expenses, openComplaints] =
      await this.prisma.$transaction([
        this.prisma.bed.groupBy({
          by: ['status'],
          where: { room: { propertyId: id } },
          _count: true,
        }),
        this.prisma.resident.count({
          where: {
            propertyId: id,
            status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
          },
        }),
        this.prisma.payment.aggregate({
          where: { ...paymentPropertyScope(id), status: 'CONFIRMED' },
          _sum: { amount: true, gatewayRefundedAmount: true },
        }),
        this.prisma.expense.aggregate({
          where: { propertyId: id },
          _sum: { amount: true },
        }),
        this.prisma.complaint.count({
          where: { propertyId: id, status: { not: 'RESOLVED' } },
        }),
      ]);
    return {
      ...property,
      metrics: {
        bedsByStatus: beds,
        activeResidents,
        collectedPaise:
          (collections._sum.amount ?? 0) -
          (collections._sum.gatewayRefundedAmount ?? 0),
        expensesPaise: expenses._sum.amount ?? 0,
        openComplaints,
      },
    };
  }

  async rooms(query: AdminInventoryQueryDto) {
    const where: Prisma.RoomWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.roomStatus ? { status: query.roomStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { roomNumber: { contains: query.search, mode: 'insensitive' } },
              {
                property: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          property: {
            select: {
              id: true,
              name: true,
              organization: { select: { id: true, name: true } },
            },
          },
          _count: { select: { beds: true, residents: true } },
        },
      }),
      this.prisma.room.count({ where }),
    ]);
    return buildOffsetResponse(items, total, query.page, query.limit);
  }

  async beds(query: AdminInventoryQueryDto) {
    const where: Prisma.BedWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.propertyId ? { room: { propertyId: query.propertyId } } : {}),
      ...(query.bedStatus ? { status: query.bedStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { bedNumber: { contains: query.search, mode: 'insensitive' } },
              {
                room: {
                  roomNumber: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                room: {
                  property: {
                    name: { contains: query.search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.bed.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          room: {
            select: {
              id: true,
              roomNumber: true,
              property: {
                select: {
                  id: true,
                  name: true,
                  organization: { select: { id: true, name: true } },
                },
              },
            },
          },
          residents: {
            where: { status: { in: ['ACTIVE', 'NOTICE_PERIOD'] } },
            select: { id: true, firstName: true, lastName: true, status: true },
            take: 1,
          },
        },
      }),
      this.prisma.bed.count({ where }),
    ]);
    return buildOffsetResponse(items, total, query.page, query.limit);
  }

  async residents(query: AdminResidentsQueryDto) {
    const where: Prisma.ResidentWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { mobile: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.resident.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          property: { select: { id: true, name: true } },
          room: { select: { id: true, roomNumber: true } },
          bed: { select: { id: true, bedNumber: true } },
          _count: { select: { billingRecords: true, payments: true } },
        },
      }),
      this.prisma.resident.count({ where }),
    ]);
    return buildOffsetResponse(items, total, query.page, query.limit);
  }

  async bookings(query: AdminBookingsQueryDto) {
    const where: Prisma.BookingWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { guestName: { contains: query.search, mode: 'insensitive' } },
              { guestMobile: { contains: query.search } },
              { guestEmail: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          property: { select: { id: true, name: true } },
          bed: {
            select: {
              id: true,
              bedNumber: true,
              room: { select: { id: true, roomNumber: true } },
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);
    return buildOffsetResponse(items, total, query.page, query.limit);
  }

  async complaints(query: AdminComplaintsQueryDto) {
    const where: Prisma.ComplaintWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.urgency ? { urgency: query.urgency } : {}),
      ...(query.search
        ? {
            OR: [
              { description: { contains: query.search, mode: 'insensitive' } },
              { location: { contains: query.search, mode: 'insensitive' } },
              {
                property: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.complaint.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ urgency: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
        include: {
          property: { select: { id: true, name: true } },
          room: { select: { id: true, roomNumber: true } },
          category: { select: { id: true, name: true } },
          _count: { select: { comments: true, history: true } },
        },
      }),
      this.prisma.complaint.count({ where }),
    ]);
    return buildOffsetResponse(items, total, query.page, query.limit);
  }

  async complaint(id: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, name: true, organizationId: true } },
        room: { select: { id: true, roomNumber: true } },
        category: { select: { id: true, name: true } },
        comments: { orderBy: { createdAt: 'asc' } },
        history: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!complaint) throw new NotFoundError('Complaint', id);
    return complaint;
  }

  async announcements(query: AdminAnnouncementsQueryDto) {
    const where: Prisma.AnnouncementWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { body: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.announcement.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { property: { select: { id: true, name: true } } },
      }),
      this.prisma.announcement.count({ where }),
    ]);
    const organizationIds = [
      ...new Set(items.map((item) => item.organizationId)),
    ];
    const organizations = await this.prisma.organization.findMany({
      where: { id: { in: organizationIds } },
      select: { id: true, name: true },
    });
    const names = new Map(organizations.map((item) => [item.id, item.name]));
    return buildOffsetResponse(
      items.map((item) => ({
        ...item,
        organization: {
          id: item.organizationId,
          name: names.get(item.organizationId) ?? 'Unknown',
        },
      })),
      total,
      query.page,
      query.limit,
    );
  }

  async payments(query: AdminPaymentsQueryDto) {
    const where: Prisma.PaymentWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.mode ? { mode: query.mode } : {}),
      ...(query.from || query.to
        ? { collectionDate: { gte: query.from, lte: query.to } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { reference: { contains: query.search, mode: 'insensitive' } },
              { razorpayPaymentId: { contains: query.search } },
              {
                resident: {
                  firstName: { contains: query.search, mode: 'insensitive' },
                },
              },
              { resident: { mobile: { contains: query.search } } },
              {
                resident: {
                  lastName: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                resident: {
                  property: {
                    name: { contains: query.search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          organizationId: true,
          amount: true,
          status: true,
          mode: true,
          collectionDate: true,
          reference: true,
          proofUrl: true,
          razorpayOrderId: true,
          razorpayPaymentId: true,
          recordedBy: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          resident: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mobile: true,
              property: { select: { id: true, name: true } },
            },
          },
          billingRecord: {
            select: {
              id: true,
              type: true,
              status: true,
              amount: true,
              paidAmount: true,
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return buildOffsetResponse(items, total, query.page, query.limit);
  }

  async payment(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        amount: true,
        status: true,
        mode: true,
        collectionDate: true,
        reference: true,
        notes: true,
        proofUrl: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
        recordedBy: true,
        idempotencyKey: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mobile: true,
            property: { select: { id: true, name: true } },
            room: { select: { id: true, roomNumber: true } },
            bed: { select: { id: true, bedNumber: true } },
          },
        },
        billingRecord: true,
      },
    });
    if (!payment) throw new NotFoundError('Payment', id);
    return payment;
  }

  async payouts(query: AdminPayoutsQueryDto) {
    const where: Prisma.LandlordPayoutAccountWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.kycStatus ? { kycStatus: query.kycStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { businessName: { contains: query.search, mode: 'insensitive' } },
              {
                beneficiaryName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
              { accountNumberMasked: { contains: query.search } },
              { razorpayAccountId: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.landlordPayoutAccount.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          organizationId: true,
          propertyId: true,
          razorpayAccountId: true,
          businessName: true,
          businessType: true,
          accountNumberMasked: true,
          ifscCode: true,
          beneficiaryName: true,
          email: true,
          phone: true,
          status: true,
          kycStatus: true,
          createdAt: true,
          updatedAt: true,
          organization: { select: { id: true, name: true } },
          property: { select: { id: true, name: true } },
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.landlordPayoutAccount.count({ where }),
    ]);
    return buildOffsetResponse(items, total, query.page, query.limit);
  }

  async ledger(query: AdminPaymentsQueryDto) {
    const where: Prisma.RentInvoiceWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.from || query.to
        ? { createdAt: { gte: query.from, lte: query.to } }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                invoiceNumber: { contains: query.search, mode: 'insensitive' },
              },
              { razorpayPaymentId: { contains: query.search } },
              { razorpayTransferId: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [items, total, paidInvoices, historicalTransfers] =
      await this.prisma.$transaction([
        this.prisma.rentInvoice.findMany({
          where,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            organizationId: true,
            invoiceNumber: true,
            billingMonth: true,
            billingYear: true,
            amount: true,
            platformFee: true,
            transferAmount: true,
            status: true,
            collectionType: true,
            dueDate: true,
            paidAt: true,
            razorpayPaymentId: true,
            razorpayTransferId: true,
            failureReason: true,
            createdAt: true,
            tenant: { select: { id: true, firstName: true, lastName: true } },
            property: { select: { id: true, name: true } },
          },
        }),
        this.prisma.rentInvoice.count({ where }),
        this.prisma.rentInvoice.aggregate({
          where: { ...where, status: 'PAID', collectionType: 'AUTOPAY' },
          _sum: { amount: true, platformFee: true },
        }),
        this.prisma.rentInvoice.aggregate({
          where: { ...where, razorpayTransferId: { not: null } },
          _sum: { transferAmount: true },
        }),
      ]);
    return {
      ...buildOffsetResponse(items, total, query.page, query.limit),
      totals: {
        grossPaise: paidInvoices._sum.amount ?? 0,
        platformFeesPaise: paidInvoices._sum.platformFee ?? 0,
        ownerTransfersPaise: historicalTransfers._sum.transferAmount ?? 0,
      },
    };
  }

  async pendingTransactions(organizationId?: string) {
    const organization = organizationId ? { organizationId } : {};
    const [payments, invoices, payoutAccounts, totals] =
      await this.prisma.$transaction([
        this.prisma.payment.findMany({
          where: { ...organization, status: { in: ['PENDING', 'DISPUTED'] } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: 100,
          select: {
            id: true,
            organizationId: true,
            amount: true,
            status: true,
            mode: true,
            reference: true,
            createdAt: true,
            resident: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
        this.prisma.rentInvoice.findMany({
          where: { ...organization, status: { in: ['PENDING', 'FAILED'] } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: 100,
          select: {
            id: true,
            organizationId: true,
            invoiceNumber: true,
            amount: true,
            platformFee: true,
            transferAmount: true,
            status: true,
            failureReason: true,
            retryCount: true,
            dueDate: true,
            createdAt: true,
          },
        }),
        this.prisma.landlordPayoutAccount.findMany({
          where: {
            ...organization,
            OR: [
              { status: 'PENDING' },
              { kycStatus: { in: ['PENDING', 'SUBMITTED'] } },
            ],
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: 100,
          select: {
            id: true,
            organizationId: true,
            businessName: true,
            accountNumberMasked: true,
            status: true,
            kycStatus: true,
            createdAt: true,
          },
        }),
        this.prisma.payment.aggregate({
          where: { ...organization, status: { in: ['PENDING', 'DISPUTED'] } },
          _count: true,
          _sum: { amount: true, gatewayRefundedAmount: true },
        }),
      ]);
    return {
      summary: {
        pendingPayments: totals._count,
        pendingPaymentAmountPaise: totals._sum.amount ?? 0,
        pendingInvoices: invoices.length,
        pendingPayoutAccounts: payoutAccounts.length,
        truncated:
          payments.length === 100 ||
          invoices.length === 100 ||
          payoutAccounts.length === 100,
      },
      payments,
      invoices,
      payoutAccounts,
    };
  }

  async auditLogs(query: AdminAuditQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.action
        ? { action: { contains: query.action, mode: 'insensitive' } }
        : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.from || query.to
        ? { createdAt: { gte: query.from, lte: query.to } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { action: { contains: query.search, mode: 'insensitive' } },
              { entityType: { contains: query.search, mode: 'insensitive' } },
              { entityId: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          organization: { select: { id: true, name: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return buildOffsetResponse(items, total, query.page, query.limit);
  }

  async platformReport(
    query: AdminDashboardQueryDto & { page?: number; limit?: number },
  ) {
    const from =
      query.from ?? new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    const to = query.to ?? new Date();
    const where = query.organizationId ? { id: query.organizationId } : {};
    const pageSize = query.limit ?? 20;
    const organizationsQuery = this.prisma.organization.findMany({
      where,
      select: { id: true, name: true, slug: true, isActive: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      ...(query.page
        ? { skip: (query.page - 1) * pageSize, take: pageSize }
        : {}),
    });
    const [organizations, total] = await Promise.all([
      organizationsQuery,
      query.page ? this.prisma.organization.count({ where }) : undefined,
    ]);
    const meta =
      query.page && total !== undefined
        ? buildOffsetResponse([], total, query.page, pageSize).meta
        : undefined;
    if (!organizations.length)
      return { period: { from, to }, organizations: [], ...(meta && { meta }) };
    const organization =
      query.page || query.organizationId
        ? { organizationId: { in: organizations.map((item) => item.id) } }
        : {};
    const [collections, expenses, dues, residents, properties] =
      await this.prisma.$transaction([
        this.prisma.payment.groupBy({
          by: ['organizationId'],
          where: {
            ...organization,
            status: 'CONFIRMED',
            collectionDate: { gte: from, lte: to },
          },
          _sum: { amount: true, gatewayRefundedAmount: true },
          _count: true,
        }),
        this.prisma.expense.groupBy({
          by: ['organizationId'],
          where: { ...organization, expenseDate: { gte: from, lte: to } },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.billingRecord.groupBy({
          by: ['organizationId'],
          where: {
            ...organization,
            status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
          },
          _sum: { amount: true, paidAmount: true },
        }),
        this.prisma.resident.groupBy({
          by: ['organizationId'],
          where: {
            ...organization,
            status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
          },
          _count: true,
        }),
        this.prisma.property.groupBy({
          by: ['organizationId'],
          where: { ...organization, status: 'ACTIVE' },
          _count: true,
        }),
      ]);
    const byOrganization = <T extends { organizationId: string }>(rows: T[]) =>
      new Map(rows.map((row) => [row.organizationId, row]));
    const collectionByOrg = byOrganization(collections);
    const expenseByOrg = byOrganization(expenses);
    const dueByOrg = byOrganization(dues);
    const residentsByOrg = byOrganization(residents);
    const propertiesByOrg = byOrganization(properties);
    return {
      period: { from, to },
      ...(meta && { meta }),
      organizations: organizations.map((organization) => {
        const { id } = organization;
        const collection = collectionByOrg.get(id);
        const expense = expenseByOrg.get(id);
        const due = dueByOrg.get(id);
        return {
          ...organization,
          properties: propertiesByOrg.get(id)?._count ?? 0,
          residents: residentsByOrg.get(id)?._count ?? 0,
          collections: collection?._count ?? 0,
          collectedPaise:
            (collection?._sum.amount ?? 0) -
            (collection?._sum.gatewayRefundedAmount ?? 0),
          expensesPaise: expense?._sum.amount ?? 0,
          outstandingPaise: Math.max(
            0,
            (due?._sum.amount ?? 0) - (due?._sum.paidAmount ?? 0),
          ),
        };
      }),
    };
  }

  async platformReportCsv(query: AdminDashboardQueryDto) {
    const report = await this.platformReport(query);
    const escape = (value: unknown) => {
      let text = String(value ?? '');
      // Prevent spreadsheet formula execution when an exported name or slug is
      // opened in Excel/Sheets.
      if (/^[\t\r\n]|^\s*[=+\-@]/.test(text)) text = `'${text}`;
      return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    };
    const header = [
      'organization_id',
      'organization_name',
      'slug',
      'active',
      'properties',
      'residents',
      'collections',
      'collected_paise',
      'expenses_paise',
      'outstanding_paise',
    ];
    const rows = report.organizations.map((item) =>
      [
        item.id,
        item.name,
        item.slug,
        item.isActive,
        item.properties,
        item.residents,
        item.collections,
        item.collectedPaise,
        item.expensesPaise,
        item.outstandingPaise,
      ]
        .map(escape)
        .join(','),
    );
    return `\uFEFF${[header.join(','), ...rows].join('\r\n')}\r\n`;
  }
}
