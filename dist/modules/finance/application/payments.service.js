var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PaymentsService_1;
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import { NotFoundError, UnauthorizedError, ConflictError, } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { Monetary } from '../domain/monetary.js';
import { Prisma } from '@prisma/client';
let PaymentsService = PaymentsService_1 = class PaymentsService {
    prisma;
    razorpayAdapter;
    logger = new Logger(PaymentsService_1.name);
    constructor(prisma, razorpayAdapter) {
        this.prisma = prisma;
        this.razorpayAdapter = razorpayAdapter;
    }
    async recordPayment(dto, orgId, userId) {
        const resident = await this.prisma.resident.findFirst({
            where: { id: dto.residentId, organizationId: orgId },
            include: { property: true },
        });
        if (!resident) {
            throw new NotFoundError('Resident', dto.residentId);
        }
        if (dto.idempotencyKey) {
            const existing = await this.prisma.payment.findUnique({
                where: { idempotencyKey: dto.idempotencyKey },
            });
            if (existing) {
                throw new ConflictError('A payment with this idempotency key has already been recorded');
            }
        }
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: {
                    organizationId: orgId,
                    residentId: dto.residentId,
                    billingRecordId: dto.billingRecordId,
                    amount: dto.amount,
                    status: 'CONFIRMED',
                    mode: dto.mode,
                    collectionDate: dto.collectionDate,
                    reference: dto.reference,
                    notes: dto.notes,
                    proofUrl: dto.proofUrl,
                    recordedBy: userId,
                    idempotencyKey: dto.idempotencyKey,
                },
            });
            await this.allocatePayment(tx, resident.id, dto.amount, dto.billingRecordId, payment.id);
            await tx.auditLog.create({
                data: {
                    organizationId: orgId,
                    userId,
                    action: 'payment.record_offline',
                    entityType: 'Payment',
                    entityId: payment.id,
                    metadata: { amount: dto.amount, mode: dto.mode },
                },
            });
            return this.formatReceipt(payment, resident);
        });
    }
    async createRazorpayOrder(dto, orgId, userId) {
        const resident = await this.prisma.resident.findFirst({
            where: { id: dto.residentId, organizationId: orgId },
        });
        if (!resident) {
            throw new NotFoundError('Resident', dto.residentId);
        }
        if (dto.billingRecordId &&
            !(await this.prisma.billingRecord.findFirst({
                where: {
                    id: dto.billingRecordId,
                    residentId: resident.id,
                    organizationId: orgId,
                    status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
                },
            })))
            throw new NotFoundError('Payable billing record', dto.billingRecordId);
        const receipt = `rcpt_${Date.now()}_${resident.id.slice(0, 8)}`;
        const order = await this.razorpayAdapter.createOrder(dto.amount, receipt, {
            residentId: resident.id,
            organizationId: orgId,
        });
        const payment = await this.prisma.payment.create({
            data: {
                organizationId: orgId,
                residentId: dto.residentId,
                billingRecordId: dto.billingRecordId,
                amount: dto.amount,
                status: 'PENDING',
                mode: 'RAZORPAY',
                collectionDate: new Date(),
                razorpayOrderId: order.orderId,
                recordedBy: userId,
            },
        });
        return {
            paymentId: payment.id,
            razorpayOrderId: order.orderId,
            amountPaise: dto.amount,
            amountRupees: Monetary.toRupees(dto.amount),
            currency: 'INR',
        };
    }
    async verifyRazorpayPayment(dto, orgId, userId) {
        const payment = await this.prisma.payment.findFirst({
            where: { id: dto.paymentId, organizationId: orgId },
            include: { resident: { include: { property: true } } },
        });
        if (!payment) {
            throw new NotFoundError('Payment', dto.paymentId);
        }
        if (payment.razorpayOrderId !== dto.razorpayOrderId)
            throw new UnauthorizedError('Payment does not belong to this gateway order');
        if (payment.status === 'CONFIRMED') {
            if (payment.razorpayPaymentId !== dto.razorpayPaymentId)
                throw new ConflictError('Payment already confirmed with a different gateway reference');
            return this.formatReceipt(payment, payment.resident);
        }
        const isSignatureValid = this.razorpayAdapter.verifyPaymentSignature(dto.razorpayOrderId, dto.razorpayPaymentId, dto.razorpaySignature);
        if (!isSignatureValid) {
            await this.prisma.payment.update({
                where: { id: dto.paymentId },
                data: { status: 'FAILED' },
            });
            throw new UnauthorizedError('Invalid payment signature verification failed');
        }
        const captured = await this.razorpayAdapter.fetchPayment(dto.razorpayPaymentId);
        if (captured.order_id !== payment.razorpayOrderId ||
            captured.amount !== payment.amount ||
            captured.currency !== 'INR')
            throw new UnauthorizedError('Gateway payment does not match the stored order');
        if (captured.status !== 'captured')
            throw new ConflictError('Payment is awaiting capture; its status will update automatically');
        const result = await this.captureOnlinePayment({
            orderId: captured.order_id,
            gatewayPaymentId: captured.id,
            amount: captured.amount,
            currency: captured.currency,
        });
        if (result?.status === 'DISPUTED')
            throw new ConflictError('Payment received; the balance changed and requires reconciliation');
        await this.prisma.auditLog.create({
            data: {
                organizationId: orgId,
                userId,
                action: 'payment.razorpay_verified',
                entityType: 'Payment',
                entityId: payment.id,
                metadata: { razorpayPaymentId: captured.id, amount: captured.amount },
            },
        });
        return this.getReceipt(payment.id, orgId);
    }
    async handleRazorpayWebhook(rawBody, signature) {
        const isValid = this.razorpayAdapter.verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
            throw new UnauthorizedError('Invalid webhook signature');
        }
        const event = JSON.parse(rawBody);
        if (event.event === 'payment.captured' || event.event === 'order.paid') {
            const p = event.payload.payment.entity;
            const payment = await this.prisma.payment.findFirst({
                where: { razorpayOrderId: p.order_id },
            });
            if (payment && payment.status !== 'CONFIRMED') {
                await this.prisma.$transaction(async (tx) => {
                    await tx.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: 'CONFIRMED',
                            razorpayPaymentId: p.id,
                        },
                    });
                    await this.allocatePayment(tx, payment.residentId, payment.amount, payment.billingRecordId);
                });
                this.logger.log(`Confirmed payment ${payment.id} via Razorpay webhook`);
            }
        }
        return { status: 'ok' };
    }
    async allocatePayment(tx, residentId, amount, targetBillingRecordId, paymentId) {
        const records = await tx.billingRecord.findMany({
            where: {
                residentId,
                status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
            },
            orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        });
        if (targetBillingRecordId) {
            const targetIndex = records.findIndex((b) => b.id === targetBillingRecordId);
            if (targetIndex < 0)
                throw new ConflictError('The selected charge is not payable for this tenant');
            records.unshift(...records.splice(targetIndex, 1));
        }
        let remaining = amount;
        const updates = [];
        const allocations = [];
        const settled = [];
        for (const bill of records) {
            if (remaining <= 0)
                break;
            const allocated = Math.min(remaining, Math.max(0, bill.amount - bill.paidAmount));
            if (allocated <= 0)
                continue;
            remaining -= allocated;
            const paid = bill.paidAmount + allocated, status = paid === bill.amount ? 'PAID' : 'PARTIALLY_PAID';
            updates.push(Prisma.sql `(${bill.id}::uuid,${bill.version}::int,${paid}::int,${status}::billing_status)`);
            if (paymentId)
                allocations.push({
                    paymentId,
                    billingRecordId: bill.id,
                    amount: allocated,
                });
            if (status === 'PAID')
                settled.push(bill.id);
        }
        if (remaining > 0)
            throw new ConflictError('Payment exceeds outstanding dues; reload the tenant balance');
        if (updates.length) {
            const count = await tx.$executeRaw(Prisma.sql `UPDATE billing_records b SET paid_amount=v.paid,status=v.status,version=b.version+1,updated_at=NOW() FROM (VALUES ${Prisma.join(updates)}) AS v(id,version,paid,status) WHERE b.id=v.id AND b.version=v.version AND b.resident_id=${residentId}::uuid`);
            if (count !== updates.length)
                throw new ConflictError('Dues changed during payment allocation; retry after reloading');
        }
        if (allocations.length)
            await tx.paymentAllocation.createMany({ data: allocations });
        if (settled.length)
            await tx.rentInvoice.updateMany({
                where: {
                    billingRecordId: { in: settled },
                    status: { in: ['PENDING', 'FAILED'] },
                },
                data: {
                    status: 'PAID',
                    paidAt: new Date(),
                    collectionType: 'MANUAL_COLLECTION',
                },
            });
    }
    async captureOnlinePayment(input) {
        if (!input.orderId && !input.linkId)
            return;
        const validReference = input.referenceId &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.referenceId);
        const payment = await this.prisma.payment.findFirst({
            where: input.linkId
                ? {
                    OR: [
                        { paymentLinkId: input.linkId },
                        ...(validReference
                            ? [
                                {
                                    id: input.referenceId,
                                    paymentLinkId: null,
                                    notes: 'Money payment link',
                                    mode: 'RAZORPAY',
                                },
                            ]
                            : []),
                    ],
                }
                : { razorpayOrderId: input.orderId },
        });
        if (!payment)
            return;
        if (payment.amount !== input.amount || input.currency !== 'INR')
            throw new UnauthorizedError('Captured amount or currency does not match the payment intent');
        return this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM payments WHERE id=${payment.id}::uuid FOR UPDATE`;
            const current = await tx.payment.findUniqueOrThrow({
                where: { id: payment.id },
            });
            if (input.linkId &&
                current.paymentLinkId &&
                current.paymentLinkId !== input.linkId) {
                throw new UnauthorizedError('Captured link does not match the payment intent');
            }
            if (['CONFIRMED', 'DISPUTED'].includes(current.status)) {
                if (current.razorpayPaymentId === input.gatewayPaymentId)
                    return current;
                const previous = await tx.payment.findUnique({
                    where: { razorpayPaymentId: input.gatewayPaymentId },
                });
                if (previous)
                    return previous;
                const extra = await tx.payment.create({
                    data: {
                        organizationId: current.organizationId,
                        residentId: current.residentId,
                        amount: input.amount,
                        mode: 'RAZORPAY',
                        status: 'DISPUTED',
                        collectionDate: new Date(),
                        razorpayPaymentId: input.gatewayPaymentId,
                        reference: current.id,
                        notes: 'Additional gateway capture for an already settled payment intent',
                    },
                });
                await tx.auditLog.create({
                    data: {
                        organizationId: current.organizationId,
                        action: 'payment.reconciliation_required',
                        entityType: 'Payment',
                        entityId: extra.id,
                        metadata: { originalPaymentId: current.id, amount: input.amount },
                    },
                });
                return extra;
            }
            await tx.$queryRaw `SELECT id FROM residents WHERE id=${current.residentId}::uuid FOR UPDATE`;
            const balance = await tx.billingRecord.aggregate({
                where: {
                    organizationId: current.organizationId,
                    residentId: current.residentId,
                    status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
                },
                _sum: { amount: true, paidAmount: true },
            });
            const due = (balance._sum.amount ?? 0) - (balance._sum.paidAmount ?? 0);
            const target = current.billingRecordId
                ? await tx.billingRecord.findFirst({
                    where: {
                        id: current.billingRecordId,
                        residentId: current.residentId,
                        organizationId: current.organizationId,
                        status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
                    },
                })
                : null;
            const status = due < current.amount ||
                (current.billingRecordId &&
                    (!target || target.amount - target.paidAmount < current.amount))
                ? 'DISPUTED'
                : 'CONFIRMED';
            if (status === 'CONFIRMED')
                await this.allocatePayment(tx, current.residentId, current.amount, current.billingRecordId, current.id);
            const updated = await tx.payment.update({
                where: { id: current.id, version: current.version },
                data: {
                    status,
                    razorpayPaymentId: input.gatewayPaymentId,
                    ...(input.orderId ? { razorpayOrderId: input.orderId } : {}),
                    ...(input.linkId ? { paymentLinkId: input.linkId } : {}),
                    collectionDate: new Date(),
                    version: { increment: 1 },
                },
            });
            await tx.auditLog.create({
                data: {
                    organizationId: current.organizationId,
                    action: status === 'DISPUTED'
                        ? 'payment.reconciliation_required'
                        : 'payment.gateway_captured',
                    entityType: 'Payment',
                    entityId: current.id,
                    metadata: {
                        gatewayPaymentId: input.gatewayPaymentId,
                        amount: current.amount,
                    },
                },
            });
            return updated;
        });
    }
    formatReceipt(payment, resident) {
        const receiptNumber = `RCP-${payment.createdAt.getFullYear()}-${payment.id.slice(0, 8).toUpperCase()}`;
        return {
            receiptNumber,
            paymentId: payment.id,
            amountPaise: payment.amount,
            amountRupees: Monetary.toRupees(payment.amount),
            amountFormatted: Monetary.formatINR(payment.amount),
            mode: payment.mode,
            collectionDate: payment.collectionDate,
            reference: payment.reference ?? payment.razorpayPaymentId ?? null,
            resident: {
                id: resident.id,
                name: `${resident.firstName} ${resident.lastName ?? ''}`.trim(),
                mobile: resident.mobile,
                property: resident.property?.name ?? 'Accommodation',
            },
            issuedAt: payment.createdAt,
        };
    }
    async findAll(orgId, query) {
        const where = {
            organizationId: orgId,
            ...(query.startDate || query.endDate
                ? {
                    collectionDate: {
                        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
                        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
                    },
                }
                : {}),
            ...(query.residentId ? { residentId: query.residentId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.mode ? { mode: query.mode } : {}),
            ...(query.propertyId || query.search
                ? {
                    resident: {
                        ...(query.propertyId ? { propertyId: query.propertyId } : {}),
                        ...(query.search
                            ? {
                                OR: [
                                    {
                                        firstName: {
                                            contains: query.search,
                                            mode: 'insensitive',
                                        },
                                    },
                                    {
                                        lastName: {
                                            contains: query.search,
                                            mode: 'insensitive',
                                        },
                                    },
                                    { mobile: { contains: query.search } },
                                ],
                            }
                            : {}),
                    },
                }
                : {}),
        };
        const [total, payments] = await Promise.all([
            this.prisma.payment.count({ where }),
            this.prisma.payment.findMany({
                where,
                skip: (query.page - 1) * query.limit,
                take: query.limit,
                orderBy: [{ collectionDate: 'desc' }, { id: 'desc' }],
                include: {
                    resident: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            mobile: true,
                            room: { select: { roomNumber: true } },
                            bed: { select: { bedNumber: true } },
                            property: { select: { name: true } },
                        },
                    },
                },
            }),
        ]);
        const formatted = payments.map((p) => ({
            ...p,
            amountRupees: Monetary.toRupees(p.amount),
            amountFormatted: Monetary.formatINR(p.amount),
        }));
        return buildOffsetResponse(formatted, total, query.page, query.limit);
    }
    async getReceipt(paymentId, orgId) {
        const payment = await this.prisma.payment.findFirst({
            where: { id: paymentId, organizationId: orgId, status: 'CONFIRMED' },
            include: {
                resident: {
                    include: {
                        property: true,
                        room: true,
                        bed: true,
                    },
                },
            },
        });
        if (!payment) {
            throw new NotFoundError('Confirmed Payment', paymentId);
        }
        return this.formatReceipt(payment, payment.resident);
    }
};
PaymentsService = PaymentsService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        RazorpayAdapter])
], PaymentsService);
export { PaymentsService };
//# sourceMappingURL=payments.service.js.map