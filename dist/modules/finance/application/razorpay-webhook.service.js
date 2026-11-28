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
var RazorpayWebhookService_1;
import { BadRequestException, Injectable, Logger, Inject, Optional, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import { UnauthorizedError } from '../../../common/errors/index.js';
import { Monetary } from '../domain/monetary.js';
import { WHATSAPP_ADAPTER, } from '../../communications/domain/notification.interfaces.js';
import { dateKeyInTimeZone } from '../../../common/time/property-date.js';
import { MoneyLinksService } from './money-links.service.js';
import { PaymentsService } from './payments.service.js';
let RazorpayWebhookService = RazorpayWebhookService_1 = class RazorpayWebhookService {
    prisma;
    razorpayAdapter;
    config;
    whatsappAdapter;
    paymentsService;
    moneyLinks;
    logger = new Logger(RazorpayWebhookService_1.name);
    constructor(prisma, razorpayAdapter, config, whatsappAdapter, paymentsService, moneyLinks) {
        this.prisma = prisma;
        this.razorpayAdapter = razorpayAdapter;
        this.config = config;
        this.whatsappAdapter = whatsappAdapter;
        this.paymentsService = paymentsService;
        this.moneyLinks = moneyLinks;
    }
    getPlatformFeePaise() {
        return this.config.get('PLATFORM_FEE_PAISE') ?? 3000;
    }
    async handleWebhook(rawBody, signature, providerEventId) {
        const isValid = this.razorpayAdapter.verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
            this.logger.warn('Razorpay webhook HMAC signature verification failed');
            throw new UnauthorizedError('Invalid webhook signature');
        }
        let event;
        try {
            event = JSON.parse(rawBody.toString());
        }
        catch {
            this.logger.error('Failed to parse webhook JSON body');
            throw new BadRequestException('Invalid JSON payload');
        }
        if (typeof event?.event !== 'string' ||
            !event.payload ||
            typeof event.payload !== 'object')
            throw new BadRequestException('Invalid webhook event');
        const eventId = providerEventId ||
            event.id ||
            `evt_${createHash('sha256').update(rawBody).digest('hex').slice(0, 32)}`;
        const diagnosticPayload = {
            accountId: event.account_id ?? null,
            createdAt: event.created_at ?? null,
            paymentId: event.payload.payment?.entity.id ??
                event.payload.refund?.entity.payment_id ??
                null,
            orderId: event.payload.order?.entity.id ??
                event.payload.payment?.entity.order_id ??
                null,
            subscriptionId: event.payload.subscription?.entity.id ??
                event.payload.payment?.entity.subscription_id ??
                null,
            paymentLinkId: event.payload.payment_link?.entity.id ?? null,
            qrId: event.payload.qr_code?.entity.id ?? null,
            refundId: event.payload.refund?.entity.id ?? null,
        };
        const existingEvent = await this.prisma.webhookEvent.findUnique({
            where: { eventId },
        });
        if (existingEvent && existingEvent.status !== 'FAILED') {
            this.logger.log(`Webhook event ${eventId} (${event.event}) already processed. Skipping idempotently.`);
            return {
                status: 'already_processed',
                eventId,
                processedAt: existingEvent.processedAt,
            };
        }
        this.logger.log(`Processing authoritative webhook event: ${event.event} [${eventId}]`);
        try {
            switch (event.event) {
                case 'payment_link.paid': {
                    const link = event.payload.payment_link?.entity;
                    const paid = event.payload.payment?.entity;
                    if (link && paid && paid.status === 'captured')
                        await this.paymentsService?.captureOnlinePayment({
                            linkId: link.id,
                            referenceId: link.reference_id,
                            gatewayPaymentId: paid.id,
                            amount: paid.amount,
                            currency: paid.currency,
                            capturedAt: this.eventTime(event),
                        });
                    break;
                }
                case 'qr_code.credited': {
                    const qr = event.payload.qr_code?.entity;
                    const paid = event.payload.payment?.entity;
                    if (qr && paid?.status === 'captured')
                        await this.paymentsService?.captureOnlinePayment({
                            qrId: qr.id,
                            referenceId: qr.notes?.moneyPaymentId,
                            gatewayPaymentId: paid.id,
                            amount: paid.amount,
                            currency: paid.currency,
                            capturedAt: this.eventTime(event),
                        });
                    break;
                }
                case 'payment_link.expired':
                case 'payment_link.cancelled': {
                    const id = event.payload.payment_link?.entity.id;
                    if (id)
                        await this.prisma.payment.updateMany({
                            where: { paymentLinkId: id, status: 'PENDING' },
                            data: { status: 'FAILED', version: { increment: 1 } },
                        });
                    break;
                }
                case 'qr_code.closed': {
                    const qr = event.payload.qr_code?.entity;
                    if (qr?.id && qr.close_reason !== 'paid')
                        await this.prisma.payment.updateMany({
                            where: { gatewayQrId: qr.id, status: 'PENDING' },
                            data: { status: 'FAILED', version: { increment: 1 } },
                        });
                    break;
                }
                case 'refund.processed': {
                    const refund = event.payload.refund?.entity;
                    if (refund)
                        await this.paymentsService?.syncGatewayRefund(refund.payment_id);
                    break;
                }
                case 'subscription.authenticated':
                case 'subscription.activated':
                case 'subscription.resumed':
                case 'subscription.completed':
                case 'subscription.expired':
                case 'subscription.halted':
                case 'subscription.cancelled':
                case 'subscription.paused':
                    await this.updateMandateLifecycle(event);
                    break;
                case 'subscription.charged':
                    await this.handleSubscriptionCharged(event);
                    break;
                case 'order.paid':
                case 'payment.captured':
                    if (event.payload.payment?.entity?.subscription_id) {
                        await this.handleSubscriptionCharged(event);
                    }
                    else {
                        await this.handleOneTimePaymentCaptured(event);
                    }
                    break;
                case 'subscription.pending':
                case 'payment.failed':
                    await this.handlePaymentFailed(event);
                    break;
                default:
                    this.logger.log(`Unhandled Razorpay event type: ${event.event}`);
                    break;
            }
            await this.prisma.webhookEvent.upsert({
                where: { eventId },
                create: {
                    eventId,
                    eventType: event.event,
                    payload: diagnosticPayload,
                    status: 'SUCCESS',
                },
                update: { status: 'SUCCESS', error: null, processedAt: new Date() },
            });
            return { received: true, event: event.event, eventId };
        }
        catch (err) {
            const errorMsg = err.message;
            this.logger.error(`Error processing webhook event ${event.event}: ${errorMsg}`, err.stack);
            try {
                await this.prisma.webhookEvent.createMany({
                    data: {
                        eventId,
                        eventType: event.event,
                        payload: diagnosticPayload,
                        status: 'FAILED',
                        error: errorMsg,
                    },
                    skipDuplicates: true,
                });
                await this.prisma.webhookEvent.updateMany({
                    where: { eventId, status: 'FAILED' },
                    data: { error: errorMsg, processedAt: new Date() },
                });
            }
            catch {
            }
            throw err;
        }
    }
    eventTime(event) {
        return event.created_at ? new Date(event.created_at * 1000) : new Date();
    }
    async updateMandateLifecycle(event) {
        const statuses = {
            'subscription.authenticated': 'AUTHENTICATED',
            'subscription.activated': 'ACTIVE',
            'subscription.resumed': 'ACTIVE',
            'subscription.completed': 'COMPLETED',
            'subscription.expired': 'EXPIRED',
            'subscription.halted': 'PENDING',
            'subscription.cancelled': 'REVOKED',
            'subscription.paused': 'PAUSED',
        };
        const status = statuses[event.event];
        const sub = event.payload.subscription?.entity;
        if (!sub || !status)
            return;
        const mandate = await this.prisma.tenantMandate.findUnique({
            where: { razorpaySubscriptionId: sub.id },
        });
        if (!mandate)
            return;
        const time = this.eventTime(event);
        const activated = status === 'ACTIVE' || status === 'AUTHENTICATED';
        const payment = event.payload.payment?.entity;
        const bankReference = payment?.acquirer_data?.bank_transaction_id ||
            payment?.acquirer_data?.upi_transaction_id ||
            undefined;
        await this.prisma.$transaction(async (tx) => {
            const changed = await tx.tenantMandate.updateMany({
                where: {
                    id: mandate.id,
                    ...(status === 'AUTHENTICATED'
                        ? { status: { in: ['CREATED', 'AUTHENTICATED'] } }
                        : { status: { notIn: ['REVOKED', 'COMPLETED', 'EXPIRED'] } }),
                    OR: [{ gatewayStatusAt: null }, { gatewayStatusAt: { lte: time } }],
                },
                data: {
                    status,
                    gatewayStatusAt: time,
                    collectionMode: activated ? 'AUTOPAY' : 'MANUAL_COLLECTION',
                    razorpayCustomerId: sub.customer_id,
                    razorpayTokenId: sub.token_id,
                    bankReference,
                    startedAt: activated ? (mandate.startedAt ?? time) : undefined,
                    cancelledAt: status === 'REVOKED' ? time : undefined,
                    nextChargeDate: activated
                        ? sub.charge_at
                            ? new Date(sub.charge_at * 1000)
                            : undefined
                        : null,
                    failureReason: activated ? null : undefined,
                },
            });
            if (changed.count)
                await tx.auditLog.create({
                    data: {
                        organizationId: mandate.organizationId,
                        action: 'rent.mandate_status_changed',
                        entityType: 'TenantMandate',
                        entityId: mandate.id,
                        metadata: { subscriptionId: sub.id, event: event.event, status },
                    },
                });
        });
    }
    async handleSubscriptionCharged(event) {
        const payment = event.payload.payment?.entity;
        const sub = event.payload.subscription?.entity;
        const paymentId = payment?.id;
        const subscriptionId = payment?.subscription_id || sub?.id;
        const totalAmount = payment?.amount;
        if (!paymentId ||
            !subscriptionId ||
            !Number.isSafeInteger(totalAmount) ||
            !totalAmount ||
            totalAmount <= 0 ||
            payment?.currency !== 'INR' ||
            payment?.status !== 'captured') {
            this.logger.warn('Incomplete payment/subscription details in subscription.charged event');
            return;
        }
        const mandate = await this.prisma.tenantMandate.findUnique({
            where: { razorpaySubscriptionId: subscriptionId },
            include: {
                tenant: true,
                property: true,
                unit: true,
            },
        });
        if (!mandate) {
            this.logger.warn(`TenantMandate not found for subscription ${subscriptionId}`);
            return;
        }
        const now = this.eventTime(event);
        const billingTimestamp = sub?.current_start || payment?.created_at;
        const propertyDate = dateKeyInTimeZone(billingTimestamp ? new Date(billingTimestamp * 1000) : now, mandate.property.timezone);
        const billingMonth = Number(propertyDate.slice(5, 7));
        const billingYear = Number(propertyDate.slice(0, 4));
        const platformFee = Math.min(totalAmount, this.getPlatformFeePaise());
        const transferAmount = Math.max(0, totalAmount - platformFee);
        const invoiceNumber = `INV-${billingYear}${String(billingMonth).padStart(2, '0')}-${mandate.tenantId.slice(0, 8).toUpperCase()}`;
        const capture = await this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM residents WHERE id=${mandate.tenantId}::uuid FOR UPDATE`;
            const previous = await tx.payment.findUnique({
                where: { razorpayPaymentId: paymentId },
                select: { id: true },
            });
            if (previous)
                return null;
            const settledInvoice = await tx.rentInvoice.findUnique({
                where: {
                    tenantId_billingMonth_billingYear: {
                        tenantId: mandate.tenantId,
                        billingMonth,
                        billingYear,
                    },
                },
                select: { status: true },
            });
            const alreadySettled = settledInvoice?.status === 'PAID';
            const billingRecord = await tx.billingRecord.findFirst({
                where: {
                    residentId: mandate.tenantId,
                    organizationId: mandate.organizationId,
                    propertyId: mandate.propertyId,
                    type: 'RENT',
                    billingMonth,
                    billingYear,
                },
            });
            const canAllocate = !alreadySettled &&
                billingRecord &&
                ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'].includes(billingRecord.status) &&
                billingRecord.amount - billingRecord.paidAmount >= totalAmount;
            const invoicePaid = canAllocate &&
                billingRecord.paidAmount + totalAmount === billingRecord.amount;
            const inv = await tx.rentInvoice.upsert({
                where: {
                    tenantId_billingMonth_billingYear: {
                        tenantId: mandate.tenantId,
                        billingMonth,
                        billingYear,
                    },
                },
                create: {
                    organizationId: mandate.organizationId,
                    tenantId: mandate.tenantId,
                    propertyId: mandate.propertyId,
                    unitId: mandate.unitId,
                    mandateId: mandate.id,
                    invoiceNumber,
                    billingMonth,
                    billingYear,
                    amount: billingRecord?.amount ?? mandate.rentAmount,
                    platformFee,
                    transferAmount,
                    status: invoicePaid ? 'PAID' : 'PENDING',
                    collectionType: 'AUTOPAY',
                    dueDate: new Date(Date.UTC(billingYear, billingMonth - 1, mandate.billingDay)),
                    paidAt: invoicePaid ? now : null,
                    razorpayPaymentId: paymentId,
                },
                update: !invoicePaid
                    ? {}
                    : {
                        status: 'PAID',
                        paidAt: now,
                        collectionType: 'AUTOPAY',
                        razorpayPaymentId: paymentId,
                        amount: billingRecord.amount,
                        platformFee,
                        transferAmount,
                    },
            });
            await tx.tenantMandate.update({
                where: { id: mandate.id },
                data: { paidCount: { increment: 1 } },
            });
            await tx.tenantMandate.updateMany({
                where: {
                    id: mandate.id,
                    status: { in: ['ACTIVE', 'PENDING', 'AUTHENTICATED', 'CREATED'] },
                    OR: [{ gatewayStatusAt: null }, { gatewayStatusAt: { lte: now } }],
                },
                data: {
                    status: 'ACTIVE',
                    collectionMode: 'AUTOPAY',
                    gatewayStatusAt: now,
                    failureReason: null,
                    nextChargeDate: sub?.charge_at
                        ? new Date(sub.charge_at * 1000)
                        : undefined,
                },
            });
            if (canAllocate) {
                const paidAmount = billingRecord.paidAmount + totalAmount;
                await tx.billingRecord.update({
                    where: { id: billingRecord.id, version: billingRecord.version },
                    data: {
                        status: paidAmount === billingRecord.amount ? 'PAID' : 'PARTIALLY_PAID',
                        paidAmount,
                        version: { increment: 1 },
                    },
                });
                await tx.rentInvoice.update({
                    where: { id: inv.id },
                    data: { billingRecordId: billingRecord.id },
                });
            }
            await tx.payment.create({
                data: {
                    organizationId: mandate.organizationId,
                    residentId: mandate.tenantId,
                    billingRecordId: canAllocate ? billingRecord.id : undefined,
                    amount: totalAmount,
                    status: canAllocate ? 'CONFIRMED' : 'DISPUTED',
                    mode: 'RAZORPAY',
                    collectionDate: new Date(`${dateKeyInTimeZone(now, mandate.property.timezone)}T00:00:00.000Z`),
                    capturedAt: now,
                    capturePropertyId: mandate.propertyId,
                    capturePlatformFee: platformFee,
                    allocations: canAllocate
                        ? {
                            create: {
                                billingRecordId: billingRecord.id,
                                amount: totalAmount,
                            },
                        }
                        : undefined,
                    razorpayPaymentId: paymentId,
                    reference: `AutoPay Mandate ${mandate.razorpaySubscriptionId}`,
                    notes: `Rent Autopay for ${billingMonth}/${billingYear}`,
                },
            });
            if (!canAllocate) {
                await tx.auditLog.create({
                    data: {
                        organizationId: mandate.organizationId,
                        action: 'payment.reconciliation_required',
                        entityType: 'RentInvoice',
                        entityId: inv.id,
                        metadata: {
                            paymentId,
                            amount: totalAmount,
                            reason: 'Rent due missing or changed',
                        },
                    },
                });
            }
            return canAllocate;
        });
        if (capture)
            await this.sendReceiptNotifications(mandate, totalAmount, billingMonth, billingYear, paymentId);
    }
    async sendReceiptNotifications(mandate, totalAmount, month, year, paymentId) {
        const rentRupees = Monetary.toRupees(totalAmount);
        const unitStr = mandate.unit
            ? `Unit ${mandate.unit.roomNumber}`
            : 'your unit';
        const tenantPhone = mandate.tenant.whatsappNumber || mandate.tenant.mobile;
        const tenantMsg = `✅ Rent Autopay Successful!\n\n` +
            `Dear ${mandate.tenant.firstName},\n` +
            `Your rent of ₹${rentRupees.toLocaleString('en-IN')} for ${mandate.property.name} (${unitStr}) ` +
            `for ${month}/${year} has been automatically collected.\n\n` +
            `Payment Reference: ${paymentId}\n` +
            `Thank you for paying on time!`;
        if (this.whatsappAdapter) {
            try {
                await this.whatsappAdapter.send({
                    to: tenantPhone,
                    message: tenantMsg,
                    templateName: 'rent_autopay_receipt',
                    templateParams: {
                        tenant_name: mandate.tenant.firstName,
                        amount: `₹${rentRupees}`,
                        month: `${month}/${year}`,
                    },
                });
            }
            catch (err) {
                this.logger.warn(`Failed to send tenant WhatsApp receipt: ${err.message}`);
            }
        }
    }
    async handlePaymentFailed(event) {
        const payment = event.payload.payment?.entity;
        const sub = event.payload.subscription?.entity;
        const subscriptionId = payment?.subscription_id || sub?.id;
        const failureReason = payment?.error_description ||
            payment?.error_code ||
            'Mandate autopay charge declined by issuing bank';
        if (!subscriptionId) {
            if (payment?.order_id)
                await this.prisma.payment.updateMany({
                    where: { razorpayOrderId: payment.order_id, status: 'PENDING' },
                    data: { status: 'FAILED', version: { increment: 1 } },
                });
            return;
        }
        const mandate = await this.prisma.tenantMandate.findUnique({
            where: { razorpaySubscriptionId: subscriptionId },
            include: {
                tenant: true,
                property: true,
                unit: true,
            },
        });
        if (!mandate) {
            this.logger.warn(`TenantMandate not found for failed subscription ${subscriptionId}`);
            return;
        }
        const now = this.eventTime(event);
        const periodStart = sub?.current_start
            ? new Date(sub.current_start * 1000)
            : now;
        const propertyDate = dateKeyInTimeZone(periodStart, mandate.property.timezone);
        const billingMonth = Number(propertyDate.slice(5, 7));
        const billingYear = Number(propertyDate.slice(0, 4));
        const key = { tenantId: mandate.tenantId, billingMonth, billingYear };
        const invoice = await this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM residents WHERE id=${mandate.tenantId}::uuid FOR UPDATE`;
            const existing = await tx.rentInvoice.findUnique({
                where: { tenantId_billingMonth_billingYear: key },
            });
            if (existing?.status === 'PAID')
                return null;
            const bill = await tx.billingRecord.findFirst({
                where: {
                    organizationId: mandate.organizationId,
                    residentId: mandate.tenantId,
                    propertyId: mandate.propertyId,
                    type: 'RENT',
                    billingMonth,
                    billingYear,
                },
                select: { id: true, status: true },
            });
            if (bill?.status === 'PAID')
                return null;
            const claimed = await tx.tenantMandate.updateMany({
                where: {
                    id: mandate.id,
                    status: { in: ['AUTHENTICATED', 'ACTIVE', 'PENDING'] },
                    OR: [{ gatewayStatusAt: null }, { gatewayStatusAt: { lt: now } }],
                },
                data: {
                    status: 'PENDING',
                    gatewayStatusAt: now,
                    retryCount: { increment: 1 },
                    failureReason,
                },
            });
            if (!claimed.count)
                return null;
            if (existing)
                return tx.rentInvoice.update({
                    where: { id: existing.id },
                    data: {
                        status: 'FAILED',
                        failureReason,
                        retryCount: { increment: 1 },
                        billingRecordId: bill?.id,
                    },
                });
            const platformFee = Math.min(mandate.rentAmount, this.getPlatformFeePaise());
            return tx.rentInvoice.create({
                data: {
                    ...key,
                    organizationId: mandate.organizationId,
                    propertyId: mandate.propertyId,
                    unitId: mandate.unitId,
                    mandateId: mandate.id,
                    billingRecordId: bill?.id,
                    invoiceNumber: `INV-${billingYear}${String(billingMonth).padStart(2, '0')}-${mandate.tenantId.slice(0, 8).toUpperCase()}`,
                    amount: mandate.rentAmount,
                    platformFee,
                    transferAmount: mandate.rentAmount - platformFee,
                    status: 'FAILED',
                    collectionType: 'FALLBACK_LINK',
                    dueDate: new Date(Date.UTC(billingYear, billingMonth - 1, mandate.billingDay)),
                    retryCount: 1,
                    failureReason,
                },
            });
        });
        if (!invoice ||
            mandate.tenant.sendWhatsappReminder === false ||
            !this.whatsappAdapter)
            return;
        let fallbackPaymentUrl = null;
        try {
            const link = await this.moneyLinks?.create(mandate.tenantId, mandate.organizationId);
            fallbackPaymentUrl = link?.paymentLink ?? null;
        }
        catch (err) {
            this.logger.warn(`Unable to prepare fallback payment for mandate ${mandate.id}: ${err.message}`);
        }
        const stillUnpaid = await this.prisma.rentInvoice.updateMany({
            where: {
                id: invoice.id,
                status: 'FAILED',
                retryCount: invoice.retryCount,
            },
            data: { fallbackPaymentUrl },
        });
        if (!stillUnpaid.count)
            return;
        const rentRupees = Monetary.toRupees(mandate.rentAmount);
        const tenantPhone = mandate.tenant.whatsappNumber || mandate.tenant.mobile;
        const alertMessage = `⚠️ Rent Autopay Failed!\n\n` +
            `Hello ${mandate.tenant.firstName}, your scheduled rent payment of ₹${rentRupees.toLocaleString('en-IN')} ` +
            `for ${mandate.property.name} could not be processed automatically.\n` +
            `Reason: ${failureReason}\n\n` +
            (fallbackPaymentUrl
                ? `Use this link to pay your outstanding dues:\n${fallbackPaymentUrl}\n\n`
                : `Please contact your property manager to complete the rent payment.\n\n`) +
            `Autopay will retry on the next scheduled cycle.`;
        try {
            await this.whatsappAdapter.send({
                to: tenantPhone,
                message: alertMessage,
                templateName: 'rent_autopay_failed_fallback',
                templateParams: {
                    tenant_name: mandate.tenant.firstName,
                    property_name: mandate.property.name,
                    amount: Monetary.formatINR(mandate.rentAmount),
                    payment_link: fallbackPaymentUrl ?? 'Contact your property manager',
                },
            });
        }
        catch (err) {
            this.logger.warn(`Failed to send failure fallback WhatsApp: ${err.message}`);
        }
        this.logger.warn(`Autopay payment failed for invoice ${invoice.id}; fallback link ${fallbackPaymentUrl ? 'prepared' : 'unavailable'}`);
    }
    async handleOneTimePaymentCaptured(event) {
        const p = event.payload.payment?.entity;
        if (!p?.order_id || p.status !== 'captured')
            return;
        await this.paymentsService?.captureOnlinePayment({
            orderId: p.order_id,
            referenceId: event.event === 'order.paid' &&
                event.payload.order?.entity.id === p.order_id
                ? event.payload.order.entity.receipt
                : undefined,
            gatewayPaymentId: p.id,
            amount: p.amount,
            currency: p.currency,
            capturedAt: this.eventTime(event),
        });
    }
};
RazorpayWebhookService = RazorpayWebhookService_1 = __decorate([
    Injectable(),
    __param(3, Optional()),
    __param(3, Inject(WHATSAPP_ADAPTER)),
    __param(4, Optional()),
    __param(5, Optional()),
    __metadata("design:paramtypes", [PrismaService,
        RazorpayAdapter,
        ConfigService, Object, PaymentsService,
        MoneyLinksService])
], RazorpayWebhookService);
export { RazorpayWebhookService };
//# sourceMappingURL=razorpay-webhook.service.js.map