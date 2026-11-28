var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, BadRequestException, ConflictException, ServiceUnavailableException, } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import { MoneyService } from './money.service.js';
let MoneyLinksService = class MoneyLinksService {
    prisma;
    gateway;
    money;
    constructor(prisma, gateway, money) {
        this.prisma = prisma;
        this.gateway = gateway;
        this.money = money;
    }
    async create(residentId, org, user, kind = 'link') {
        const notes = kind === 'link' ? 'Money payment link' : 'Money payment QR';
        const context = await this.money.paymentContext(residentId, org);
        if (context.totalDues <= 0)
            throw new BadRequestException('This tenant has no outstanding dues');
        if (context.totalDues > 2147483647)
            throw new BadRequestException('Split this balance into smaller payments');
        const properties = [
            ...new Set(context.bills.map((bill) => bill.propertyId)),
        ];
        if (properties.length !== 1)
            throw new BadRequestException('Online collection requires outstanding dues for a single property');
        const propertyId = properties[0];
        if (!this.gateway.canCreateMoneyLinks())
            throw new ServiceUnavailableException('Configure Razorpay API credentials and webhook secret to create payment links');
        const payment = await this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM residents WHERE id=${residentId}::uuid AND organization_id=${org}::uuid FOR UPDATE`;
            const balance = await tx.billingRecord.aggregate({
                where: {
                    residentId,
                    organizationId: org,
                    propertyId,
                    status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
                },
                _sum: { amount: true, paidAmount: true },
            });
            if ((balance._sum.amount ?? 0) - (balance._sum.paidAmount ?? 0) !==
                context.totalDues)
                throw new ConflictException('Dues changed; reload the balance before creating a payment link');
            const pending = await tx.payment.findFirst({
                where: {
                    organizationId: org,
                    residentId,
                    amount: context.totalDues,
                    status: 'PENDING',
                    notes,
                    OR: [
                        { capturePropertyId: propertyId },
                        { capturePropertyId: null, resident: { propertyId } },
                    ],
                    paymentLinkExpiresAt: { gt: new Date() },
                },
                orderBy: { createdAt: 'desc' },
            });
            if (pending) {
                if (!pending.paymentLinkUrl)
                    throw new ConflictException('Payment link is being prepared; retry shortly');
                return pending;
            }
            return tx.payment.create({
                data: {
                    organizationId: org,
                    residentId,
                    capturePropertyId: propertyId,
                    amount: context.totalDues,
                    mode: 'RAZORPAY',
                    status: 'PENDING',
                    collectionDate: new Date(),
                    notes,
                    recordedBy: user,
                    paymentLinkExpiresAt: new Date(Date.now() + 30 * 60000),
                },
            });
        });
        const result = (url, expiresAt) => ({
            ...(kind === 'qr' ? { qrImageUrl: url } : { paymentLink: url }),
            amount: payment.amount,
            expiresAt,
        });
        if (payment.paymentLinkUrl)
            return result(payment.paymentLinkUrl, payment.paymentLinkExpiresAt);
        if (kind === 'qr') {
            const qr = await this.gateway.createCollectionQr(payment.amount, Math.floor(payment.paymentLinkExpiresAt.getTime() / 1000), payment.id);
            await this.prisma.$transaction(async (tx) => {
                await tx.payment.update({
                    where: { id: payment.id },
                    data: {
                        gatewayQrId: qr.id,
                        paymentLinkUrl: qr.imageUrl,
                        paymentLinkExpiresAt: qr.expiresAt,
                    },
                });
                await tx.auditLog.create({
                    data: {
                        organizationId: org,
                        userId: user,
                        action: 'money.payment_qr.create',
                        entityType: 'Payment',
                        entityId: payment.id,
                        metadata: { qrId: qr.id, amount: payment.amount },
                    },
                });
            });
            return result(qr.imageUrl, qr.expiresAt);
        }
        const link = await this.gateway.createPaymentLink({
            amountPaise: payment.amount,
            description: 'PGInfo outstanding accommodation dues',
            customer: {
                name: [context.resident.firstName, context.resident.lastName]
                    .filter(Boolean)
                    .join(' '),
                contact: context.resident.mobile,
            },
            notes: { moneyPaymentId: payment.id, organizationId: org, residentId },
            referenceId: payment.id,
            expireBy: Math.floor(payment.paymentLinkExpiresAt.getTime() / 1000),
            notify: false,
            requireConfigured: true,
        });
        await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    paymentLinkId: link.paymentLinkId,
                    paymentLinkUrl: link.shortUrl,
                },
            });
            await tx.auditLog.create({
                data: {
                    organizationId: org,
                    userId: user,
                    action: 'money.payment_link.create',
                    entityType: 'Payment',
                    entityId: payment.id,
                    metadata: {
                        amount: payment.amount,
                        paymentLinkId: link.paymentLinkId,
                    },
                },
            });
        });
        return {
            paymentLink: link.shortUrl,
            amount: payment.amount,
            expiresAt: payment.paymentLinkExpiresAt,
        };
    }
};
MoneyLinksService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        RazorpayAdapter,
        MoneyService])
], MoneyLinksService);
export { MoneyLinksService };
//# sourceMappingURL=money-links.service.js.map