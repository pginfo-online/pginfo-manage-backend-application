var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MandatesService_1;
import { Injectable, Logger, Inject, Optional, ServiceUnavailableException, } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import { PayoutsService } from './payouts.service.js';
import { NotFoundError, ConflictError, ValidationError, } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { dateKeyInTimeZone } from '../../../common/time/property-date.js';
import { Monetary } from '../domain/monetary.js';
import { buildAutopayInvite } from '../domain/autopay-invite.js';
import { WHATSAPP_ADAPTER, } from '../../communications/domain/notification.interfaces.js';
let MandatesService = MandatesService_1 = class MandatesService {
    prisma;
    razorpayAdapter;
    payoutsService;
    whatsappAdapter;
    logger = new Logger(MandatesService_1.name);
    constructor(prisma, razorpayAdapter, payoutsService, whatsappAdapter) {
        this.prisma = prisma;
        this.razorpayAdapter = razorpayAdapter;
        this.payoutsService = payoutsService;
        this.whatsappAdapter = whatsappAdapter;
    }
    async createMandate(dto, orgId, userId) {
        const tenant = await this.prisma.resident.findFirst({
            where: { id: dto.tenantId, organizationId: orgId },
            include: {
                property: true,
                room: true,
                bed: true,
            },
        });
        if (!tenant) {
            throw new NotFoundError('Resident (Tenant)', dto.tenantId);
        }
        if (tenant.status === 'MOVED_OUT' || tenant.status === 'ARCHIVED') {
            throw new ValidationError(`Cannot create mandate for tenant in status: ${tenant.status}`);
        }
        if (tenant.rentalFrequencyMonths > 1) {
            throw new ValidationError('Autopay currently requires a monthly rental plan');
        }
        if (!this.razorpayAdapter.canCreateMoneyLinks()) {
            throw new ServiceUnavailableException('Configure Razorpay API credentials and webhook secret to set up Autopay');
        }
        const unitId = dto.unitId ?? tenant.roomId;
        let unitNumber = 'N/A';
        if (unitId) {
            const unit = await this.prisma.room.findFirst({
                where: {
                    id: unitId,
                    organizationId: orgId,
                    propertyId: tenant.propertyId,
                },
            });
            if (!unit || unitId !== tenant.roomId) {
                throw new ValidationError('The selected unit must be the tenant’s assigned room');
            }
            unitNumber = unit.roomNumber;
        }
        const payoutAccount = await this.payoutsService
            .getActivePayoutAccount(orgId, tenant.propertyId)
            .catch((error) => {
            if (!(error instanceof NotFoundError))
                throw error;
            throw new ValidationError('Add and verify an owner bank account for this property before setting up Autopay');
        });
        const timezone = tenant.property.timezone ?? 'Asia/Kolkata';
        const today = dateKeyInTimeZone(new Date(), timezone);
        const joining = tenant.moveInDate ?? tenant.joiningDate;
        const joiningDay = joining?.toISOString().slice(0, 10) ?? today;
        const start = joiningDay > today ? joiningDay : today;
        const [year, month, day] = start.split('-').map(Number);
        const firstCharge = new Date(Date.UTC(year, month - (day < dto.billingDay ? 1 : 0), dto.billingDay, 12));
        let createdSubscriptionId;
        const { mandate, subscription } = await this.prisma
            .$transaction(async (tx) => {
            const [lock] = await tx.$queryRaw `
        SELECT pg_try_advisory_xact_lock(hashtextextended(${'rent-mandate:' + tenant.id}, 0)) AS acquired
      `;
            if (!lock?.acquired)
                throw new ConflictError('Autopay setup is already in progress');
            const existingActiveMandate = await tx.tenantMandate.findFirst({
                where: {
                    tenantId: tenant.id,
                    propertyId: tenant.propertyId,
                    status: { in: ['ACTIVE', 'CREATED', 'AUTHENTICATED', 'PENDING'] },
                },
            });
            if (existingActiveMandate) {
                throw new ConflictError(`An active or pending mandate already exists for this tenant (ID: ${existingActiveMandate.id}, status: ${existingActiveMandate.status})`);
            }
            const planName = `Rent - ${tenant.property.name} (Unit ${unitNumber})`;
            const plan = await this.razorpayAdapter.createPlan({
                name: planName,
                amountPaise: dto.rentAmount,
                currency: 'INR',
                description: `Monthly rent collection mandate for ${tenant.firstName} ${tenant.lastName ?? ''}`.trim(),
                notes: {
                    tenantId: tenant.id,
                    propertyId: tenant.propertyId,
                    unitId: unitId ?? '',
                    organizationId: orgId,
                },
            });
            const subscription = await this.razorpayAdapter.createSubscription({
                planId: plan.planId,
                totalCount: dto.tenureMonths,
                startAt: Math.floor(firstCharge.getTime() / 1000),
                customerNotify: dto.sendWhatsAppNotification ? 1 : 0,
                notes: {
                    tenantId: tenant.id,
                    propertyId: tenant.propertyId,
                    unitId: unitId ?? '',
                    organizationId: orgId,
                    billingDay: String(dto.billingDay),
                },
            });
            createdSubscriptionId = subscription.subscriptionId;
            const mandate = await tx.tenantMandate.create({
                data: {
                    organizationId: orgId,
                    tenantId: tenant.id,
                    propertyId: tenant.propertyId,
                    unitId,
                    bedId: tenant.bedId,
                    landlordPayoutAccountId: payoutAccount.id,
                    razorpayPlanId: plan.planId,
                    razorpaySubscriptionId: subscription.subscriptionId,
                    shortUrl: subscription.shortUrl,
                    mandateChannel: dto.mandateChannel,
                    status: 'CREATED',
                    collectionMode: 'AUTOPAY',
                    rentAmount: dto.rentAmount,
                    billingDay: dto.billingDay,
                    tenureMonths: dto.tenureMonths,
                    totalCount: dto.tenureMonths,
                    nextChargeDate: firstCharge,
                    paidCount: 0,
                    metadata: {
                        tenantName: `${tenant.firstName} ${tenant.lastName ?? ''}`.trim(),
                        tenantMobile: tenant.mobile,
                        unitNumber,
                    },
                },
                include: {
                    tenant: true,
                    property: true,
                    unit: true,
                },
            });
            return { mandate, subscription };
        }, { timeout: 35_000 })
            .catch(async (error) => {
            if (createdSubscriptionId) {
                try {
                    const saved = await this.prisma.tenantMandate.findUnique({
                        where: { razorpaySubscriptionId: createdSubscriptionId },
                    });
                    if (!saved)
                        await this.razorpayAdapter.cancelSubscription(createdSubscriptionId);
                }
                catch {
                    this.logger.error(`Unable to reconcile unconfirmed subscription ${createdSubscriptionId}`);
                }
            }
            throw error;
        });
        const rentRupees = Monetary.toRupees(dto.rentAmount);
        const whatsappPayload = buildAutopayInvite(tenant, unitNumber, dto.rentAmount, dto.billingDay, subscription.shortUrl);
        const { notificationSent, notificationError, notificationMessageId } = dto.sendWhatsAppNotification && tenant.sendWhatsappReminder !== false
            ? await this.sendInvite(whatsappPayload)
            : {
                notificationSent: false,
                notificationError: null,
                notificationMessageId: null,
            };
        await this.prisma.auditLog.create({
            data: {
                organizationId: orgId,
                userId,
                action: 'rent.mandate_created',
                entityType: 'TenantMandate',
                entityId: mandate.id,
                metadata: {
                    subscriptionId: subscription.subscriptionId,
                    rentAmount: dto.rentAmount,
                    billingDay: dto.billingDay,
                    shortUrl: subscription.shortUrl,
                    notificationSent,
                    notificationMessageId,
                },
            },
        });
        return {
            mandateId: mandate.id,
            subscriptionId: subscription.subscriptionId,
            status: mandate.status,
            shortUrl: subscription.shortUrl,
            rentAmountPaise: dto.rentAmount,
            rentAmountRupees: rentRupees,
            billingDay: dto.billingDay,
            tenureMonths: dto.tenureMonths,
            nextChargeDate: firstCharge,
            whatsappPayload,
            notificationSent,
            notificationError,
            notificationMessageId,
        };
    }
    async resendInvite(id, orgId, userId) {
        const mandate = await this.prisma.tenantMandate.findFirst({
            where: { id, organizationId: orgId },
            include: {
                tenant: {
                    select: {
                        firstName: true,
                        mobile: true,
                        whatsappNumber: true,
                        sendWhatsappReminder: true,
                        status: true,
                        propertyId: true,
                    },
                },
                property: { select: { name: true } },
                unit: { select: { roomNumber: true } },
            },
        });
        if (!mandate)
            throw new NotFoundError('Tenant mandate', id);
        if (!['CREATED', 'PENDING'].includes(mandate.status) ||
            mandate.collectionMode !== 'AUTOPAY' ||
            !mandate.shortUrl ||
            ['MOVED_OUT', 'ARCHIVED'].includes(mandate.tenant.status) ||
            mandate.tenant.propertyId !== mandate.propertyId) {
            throw new ConflictError('This mandate is no longer awaiting authorization');
        }
        const payload = buildAutopayInvite({ ...mandate.tenant, property: mandate.property }, mandate.unit?.roomNumber ?? 'N/A', mandate.rentAmount, mandate.billingDay, mandate.shortUrl);
        const result = mandate.tenant.sendWhatsappReminder === false
            ? {
                notificationSent: false,
                notificationError: 'This tenant has disabled WhatsApp reminders',
                notificationMessageId: null,
            }
            : await this.sendInvite(payload);
        await this.prisma.auditLog.create({
            data: {
                organizationId: orgId,
                userId,
                entityType: 'TenantMandate',
                entityId: id,
                action: 'rent.mandate_invite_resent',
                metadata: result,
            },
        });
        return result;
    }
    async sendInvite(payload) {
        try {
            const result = await this.whatsappAdapter?.send({
                to: payload.to,
                message: payload.message,
                templateName: payload.template,
                templateParams: payload.templateParams,
            });
            return {
                notificationSent: result?.success ?? false,
                notificationError: result?.success
                    ? null
                    : (result?.error ?? 'WhatsApp provider is unavailable'),
                notificationMessageId: result?.messageId ?? null,
            };
        }
        catch {
            this.logger.warn('Failed to send WhatsApp mandate invite');
            return {
                notificationSent: false,
                notificationError: 'WhatsApp provider request failed',
                notificationMessageId: null,
            };
        }
    }
    async getMandate(id, orgId) {
        const mandate = await this.prisma.tenantMandate.findFirst({
            where: { id, organizationId: orgId },
            include: {
                tenant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        mobile: true,
                        email: true,
                    },
                },
                property: { select: { id: true, name: true } },
                unit: { select: { id: true, roomNumber: true } },
                landlordPayoutAccount: {
                    select: {
                        id: true,
                        razorpayAccountId: true,
                        businessName: true,
                        beneficiaryName: true,
                    },
                },
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 12,
                },
            },
        });
        if (!mandate) {
            throw new NotFoundError('TenantMandate', id);
        }
        return mandate;
    }
    async queryMandates(query, orgId) {
        const where = {
            organizationId: orgId,
            ...(query.tenantId ? { tenantId: query.tenantId } : {}),
            ...(query.propertyId ? { propertyId: query.propertyId } : {}),
            ...(query.unitId ? { unitId: query.unitId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.collectionMode ? { collectionMode: query.collectionMode } : {}),
        };
        const offset = (query.page - 1) * query.limit;
        const [mandates, total] = await Promise.all([
            this.prisma.tenantMandate.findMany({
                where,
                skip: offset,
                take: query.limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    tenant: {
                        select: { id: true, firstName: true, lastName: true, mobile: true },
                    },
                    property: { select: { id: true, name: true } },
                    unit: { select: { id: true, roomNumber: true } },
                },
            }),
            this.prisma.tenantMandate.count({ where }),
        ]);
        return buildOffsetResponse(mandates, total, query.page, query.limit);
    }
    async cancelMandate(id, orgId, userId) {
        const mandate = await this.prisma.tenantMandate.findFirst({
            where: { id, organizationId: orgId },
        });
        if (!mandate) {
            throw new NotFoundError('TenantMandate', id);
        }
        try {
            await this.razorpayAdapter.cancelSubscription(mandate.razorpaySubscriptionId, false);
        }
        catch (err) {
            this.logger.warn(`Razorpay subscription cancel returned error: ${err.message}`);
        }
        const updated = await this.prisma.tenantMandate.update({
            where: { id },
            data: {
                status: 'REVOKED',
                collectionMode: 'MANUAL_COLLECTION',
                cancelledAt: new Date(),
            },
        });
        await this.prisma.auditLog.create({
            data: {
                organizationId: orgId,
                userId,
                action: 'rent.mandate_cancelled',
                entityType: 'TenantMandate',
                entityId: mandate.id,
            },
        });
        return updated;
    }
};
MandatesService = MandatesService_1 = __decorate([
    Injectable(),
    __param(3, Optional()),
    __param(3, Inject(WHATSAPP_ADAPTER)),
    __metadata("design:paramtypes", [PrismaService,
        RazorpayAdapter,
        PayoutsService, Object])
], MandatesService);
export { MandatesService };
//# sourceMappingURL=mandates.service.js.map