var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { confirmedCollectionLines, paymentPropertyScope, } from '../domain/collection-lines.js';
import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/index.js';
import { ConflictError, NotFoundError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { dateKeyInTimeZone } from '../../../common/time/property-date.js';
const payable = ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'];
const tenantSelect = {
    id: true,
    firstName: true,
    lastName: true,
    mobile: true,
    whatsappNumber: true,
    parentName: true,
    parentPhone: true,
    propertyId: true,
    property: { select: { name: true } },
    room: { select: { roomNumber: true } },
    bed: { select: { bedNumber: true } },
};
let MoneyService = class MoneyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    audit(tx, org, user, action, entityType, entityId, metadata) {
        return tx.auditLog.create({
            data: {
                organizationId: org,
                userId: user,
                action,
                entityType,
                entityId,
                metadata,
            },
        });
    }
    async resident(id, org) {
        const r = await this.prisma.resident.findFirst({
            where: { id, organizationId: org },
            select: tenantSelect,
        });
        if (!r)
            throw new NotFoundError('Resident', id);
        return r;
    }
    async properties(org, q) {
        const where = {
            organizationId: org,
            status: { not: 'ARCHIVED' },
            ...(q.search
                ? { name: { contains: q.search, mode: 'insensitive' } }
                : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.property.findMany({
                where,
                select: { id: true, name: true, type: true },
                orderBy: [{ name: 'asc' }, { id: 'asc' }],
                skip: (q.page - 1) * q.limit,
                take: q.limit,
            }),
            this.prisma.property.count({ where }),
        ]);
        return buildOffsetResponse(data, total, q.page, q.limit);
    }
    async property(id, org) {
        const item = await this.prisma.property.findFirst({
            where: { id, organizationId: org, status: { not: 'ARCHIVED' } },
            select: { id: true, name: true, type: true },
        });
        if (!item)
            throw new NotFoundError('Property', id);
        return item;
    }
    async packages(org, q) {
        const where = {
            organizationId: org,
            ...(q.active === 'ALL' ? {} : { isActive: q.active === 'ACTIVE' }),
            ...(q.search
                ? {
                    OR: [
                        { name: { contains: q.search, mode: 'insensitive' } },
                        { category: { contains: q.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [items, total] = await Promise.all([
            this.prisma.duePackage.findMany({
                where,
                orderBy: [{ name: 'asc' }, { id: 'asc' }],
                skip: (q.page - 1) * q.limit,
                take: q.limit,
            }),
            this.prisma.duePackage.count({ where }),
        ]);
        return buildOffsetResponse(items, total, q.page, q.limit);
    }
    async savePackage(org, user, dto, id) {
        const { version, ...data } = dto;
        return this.prisma.$transaction(async (tx) => {
            if (id && !version)
                throw new BadRequestException('Package version is required');
            if (id &&
                !(await tx.duePackage.findFirst({
                    where: { id, organizationId: org, version },
                })))
                throw new ConflictError('Package changed; reload before editing');
            const item = id
                ? await tx.duePackage.update({
                    where: { id, organizationId: org, version },
                    data: { ...data, version: { increment: 1 } },
                })
                : await tx.duePackage.create({
                    data: { ...data, organizationId: org },
                });
            await this.audit(tx, org, user, id ? 'money.package.update' : 'money.package.create', 'DuePackage', item.id, { name: item.name, isActive: item.isActive });
            return item;
        });
    }
    duesWhere(org, q) {
        const today = new Date(dateKeyInTimeZone(new Date(), 'Asia/Kolkata'));
        let from;
        let to;
        if (q.date !== 'ALL') {
            from = new Date(today);
            to = new Date(today);
            if (q.date === 'YESTERDAY') {
                from.setUTCDate(from.getUTCDate() - 1);
                to = new Date(from);
            }
            if (q.date === '30_DAYS')
                from.setUTCDate(from.getUTCDate() - 29);
            if (q.date === '3_MONTHS' || q.date === '6_MONTHS') {
                const month = today.getUTCMonth() - (q.date === '3_MONTHS' ? 3 : 6);
                const year = today.getUTCFullYear();
                const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
                from = new Date(Date.UTC(year, month, Math.min(today.getUTCDate(), lastDay)));
            }
        }
        const conditions = [
            Prisma.sql `b.organization_id = ${org}::uuid`,
            Prisma.sql `b.status IN ('ISSUED','DUE','PARTIALLY_PAID','OVERDUE')`,
            Prisma.sql `b.amount > b.paid_amount`,
        ];
        if (q.propertyId)
            conditions.push(Prisma.sql `b.property_id = ${q.propertyId}::uuid`);
        if (from)
            conditions.push(Prisma.sql `b.due_date >= ${from.toISOString().slice(0, 10)}::date`);
        if (to)
            conditions.push(Prisma.sql `b.due_date <= ${to.toISOString().slice(0, 10)}::date`);
        if (q.defaulter === 'RENT')
            conditions.push(Prisma.sql `b.type = 'RENT'`);
        if (q.defaulter === 'OTHER')
            conditions.push(Prisma.sql `b.type <> 'RENT'`);
        if (q.type)
            conditions.push(q.type === 'WIFI'
                ? Prisma.sql `b.type = 'OTHER' AND b.description ILIKE '%Wi-Fi%'`
                : Prisma.sql `b.type = ${q.type}::billing_type`);
        if (q.search) {
            const search = `%${q.search.replace(/[\\%_]/g, '\\$&')}%`;
            conditions.push(Prisma.sql `(concat_ws(' ',r.first_name,r.last_name) ILIKE ${search} OR r.mobile ILIKE ${search} OR room.room_number ILIKE ${search})`);
        }
        return Prisma.join(conditions, ' AND ');
    }
    async dues(org, q) {
        const where = this.duesWhere(org, q);
        const ordering = {
            DATE_ASC: Prisma.sql `"dueDate" ASC`,
            DATE_DESC: Prisma.sql `"dueDate" DESC`,
            ROOM: Prisma.sql `"roomNumber" ASC NULLS LAST`,
            AMOUNT_ASC: Prisma.sql `outstanding ASC`,
            AMOUNT_DESC: Prisma.sql `outstanding DESC`,
        }[q.sort];
        const today = new Date(dateKeyInTimeZone(new Date(), 'Asia/Kolkata'));
        const [result] = await this.prisma.$queryRaw(Prisma.sql `
      WITH grouped AS (
        SELECT b.resident_id AS id,SUM(b.amount::bigint-b.paid_amount)::float8 AS outstanding,
          MIN(b.due_date) AS "dueDate",MAX(room.room_number) AS "roomNumber"
        FROM billing_records b JOIN residents r ON r.id=b.resident_id
        LEFT JOIN rooms room ON room.id=r.room_id
        WHERE ${where} GROUP BY b.resident_id
      ), page AS (
        SELECT * FROM grouped ORDER BY ${ordering},id ASC
        OFFSET ${(q.page - 1) * q.limit} LIMIT ${q.limit}
      ) SELECT (SELECT COUNT(*)::int FROM grouped) AS total,
        (SELECT jsonb_agg(jsonb_build_object(
          'id',g.id,'outstanding',g.outstanding,'dueDate',g."dueDate",
          'overdueDays',GREATEST(0,${today.toISOString().slice(0, 10)}::date-g."dueDate"),
          'resident',jsonb_build_object('id',r.id,'firstName',r.first_name,'lastName',r.last_name,
            'mobile',r.mobile,'whatsappNumber',r.whatsapp_number,'parentName',r.parent_name,
            'parentPhone',r.parent_phone,'propertyId',r.property_id,
            'property',jsonb_build_object('name',p.name),'room',jsonb_build_object('roomNumber',room.room_number),
            'bed',jsonb_build_object('bedNumber',bed.bed_number))
        ) ORDER BY ${ordering},g.id ASC)
        FROM page g JOIN residents r ON r.id=g.id AND r.organization_id=${org}::uuid
        JOIN properties p ON p.id=r.property_id LEFT JOIN rooms room ON room.id=r.room_id
        LEFT JOIN beds bed ON bed.id=r.bed_id) AS data
    `);
        return buildOffsetResponse(result?.data ?? [], result?.total ?? 0, q.page, q.limit);
    }
    async summary(org, propertyId) {
        const today = new Date(dateKeyInTimeZone(new Date(), 'Asia/Kolkata'));
        const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
        const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
        const todayKey = today.toISOString().slice(0, 10);
        const startKey = start.toISOString().slice(0, 10);
        const endKey = end.toISOString().slice(0, 10);
        const scope = Prisma.sql `organization_id=${org}::uuid ${propertyId ? Prisma.sql `AND property_id=${propertyId}::uuid` : Prisma.empty}`;
        const [dues, collections, expenses, categories, reconciliation] = await Promise.all([
            this.prisma.$queryRaw(Prisma.sql `SELECT COALESCE(SUM(amount::bigint-paid_amount),0)::float8 AS "allDues", COALESCE(SUM(amount::bigint-paid_amount) FILTER(WHERE due_date<=${todayKey}::date),0)::float8 AS "currentDues", COALESCE(SUM(amount::bigint-paid_amount) FILTER(WHERE due_date>=${startKey}::date AND due_date<${endKey}::date),0)::float8 AS "monthDues", COALESCE(SUM(amount::bigint-paid_amount) FILTER(WHERE type='RENT'),0)::float8 AS "unpaidRent" FROM billing_records WHERE ${scope} AND status IN ('ISSUED','DUE','PARTIALLY_PAID','OVERDUE')`),
            this.prisma.$queryRaw(Prisma.sql `
            WITH collections AS (${confirmedCollectionLines(org, propertyId)})
            SELECT COALESCE(SUM(amount), 0)::float8 AS "totalCollection",
              COALESCE(SUM(amount) FILTER (WHERE collection_date >= ${startKey}::date AND collection_date < ${endKey}::date
                AND category IS NULL), 0)::float8 AS "monthUnattributedCollection",
              COALESCE(SUM(amount) FILTER (WHERE collection_date >= ${startKey}::date AND collection_date < ${endKey}::date), 0)::float8 AS "monthCollection",
              COALESCE(SUM(amount) FILTER (WHERE collection_date >= ${startKey}::date AND collection_date < ${endKey}::date
                AND due_date >= ${startKey}::date AND due_date < ${endKey}::date), 0)::float8 AS "monthDuesCollection",
              COALESCE(SUM(amount) FILTER (WHERE collection_date >= ${startKey}::date AND collection_date < ${endKey}::date
                AND category = 'RENT'), 0)::float8 AS "monthRentCollection",
              COALESCE(SUM(amount) FILTER (WHERE collection_date >= ${startKey}::date AND collection_date < ${endKey}::date
                AND category = 'ELECTRICITY'), 0)::float8 AS "monthElectricityCollection"
            FROM collections
          `),
            this.prisma.$queryRaw(Prisma.sql `SELECT COALESCE(SUM(e.amount),0)::float8 AS "monthExpenses", COALESCE(SUM(e.amount) FILTER(WHERE LOWER(c.name) IN ('salary','salaries')),0)::float8 AS "salaryExpenses", COALESCE(SUM(e.amount) FILTER(WHERE LOWER(c.name) IN ('rent','rent expenses')),0)::float8 AS "rentExpenses" FROM expenses e JOIN expense_categories c ON c.id=e.category_id WHERE e.organization_id=${org}::uuid AND e.expense_date>=${startKey}::date AND e.expense_date<${endKey}::date ${propertyId ? Prisma.sql `AND e.property_id=${propertyId}::uuid` : Prisma.empty}`),
            this.prisma.expenseCategory.count({
                where: { organizationId: org, isActive: true },
            }),
            this.prisma.payment.aggregate({
                where: {
                    organizationId: org,
                    status: 'DISPUTED',
                    ...paymentPropertyScope(propertyId),
                },
                _count: true,
                _sum: { amount: true, gatewayRefundedAmount: true },
            }),
        ]);
        return {
            ...dues[0],
            ...collections[0],
            ...expenses[0],
            activeExpenseCategories: categories,
            reconciliationCount: reconciliation._count,
            reconciliationAmount: (reconciliation._sum.amount ?? 0) -
                (reconciliation._sum.gatewayRefundedAmount ?? 0),
            asOf: new Date().toISOString(),
        };
    }
    async paymentContext(id, org) {
        const resident = await this.resident(id, org);
        const [bills, offer] = await Promise.all([
            this.prisma.billingRecord.findMany({
                where: {
                    organizationId: org,
                    residentId: id,
                    status: { in: [...payable] },
                },
                orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
                include: { _count: { select: { rentInvoices: true } } },
            }),
            this.prisma.discountOffer.findFirst({
                where: {
                    organizationId: org,
                    residentId: id,
                    consumedAt: null,
                    validTill: {
                        gte: new Date(dateKeyInTimeZone(new Date(), 'Asia/Kolkata')),
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const totalDues = bills.reduce((s, b) => s + Math.max(0, b.amount - b.paidAmount), 0);
        const discountable = bills
            .filter((b) => b._count.rentInvoices === 0)
            .reduce((s, b) => s + Math.max(0, b.amount - b.paidAmount), 0);
        return {
            resident,
            bills: bills.filter((b) => b.amount > b.paidAmount),
            offer: offer && offer.amount < totalDues && offer.amount <= discountable
                ? offer
                : null,
            totalDues,
        };
    }
    async offer(id, org, user, dto) {
        await this.resident(id, org);
        if (dto.validTill < dateKeyInTimeZone(new Date(), 'Asia/Kolkata'))
            throw new BadRequestException('Discount expiry is in the past');
        return this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM residents WHERE id=${id}::uuid AND organization_id=${org}::uuid FOR UPDATE`;
            const bills = await tx.billingRecord.findMany({
                where: {
                    residentId: id,
                    organizationId: org,
                    status: { in: [...payable] },
                },
                include: { _count: { select: { rentInvoices: true } } },
            });
            const total = bills.reduce((s, b) => s + Math.max(0, b.amount - b.paidAmount), 0);
            const discountable = bills
                .filter((b) => b._count.rentInvoices === 0)
                .reduce((s, b) => s + Math.max(0, b.amount - b.paidAmount), 0);
            if (dto.amount > discountable ||
                (dto.minimumAmount ?? 0) > total - dto.amount)
                throw new BadRequestException('Discount or minimum payment exceeds eligible dues');
            await tx.discountOffer.updateMany({
                where: { residentId: id, organizationId: org, consumedAt: null },
                data: { consumedAt: new Date() },
            });
            const item = await tx.discountOffer.create({
                data: {
                    ...dto,
                    validTill: new Date(dto.validTill),
                    organizationId: org,
                    residentId: id,
                    consumedAt: dto.minimumPayment === 'FULL' && dto.amount === total
                        ? new Date()
                        : null,
                },
            });
            if (dto.minimumPayment === 'FULL' && dto.amount === total) {
                const eligible = bills.filter((b) => b.amount > b.paidAmount && b._count.rentInvoices === 0);
                const count = await tx.$executeRaw(Prisma.sql `UPDATE billing_records b SET discount_amount=b.discount_amount+(b.amount-b.paid_amount),amount=b.paid_amount,status='PAID',version=b.version+1,updated_at=NOW() FROM (VALUES ${Prisma.join(eligible.map((b) => Prisma.sql `(${b.id}::uuid,${b.version}::int)`))}) AS v(id,version) WHERE b.id=v.id AND b.version=v.version AND b.organization_id=${org}::uuid`);
                if (count !== eligible.length)
                    throw new ConflictError('Dues changed while giving the discount; reload before retrying');
            }
            await this.audit(tx, org, user, 'money.discount.offer', 'Resident', id, {
                offerId: item.id,
                amount: dto.amount,
                description: dto.description,
            });
            return item;
        });
    }
    async record(dto, org, user) {
        if (dto.collectionDate > dateKeyInTimeZone(new Date(), 'Asia/Kolkata'))
            throw new BadRequestException('Collection date cannot be in the future');
        return this.prisma.$transaction(async (tx) => {
            const resident = await tx.resident.findFirst({
                where: { id: dto.residentId, organizationId: org },
                select: { id: true },
            });
            if (!resident)
                throw new NotFoundError('Resident', dto.residentId);
            await tx.$queryRaw `SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${org + ':' + dto.idempotencyKey},0))`;
            await tx.$queryRaw `SELECT id FROM residents WHERE id=${resident.id}::uuid FOR UPDATE`;
            const prefix = `money:${org}:${dto.idempotencyKey}:`;
            const previous = await tx.payment.findMany({
                where: { organizationId: org, idempotencyKey: { startsWith: prefix } },
                orderBy: { id: 'asc' },
            });
            if (previous.length) {
                if (previous.reduce((s, p) => s + p.amount, 0) !== dto.amount ||
                    previous.some((p) => p.residentId !== dto.residentId ||
                        p.mode !== dto.mode ||
                        (p.notes ?? '') !== (dto.notes ?? '') ||
                        (p.proofUrl ?? null) !== (dto.proofUrl ?? null) ||
                        p.collectionDate.toISOString().slice(0, 10) !==
                            dto.collectionDate) ||
                    previous.length !== dto.allocations.length ||
                    previous.some((p) => !dto.allocations.some((a) => a.billingRecordId === p.billingRecordId &&
                        a.amount === p.amount)))
                    throw new ConflictError('Idempotency key reused with different payment details');
                return { payments: previous, replayed: true };
            }
            const bills = await tx.billingRecord.findMany({
                where: {
                    residentId: dto.residentId,
                    organizationId: org,
                    status: { in: [...payable] },
                },
                include: { _count: { select: { rentInvoices: true } } },
                orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
            });
            const total = bills.reduce((s, b) => s + b.amount - b.paidAmount, 0);
            const offer = await tx.discountOffer.findFirst({
                where: {
                    residentId: dto.residentId,
                    organizationId: org,
                    consumedAt: null,
                    validTill: {
                        gte: new Date(dateKeyInTimeZone(new Date(), 'Asia/Kolkata')),
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            const discount = offer &&
                offer.amount < total &&
                offer.amount <=
                    bills
                        .filter((b) => b._count.rentInvoices === 0)
                        .reduce((s, b) => s + Math.max(0, b.amount - b.paidAmount), 0) &&
                dto.amount >=
                    (offer.minimumPayment === 'FULL'
                        ? total - offer.amount
                        : (offer.minimumAmount ?? total))
                ? offer.amount
                : 0;
            if (dto.amount > total - discount)
                throw new ConflictError('Payment exceeds current net receivable; reload dues');
            const allocationMap = new Map(dto.allocations.map((a) => [a.billingRecordId, a.amount]));
            for (const a of dto.allocations) {
                const bill = bills.find((b) => b.id === a.billingRecordId);
                if (!bill || a.amount > bill.amount - bill.paidAmount)
                    throw new ConflictError('Payment breakup exceeds current dues');
            }
            let remainingDiscount = discount;
            const paymentData = [];
            const updates = [];
            const invoiceBills = [];
            for (const bill of bills) {
                const cash = allocationMap.get(bill.id) ?? 0;
                const reduction = bill._count.rentInvoices === 0
                    ? Math.min(remainingDiscount, Math.max(0, bill.amount - bill.paidAmount - cash))
                    : 0;
                remainingDiscount -= reduction;
                if (!cash && !reduction)
                    continue;
                const paid = bill.paidAmount + cash, amount = bill.amount - reduction;
                const status = paid === amount ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : bill.status;
                updates.push(Prisma.sql `(${bill.id}::uuid,${bill.version}::int,${amount}::int,${paid}::int,${reduction}::int,${status}::billing_status)`);
                if (cash && status === 'PAID' && bill._count.rentInvoices > 0)
                    invoiceBills.push(bill.id);
                if (cash)
                    paymentData.push({
                        organizationId: org,
                        residentId: dto.residentId,
                        billingRecordId: bill.id,
                        capturePropertyId: bill.propertyId,
                        amount: cash,
                        mode: dto.mode,
                        status: 'CONFIRMED',
                        collectionDate: new Date(dto.collectionDate),
                        notes: dto.notes,
                        proofUrl: dto.proofUrl,
                        recordedBy: user,
                        idempotencyKey: prefix + bill.id,
                    });
            }
            if (remainingDiscount > 0)
                throw new ConflictError('Discount cannot be allocated to the selected payment breakup');
            const affected = await tx.$executeRaw(Prisma.sql `
        UPDATE billing_records b SET amount=v.amount,paid_amount=v.paid,
          discount_amount=b.discount_amount+v.reduction,status=v.status,version=b.version+1,updated_at=NOW()
        FROM (VALUES ${Prisma.join(updates)}) AS v(id,version,amount,paid,reduction,status)
        WHERE b.id=v.id AND b.version=v.version AND b.organization_id=${org}::uuid
      `);
            if (affected !== updates.length)
                throw new ConflictError('Dues changed during payment; reload before retrying');
            const payments = await tx.payment.createManyAndReturn({
                data: paymentData,
            });
            if (invoiceBills.length)
                await tx.rentInvoice.updateMany({
                    where: {
                        organizationId: org,
                        billingRecordId: { in: invoiceBills },
                        status: { in: ['PENDING', 'FAILED'] },
                    },
                    data: {
                        status: 'PAID',
                        paidAt: new Date(dto.collectionDate),
                        collectionType: 'MANUAL_COLLECTION',
                    },
                });
            if (discount && offer)
                await tx.discountOffer.update({
                    where: { id: offer.id },
                    data: { consumedAt: new Date() },
                });
            await this.audit(tx, org, user, 'money.payment.record', 'Resident', dto.residentId, {
                amount: dto.amount,
                discount,
                paymentIds: payments.map((p) => p.id),
                idempotencyKey: dto.idempotencyKey,
            });
            return { payments, discount, replayed: false };
        });
    }
    async remark(id, org, user, description) {
        await this.resident(id, org);
        return this.audit(this.prisma, org, user, 'money.remark', 'Resident', id, {
            description,
        });
    }
    async parties(org, q) {
        const where = {
            organizationId: org,
            ...(q.search
                ? { name: { contains: q.search, mode: 'insensitive' } }
                : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.expenseParty.findMany({
                where,
                orderBy: [{ name: 'asc' }, { id: 'asc' }],
                skip: (q.page - 1) * q.limit,
                take: q.limit,
            }),
            this.prisma.expenseParty.count({ where }),
        ]);
        return buildOffsetResponse(data, total, q.page, q.limit);
    }
    async createParty(org, name) {
        return this.prisma.expenseParty.upsert({
            where: { organizationId_name: { organizationId: org, name } },
            create: { organizationId: org, name },
            update: {},
        });
    }
    async linkBank(id, org, user, propertyId) {
        return this.prisma.$transaction(async (tx) => {
            if (propertyId &&
                !(await tx.property.findFirst({
                    where: { id: propertyId, organizationId: org },
                })))
                throw new NotFoundError('Property', propertyId);
            const account = await tx.landlordPayoutAccount.findFirst({
                where: { id, organizationId: org },
            });
            if (!account)
                throw new NotFoundError('Bank account', id);
            const activeMandates = await tx.tenantMandate.count({
                where: {
                    landlordPayoutAccountId: id,
                    status: {
                        in: ['ACTIVE', 'PENDING', 'CREATED', 'AUTHENTICATED', 'PAUSED'],
                    },
                },
            });
            if (activeMandates && propertyId !== account.propertyId)
                throw new ConflictError('Account has live mandates; update their payout configuration first');
            const updated = await tx.landlordPayoutAccount.update({
                where: { id, updatedAt: account.updatedAt },
                data: { propertyId },
            });
            await this.audit(tx, org, user, 'money.bank.link', 'LandlordPayoutAccount', id, { propertyId });
            return { id: updated.id, propertyId: updated.propertyId };
        });
    }
    async reminder(id, org) {
        const { resident, totalDues } = await this.paymentContext(id, org);
        const pending = totalDues > 0
            ? await this.prisma.payment.findFirst({
                where: {
                    organizationId: org,
                    residentId: id,
                    status: 'PENDING',
                    amount: totalDues,
                    paymentLinkId: { not: null },
                    paymentLinkUrl: { not: null },
                    paymentLinkExpiresAt: { gt: new Date() },
                },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                select: {
                    paymentLinkUrl: true,
                    paymentLinkExpiresAt: true,
                    amount: true,
                },
            })
            : null;
        const link = pending?.paymentLinkUrl ?? null;
        const linkAmount = pending?.amount ?? 0;
        return {
            resident,
            totalDues,
            paymentLink: link,
            linkAmount,
            expiresAt: pending?.paymentLinkExpiresAt ?? null,
            message: `Hello ${resident.firstName}, your outstanding dues at ${resident.property.name} are ₹${(totalDues / 100).toFixed(2)}. Please clear your dues.${link ? ` Pay securely here: ${link}` : ' Please contact the property manager for payment details.'}`,
        };
    }
    async *report(kind, org, q) {
        if (!['dues', 'collections', 'expenses'].includes(kind))
            throw new BadRequestException('Unknown report type');
        if (q.startDate && q.endDate && q.startDate > q.endDate)
            throw new BadRequestException('Invalid date range');
        const range = {
            ...(q.startDate ? { gte: new Date(q.startDate) } : {}),
            ...(q.endDate ? { lte: new Date(q.endDate) } : {}),
        };
        const csv = (row) => row
            .map((value) => {
            let cell = String(value ?? '');
            if (/^\s*[=+@-]/.test(cell))
                cell = "'" + cell;
            return '"' + cell.replaceAll('"', '""') + '"';
        })
            .join(',') + '\r\n';
        yield '\uFEFF' +
            csv([
                'ID',
                'Date',
                'Tenant / Category',
                'Property',
                'Type / Mode',
                'Amount (INR)',
                'Outstanding (INR)',
                'Description',
            ]);
        let after;
        for (;;) {
            const scope = {
                organizationId: org,
                ...(after ? { id: { gt: after } } : {}),
            };
            const tenantSearch = q.search
                ? {
                    OR: [
                        {
                            firstName: { contains: q.search, mode: 'insensitive' },
                        },
                        {
                            lastName: { contains: q.search, mode: 'insensitive' },
                        },
                        { mobile: { contains: q.search } },
                    ],
                }
                : {};
            if (kind === 'expenses') {
                const rows = await this.prisma.expense.findMany({
                    where: {
                        ...scope,
                        ...(q.propertyId ? { propertyId: q.propertyId } : {}),
                        expenseDate: range,
                        ...(q.mode ? { paymentMode: q.mode } : {}),
                        ...(q.search
                            ? {
                                OR: [
                                    {
                                        description: { contains: q.search, mode: 'insensitive' },
                                    },
                                    {
                                        category: {
                                            name: { contains: q.search, mode: 'insensitive' },
                                        },
                                    },
                                ],
                            }
                            : {}),
                    },
                    include: {
                        category: { select: { name: true } },
                        property: { select: { name: true } },
                    },
                    orderBy: { id: 'asc' },
                    take: 500,
                });
                for (const r of rows)
                    yield csv([
                        r.id,
                        r.expenseDate.toISOString().slice(0, 10),
                        r.category.name,
                        r.property.name,
                        r.paymentMode,
                        (r.amount / 100).toFixed(2),
                        '',
                        r.description,
                    ]);
                if (rows.length < 500)
                    return;
                after = rows.at(-1).id;
            }
            else if (kind === 'collections') {
                const rows = await this.prisma.payment.findMany({
                    where: {
                        ...scope,
                        status: 'CONFIRMED',
                        collectionDate: range,
                        ...(q.mode ? { mode: q.mode } : {}),
                        ...paymentPropertyScope(q.propertyId),
                        resident: tenantSearch,
                    },
                    include: {
                        resident: {
                            select: {
                                firstName: true,
                                lastName: true,
                                property: { select: { name: true } },
                            },
                        },
                    },
                    orderBy: { id: 'asc' },
                    take: 500,
                });
                for (const r of rows)
                    yield csv([
                        r.id,
                        r.collectionDate.toISOString().slice(0, 10),
                        [r.resident.firstName, r.resident.lastName]
                            .filter(Boolean)
                            .join(' '),
                        r.resident.property.name,
                        r.mode,
                        ((r.amount - r.gatewayRefundedAmount) / 100).toFixed(2),
                        '',
                        r.notes,
                    ]);
                if (rows.length < 500)
                    return;
                after = rows.at(-1).id;
            }
            else {
                const rows = await this.prisma.billingRecord.findMany({
                    where: {
                        ...scope,
                        status: { in: [...payable] },
                        ...(q.propertyId ? { propertyId: q.propertyId } : {}),
                        dueDate: range,
                        resident: tenantSearch,
                    },
                    include: {
                        resident: {
                            select: {
                                firstName: true,
                                lastName: true,
                                property: { select: { name: true } },
                            },
                        },
                    },
                    orderBy: { id: 'asc' },
                    take: 500,
                });
                for (const r of rows)
                    if (r.amount > r.paidAmount)
                        yield csv([
                            r.id,
                            r.dueDate.toISOString().slice(0, 10),
                            [r.resident.firstName, r.resident.lastName]
                                .filter(Boolean)
                                .join(' '),
                            r.resident.property.name,
                            r.type,
                            (r.amount / 100).toFixed(2),
                            ((r.amount - r.paidAmount) / 100).toFixed(2),
                            r.description,
                        ]);
                if (rows.length < 500)
                    return;
                after = rows.at(-1).id;
            }
        }
    }
};
MoneyService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], MoneyService);
export { MoneyService };
//# sourceMappingURL=money.service.js.map