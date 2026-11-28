var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ConflictException, Injectable, NotFoundException, } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../../finance/infrastructure/razorpay.adapter.js';
import { BankAccountCipher } from '../../finance/infrastructure/bank-account-cipher.js';
import { AdminAuditService, } from './admin-audit.service.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
const recordedOnlinePayments = {
    mode: 'RAZORPAY',
    razorpayPaymentId: { not: null },
};
let AdminCollectionsService = class AdminCollectionsService {
    prisma;
    gateway;
    bankCipher;
    audit;
    constructor(prisma, gateway, bankCipher, audit) {
        this.prisma = prisma;
        this.gateway = gateway;
        this.bankCipher = bankCipher;
        this.audit = audit;
    }
    async list(query, actor) {
        const where = {
            ...recordedOnlinePayments,
            organizationId: query.organizationId,
            status: query.status,
            ...(query.from || query.to
                ? { collectionDate: { gte: query.from, lte: query.to } }
                : {}),
            ...(query.search
                ? {
                    OR: [
                        { razorpayPaymentId: { contains: query.search } },
                        { razorpayOrderId: { contains: query.search } },
                        { paymentLinkId: { contains: query.search } },
                        { gatewayQrId: { contains: query.search } },
                        { reference: { contains: query.search, mode: 'insensitive' } },
                        {
                            manualPayout: {
                                bankReference: {
                                    contains: query.search,
                                    mode: 'insensitive',
                                },
                            },
                        },
                        { settlement: { providerId: { contains: query.search } } },
                        {
                            resident: {
                                firstName: { contains: query.search, mode: 'insensitive' },
                            },
                        },
                        {
                            resident: {
                                lastName: { contains: query.search, mode: 'insensitive' },
                            },
                        },
                    ],
                }
                : {}),
        };
        const [items, count, totals] = await this.prisma.$transaction([
            this.prisma.payment.findMany({
                where,
                orderBy: [{ collectionDate: 'desc' }, { id: 'desc' }],
                skip: (query.page - 1) * query.limit,
                take: query.limit,
                select: {
                    id: true,
                    organizationId: true,
                    amount: true,
                    status: true,
                    reference: true,
                    collectionDate: true,
                    capturedAt: true,
                    capturePropertyId: true,
                    capturePlatformFee: true,
                    gatewayRefundedAmount: true,
                    razorpayPaymentId: true,
                    razorpayOrderId: true,
                    paymentLinkId: true,
                    gatewayQrId: true,
                    notes: true,
                    settlement: true,
                    manualPayout: true,
                    resident: {
                        select: {
                            firstName: true,
                            lastName: true,
                            property: { select: { id: true, name: true } },
                        },
                    },
                    billingRecord: { select: { propertyId: true } },
                },
            }),
            this.prisma.payment.count({ where }),
            this.prisma.$queryRaw `
        SELECT COALESCE(SUM(p.amount), 0) AS captured,
          COALESCE(SUM(p.gateway_refunded_amount), 0) AS refunded,
          COALESCE(SUM(p.amount - p.gateway_refunded_amount) FILTER
            (WHERE s.payment_id IS NULL AND i.razorpay_transfer_id IS NULL), 0) AS pending_settlement,
          COALESCE(SUM(GREATEST(0, s.net_amount - COALESCE(p.capture_platform_fee, CASE WHEN i.collection_type = 'AUTOPAY' THEN i.platform_fee END, 0))) FILTER
            (WHERE t.payment_id IS NULL AND s.route_clear AND p.status = 'CONFIRMED' AND p.gateway_refunded_amount = 0 AND i.razorpay_transfer_id IS NULL), 0) AS owner_payable,
          COALESCE(SUM(t.amount) FILTER (WHERE t.paid_on IS NULL), 0) AS payout_in_progress,
          COALESCE(SUM(t.amount) FILTER (WHERE t.paid_on IS NOT NULL), 0) AS paid_out,
          COALESCE(SUM(i.transfer_amount) FILTER (WHERE i.razorpay_transfer_id IS NOT NULL), 0) AS route_transferred,
          COALESCE(SUM(CASE
            WHEN t.payment_id IS NOT NULL AND p.gateway_refunded_amount > 0 THEN t.amount
            WHEN p.status = 'DISPUTED' THEN p.amount - p.gateway_refunded_amount
            ELSE 0
          END), 0) AS needs_review
        FROM payments p
        LEFT JOIN gateway_settlements s ON s.payment_id = p.id
        LEFT JOIN manual_payouts t ON t.payment_id = p.id
        LEFT JOIN LATERAL (
          SELECT collection_type, platform_fee, transfer_amount, razorpay_transfer_id FROM rent_invoices
          WHERE razorpay_payment_id = p.razorpay_payment_id AND organization_id = p.organization_id
          ORDER BY (razorpay_transfer_id IS NOT NULL) DESC, id LIMIT 1
        ) i ON true
        WHERE p.mode = 'RAZORPAY' AND p.razorpay_payment_id IS NOT NULL
          ${query.organizationId ? Prisma.sql `AND p.organization_id = ${query.organizationId}::uuid` : Prisma.empty}
          ${query.from ? Prisma.sql `AND p.collection_date >= ${query.from.toISOString().slice(0, 10)}::date` : Prisma.empty}
          ${query.to ? Prisma.sql `AND p.collection_date <= ${query.to.toISOString().slice(0, 10)}::date` : Prisma.empty}
      `,
        ]);
        const gatewayIds = items.map((item) => item.razorpayPaymentId);
        const propertyIds = [
            ...new Set(items.flatMap((item) => [item.capturePropertyId, item.billingRecord?.propertyId].filter((id) => Boolean(id)))),
        ];
        const [invoices, properties] = await Promise.all([
            this.prisma.rentInvoice.findMany({
                where: { razorpayPaymentId: { in: gatewayIds } },
                select: {
                    organizationId: true,
                    razorpayPaymentId: true,
                    razorpayTransferId: true,
                    platformFee: true,
                    collectionType: true,
                    invoiceNumber: true,
                },
                orderBy: [
                    { razorpayTransferId: { sort: 'asc', nulls: 'last' } },
                    { id: 'asc' },
                ],
            }),
            this.prisma.property.findMany({
                where: { id: { in: propertyIds } },
                select: { id: true, name: true, organizationId: true },
            }),
        ]);
        const rows = items.map((item) => {
            const invoice = invoices.find((inv) => inv.razorpayPaymentId === item.razorpayPaymentId &&
                inv.organizationId === item.organizationId);
            const property = properties.find((p) => p.id ===
                (item.capturePropertyId ?? item.billingRecord?.propertyId) &&
                p.organizationId === item.organizationId) ?? item.resident.property;
            const platformFee = item.capturePlatformFee ??
                (invoice?.collectionType === 'AUTOPAY' ? invoice.platformFee : 0);
            const ownerPayable = item.settlement?.routeClear &&
                !item.manualPayout &&
                !invoice?.razorpayTransferId &&
                item.status === 'CONFIRMED' &&
                item.gatewayRefundedAmount === 0
                ? Math.max(0, item.settlement.netAmount - platformFee)
                : 0;
            const manualPayout = item.manualPayout
                ? {
                    ...item.manualPayout,
                    canComplete: item.manualPayout.preparedBy === actor.userId ||
                        actor.role === 'SUPER_ADMIN',
                }
                : null;
            return {
                ...item,
                manualPayout,
                property,
                platformFee,
                ownerPayable,
                invoice,
            };
        });
        return {
            ...buildOffsetResponse(rows, count, query.page, query.limit),
            totals: Object.fromEntries(Object.entries(totals[0] ?? {}).map(([key, value]) => [
                key,
                Number(value),
            ])),
        };
    }
    async reconcile(id, date, actor, request) {
        const payment = await this.prisma.payment.findFirst({
            where: { id, ...recordedOnlinePayments },
            include: { settlement: true },
        });
        if (!payment)
            throw new NotFoundException('Captured payment not found');
        if (payment.settlement)
            return payment.settlement;
        const match = await this.gateway.findPaymentSettlement(payment.razorpayPaymentId, payment.amount, date);
        if (!match)
            throw new ConflictException('No processed settlement for this payment on the selected date');
        const legacyInvoice = payment.capturePlatformFee === null ||
            payment.capturePlatformFee === undefined
            ? await this.prisma.rentInvoice.findFirst({
                where: {
                    organizationId: payment.organizationId,
                    razorpayPaymentId: payment.razorpayPaymentId,
                    collectionType: 'AUTOPAY',
                },
                orderBy: [
                    { razorpayTransferId: { sort: 'asc', nulls: 'last' } },
                    { id: 'asc' },
                ],
            })
            : null;
        const routeClear = !legacyInvoice ||
            (!legacyInvoice.razorpayTransferId &&
                !(await this.gateway.hasPreviousRouteTransfer(payment.razorpayPaymentId)));
        return this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM payments WHERE id=${id}::uuid FOR UPDATE`;
            const existing = await tx.gatewaySettlement.findUnique({
                where: { paymentId: id },
            });
            if (existing)
                return existing;
            const row = await tx.gatewaySettlement.create({
                data: {
                    paymentId: id,
                    ...match,
                    routeClear,
                    settledOn: new Date(date),
                    recordedBy: actor.userId,
                },
            });
            await this.audit.record(actor.userId, 'platform_collection.settlement_reconciled', 'Payment', id, {
                organizationId: payment.organizationId,
                metadata: {
                    providerId: row.providerId,
                    netAmount: row.netAmount,
                    settledOn: date,
                },
                request,
                client: tx,
            });
            return row;
        });
    }
    async preparePayout(id, input, actor, request) {
        const ready = await this.prisma.payment.findFirst({
            where: { id, ...recordedOnlinePayments },
            select: { razorpayPaymentId: true, amount: true },
        });
        if (!ready)
            throw new NotFoundException('Captured payment not found');
        const gateway = await this.gateway.fetchPayment(ready.razorpayPaymentId);
        if (gateway.status !== 'captured' ||
            gateway.amount !== ready.amount ||
            gateway.currency !== 'INR' ||
            gateway.amount_refunded !== 0)
            throw new ConflictException('Razorpay reports that this payment requires reconciliation');
        return this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM payments WHERE id=${id}::uuid FOR UPDATE`;
            const payment = await tx.payment.findFirstOrThrow({
                where: { id, ...recordedOnlinePayments },
                include: {
                    settlement: true,
                    manualPayout: true,
                    resident: { select: { propertyId: true } },
                    billingRecord: { select: { propertyId: true } },
                },
            });
            if (payment.manualPayout) {
                const prior = payment.manualPayout;
                if (!prior.paidOn &&
                    prior.preparedBy === actor.userId &&
                    prior.payoutAccountId === input.payoutAccountId &&
                    prior.amount === input.amount)
                    return prior;
                throw new ConflictException('A payout already exists for this payment');
            }
            if (!payment.settlement?.routeClear ||
                payment.status !== 'CONFIRMED' ||
                payment.gatewayRefundedAmount > 0)
                throw new ConflictException('This payment requires settlement or reconciliation before payout');
            const invoice = await tx.rentInvoice.findFirst({
                where: {
                    organizationId: payment.organizationId,
                    razorpayPaymentId: payment.razorpayPaymentId,
                },
                orderBy: [
                    { razorpayTransferId: { sort: 'asc', nulls: 'last' } },
                    { id: 'asc' },
                ],
            });
            if (invoice?.razorpayTransferId)
                throw new ConflictException('Razorpay Route already transferred this payment');
            const fee = payment.capturePlatformFee ??
                (invoice?.collectionType === 'AUTOPAY' ? invoice.platformFee : 0);
            const amount = Math.max(0, payment.settlement.netAmount - fee);
            if (!amount || amount !== input.amount)
                throw new ConflictException('Payout amount changed. Reload the collection before retrying');
            const propertyId = payment.capturePropertyId ??
                payment.billingRecord?.propertyId ??
                payment.resident.propertyId;
            await tx.$queryRaw `SELECT id FROM landlord_payout_accounts WHERE id=${input.payoutAccountId}::uuid FOR UPDATE`;
            const account = await tx.landlordPayoutAccount.findFirst({
                where: {
                    id: input.payoutAccountId,
                    organizationId: payment.organizationId,
                    status: 'ACTIVE',
                    kycStatus: 'VERIFIED',
                    accountNumberEncrypted: { not: null },
                    OR: [{ propertyId }, { propertyId: null }],
                },
            });
            if (!account)
                throw new ConflictException('Select a verified payout account for this property or organization');
            const row = await tx.manualPayout.create({
                data: {
                    paymentId: id,
                    payoutAccountId: account.id,
                    amount,
                    preparedBy: actor.userId,
                    beneficiaryName: account.beneficiaryName,
                    accountMasked: account.accountNumberMasked,
                    ifscCode: account.ifscCode,
                },
            });
            await this.audit.record(actor.userId, 'platform_collection.manual_payout_prepared', 'Payment', id, {
                organizationId: payment.organizationId,
                metadata: { payoutAccountId: account.id, amount },
                request,
                client: tx,
            });
            return row;
        });
    }
    async recordPayout(id, input, actor, request) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                await tx.$queryRaw `SELECT id FROM payments WHERE id=${id}::uuid FOR UPDATE`;
                const payment = await tx.payment.findFirst({
                    where: { id, ...recordedOnlinePayments },
                    include: { settlement: true, manualPayout: true },
                });
                if (!payment?.manualPayout || !payment.settlement)
                    throw new ConflictException('Prepare the payout before recording a bank transfer');
                const payout = payment.manualPayout;
                if (payout.preparedBy !== actor.userId && actor.role !== 'SUPER_ADMIN')
                    throw new ConflictException('Another administrator is processing this payout');
                const paidOn = new Date(input.paidOn);
                if (payout.paidOn) {
                    if (payout.bankReference === input.bankReference &&
                        payout.paidOn.getTime() === paidOn.getTime())
                        return payout;
                    throw new ConflictException('A completed payout is already recorded for this payment');
                }
                if (paidOn < payment.settlement.settledOn)
                    throw new ConflictException('Payout date must follow settlement');
                const row = await tx.manualPayout.update({
                    where: { paymentId: id },
                    data: {
                        bankReference: input.bankReference,
                        paidOn,
                        recordedBy: actor.userId,
                    },
                });
                await this.audit.record(actor.userId, 'platform_collection.manual_payout_recorded', 'Payment', id, {
                    organizationId: payment.organizationId,
                    metadata: {
                        payoutAccountId: row.payoutAccountId,
                        amount: row.amount,
                        paidOn: input.paidOn,
                        bankReference: row.bankReference,
                    },
                    request,
                    client: tx,
                });
                return row;
            });
        }
        catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002')
                throw new ConflictException('This bank transfer reference is already recorded');
            throw error;
        }
    }
    async releasePayout(id, actor, request) {
        return this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM payments WHERE id=${id}::uuid FOR UPDATE`;
            const payout = await tx.manualPayout.findUnique({
                where: { paymentId: id },
                include: { payment: { select: { organizationId: true } } },
            });
            if (!payout)
                return { released: true };
            if (payout.paidOn ||
                (payout.preparedBy !== actor.userId && actor.role !== 'SUPER_ADMIN'))
                throw new ConflictException('This payout cannot be released by this administrator');
            await tx.manualPayout.delete({ where: { paymentId: id } });
            await this.audit.record(actor.userId, 'platform_collection.manual_payout_released', 'Payment', id, {
                organizationId: payout.payment.organizationId,
                metadata: {
                    payoutAccountId: payout.payoutAccountId,
                    amount: payout.amount,
                },
                request,
                client: tx,
            });
            return { released: true };
        });
    }
    async eligibleAccounts(id) {
        const payment = await this.prisma.payment.findFirst({
            where: { id, ...recordedOnlinePayments },
            select: {
                organizationId: true,
                capturePropertyId: true,
                billingRecord: { select: { propertyId: true } },
                resident: { select: { propertyId: true } },
            },
        });
        if (!payment)
            throw new NotFoundException('Captured payment not found');
        const propertyId = payment.capturePropertyId ??
            payment.billingRecord?.propertyId ??
            payment.resident.propertyId;
        return this.prisma.landlordPayoutAccount.findMany({
            where: {
                organizationId: payment.organizationId,
                status: 'ACTIVE',
                kycStatus: 'VERIFIED',
                accountNumberEncrypted: { not: null },
                OR: [{ propertyId }, { propertyId: null }],
            },
            select: {
                id: true,
                beneficiaryName: true,
                accountNumberMasked: true,
                ifscCode: true,
                property: { select: { name: true } },
            },
            orderBy: [{ propertyId: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
        });
    }
    async reveal(id, actor, request) {
        const account = await this.prisma.landlordPayoutAccount.findUnique({
            where: { id },
            select: {
                organizationId: true,
                accountNumberEncrypted: true,
                beneficiaryName: true,
                ifscCode: true,
            },
        });
        if (!account?.accountNumberEncrypted)
            throw new NotFoundException('Full bank details need to be resubmitted');
        const accountNumber = this.bankCipher.decrypt(account.accountNumberEncrypted, id);
        await this.audit.record(actor.userId, 'platform_payout.bank_details_viewed', 'LandlordPayoutAccount', id, {
            organizationId: account.organizationId,
            request,
        });
        return {
            accountNumber,
            beneficiaryName: account.beneficiaryName,
            ifscCode: account.ifscCode,
        };
    }
};
AdminCollectionsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        RazorpayAdapter,
        BankAccountCipher,
        AdminAuditService])
], AdminCollectionsService);
export { AdminCollectionsService };
//# sourceMappingURL=admin-collections.service.js.map