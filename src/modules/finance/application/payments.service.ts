import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import {
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
} from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { dateKeyInTimeZone } from '../../../common/time/property-date.js';
import { paymentPropertyScope } from '../domain/collection-lines.js';
import { Monetary } from '../domain/monetary.js';
import type {
  RecordPaymentDto,
  CreateRazorpayOrderDto,
  VerifyRazorpayPaymentDto,
  QueryPaymentsDto,
} from '../api/dto/payment.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayAdapter: RazorpayAdapter,
  ) {}

  /**
   * Records a manual / offline payment (Cash, UPI, Cheque, Bank Transfer)
   * and automatically allocates it to unpaid bills.
   */
  async recordPayment(dto: RecordPaymentDto, orgId: string, userId: string) {
    const resident = await this.prisma.resident.findFirst({
      where: { id: dto.residentId, organizationId: orgId },
      include: { property: true },
    });

    if (!resident) {
      throw new NotFoundError('Resident', dto.residentId);
    }

    // Check idempotency if key provided
    if (dto.idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        throw new ConflictError(
          'A payment with this idempotency key has already been recorded',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM residents WHERE id=${resident.id}::uuid FOR UPDATE`;
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

      // Allocate payment to billing records
      await this.allocatePayment(
        tx,
        resident.id,
        dto.amount,
        dto.billingRecordId,
        payment.id,
      );

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

  /**
   * Creates a Razorpay payment order on the server.
   */
  async createRazorpayOrder(
    dto: CreateRazorpayOrderDto,
    orgId: string,
    userId: string,
  ) {
    const resident = await this.prisma.resident.findFirst({
      where: { id: dto.residentId, organizationId: orgId },
    });

    if (!resident) {
      throw new NotFoundError('Resident', dto.residentId);
    }
    if (!this.razorpayAdapter.canCreateMoneyLinks())
      throw new ServiceUnavailableException(
        'Razorpay collection is unavailable',
      );
    const balances = await this.prisma.billingRecord.groupBy({
      by: ['propertyId'],
      where: {
        residentId: resident.id,
        organizationId: orgId,
        id: dto.billingRecordId,
        status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      _sum: { amount: true, paidAmount: true },
    });
    const payable = balances.filter(
      (row) => (row._sum.amount ?? 0) > (row._sum.paidAmount ?? 0),
    );
    if (payable.length !== 1)
      throw new ValidationError('Choose one property with outstanding dues');
    const [balance] = payable;
    if (
      dto.amount >
      (balance!._sum.amount ?? 0) - (balance!._sum.paidAmount ?? 0)
    )
      throw new ConflictError('Order amount exceeds current dues');
    const payment = await this.prisma.payment.create({
      data: {
        organizationId: orgId,
        residentId: resident.id,
        billingRecordId: dto.billingRecordId,
        amount: dto.amount,
        status: 'PENDING',
        mode: 'RAZORPAY',
        notes: 'Razorpay Checkout',
        collectionDate: new Date(),
        capturePropertyId: balance!.propertyId,
        recordedBy: userId,
      },
    });
    // The provider's order receipt can recover an intent whose creation response was lost.
    const order = await this.razorpayAdapter.createOrder(
      dto.amount,
      payment.id,
      {
        residentId: resident.id,
        organizationId: orgId,
        moneyPaymentId: payment.id,
      },
    );
    if (
      order.amount !== dto.amount ||
      order.currency !== 'INR' ||
      order.receipt !== payment.id
    )
      throw new ServiceUnavailableException(
        'Razorpay returned an unexpected payment order',
      );
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { razorpayOrderId: order.orderId },
    });

    return {
      paymentId: payment.id,
      razorpayOrderId: order.orderId,
      amountPaise: dto.amount,
      amountRupees: Monetary.toRupees(dto.amount),
      currency: 'INR',
    };
  }

  /**
   * Cryptographically verifies Razorpay payment signature and confirms payment.
   */
  async verifyRazorpayPayment(
    dto: VerifyRazorpayPaymentDto,
    orgId: string,
    userId: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: dto.paymentId, organizationId: orgId },
      include: { resident: { include: { property: true } } },
    });

    if (!payment) {
      throw new NotFoundError('Payment', dto.paymentId);
    }

    if (payment.razorpayOrderId !== dto.razorpayOrderId)
      throw new UnauthorizedError(
        'Payment does not belong to this gateway order',
      );

    const isSignatureValid = this.razorpayAdapter.verifyPaymentSignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );

    if (!isSignatureValid)
      throw new UnauthorizedError('Invalid payment signature');
    if (payment.status === 'CONFIRMED') {
      if (payment.razorpayPaymentId !== dto.razorpayPaymentId)
        throw new ConflictError(
          'Payment already confirmed with a different gateway reference',
        );
      return this.getReceipt(payment.id, orgId);
    }

    const captured = await this.razorpayAdapter.fetchPayment(
      dto.razorpayPaymentId,
    );
    if (
      captured.order_id !== payment.razorpayOrderId ||
      captured.amount !== payment.amount ||
      captured.currency !== 'INR'
    )
      throw new UnauthorizedError(
        'Gateway payment does not match the stored order',
      );
    if (captured.status !== 'captured')
      throw new ConflictError(
        'Payment is awaiting capture; its status will update automatically',
      );
    const result = await this.captureOnlinePayment({
      orderId: captured.order_id,
      gatewayPaymentId: captured.id,
      amount: captured.amount,
      currency: captured.currency,
    });
    if (result?.status === 'DISPUTED')
      throw new ConflictError(
        'Payment received; the balance changed and requires reconciliation',
      );
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

  /**
   * Allocates payment amount to either targeted billing record or across unpaid bills FIFO.
   */
  private async allocatePayment(
    tx: Prisma.TransactionClient,
    residentId: string,
    amount: number,
    targetBillingRecordId?: string | null,
    paymentId?: string,
    collectionType: 'MANUAL_COLLECTION' | 'FALLBACK_LINK' = 'MANUAL_COLLECTION',
    paidAt = new Date(),
    propertyId?: string | null,
  ) {
    const records = await tx.billingRecord.findMany({
      where: {
        residentId,
        propertyId: propertyId ?? undefined,
        status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    });
    if (targetBillingRecordId) {
      const targetIndex = records.findIndex(
        (b) => b.id === targetBillingRecordId,
      );
      if (targetIndex < 0)
        throw new ConflictError(
          'The selected charge is not payable for this tenant',
        );
      records.unshift(...records.splice(targetIndex, 1));
    }
    let remaining = amount;
    const updates: Prisma.Sql[] = [];
    const allocations: {
      paymentId: string;
      billingRecordId: string;
      amount: number;
    }[] = [];
    const settled: string[] = [];
    for (const bill of records) {
      if (remaining <= 0) break;
      const allocated = Math.min(
        remaining,
        Math.max(0, bill.amount - bill.paidAmount),
      );
      if (allocated <= 0) continue;
      remaining -= allocated;
      const paid = bill.paidAmount + allocated,
        status = paid === bill.amount ? 'PAID' : 'PARTIALLY_PAID';
      updates.push(
        Prisma.sql`(${bill.id}::uuid,${bill.version}::int,${paid}::int,${status}::billing_status)`,
      );
      if (paymentId)
        allocations.push({
          paymentId,
          billingRecordId: bill.id,
          amount: allocated,
        });
      if (status === 'PAID') settled.push(bill.id);
    }
    if (remaining > 0)
      throw new ConflictError(
        'Payment exceeds outstanding dues; reload the tenant balance',
      );
    if (updates.length) {
      const count = await tx.$executeRaw(
        Prisma.sql`UPDATE billing_records b SET paid_amount=v.paid,status=v.status,version=b.version+1,updated_at=NOW() FROM (VALUES ${Prisma.join(updates)}) AS v(id,version,paid,status) WHERE b.id=v.id AND b.version=v.version AND b.resident_id=${residentId}::uuid`,
      );
      if (count !== updates.length)
        throw new ConflictError(
          'Dues changed during payment allocation; retry after reloading',
        );
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
          paidAt,
          collectionType,
        },
      });
  }

  /** Called only after signature verification by the authoritative webhook. */
  async captureOnlinePayment(input: {
    orderId?: string;
    linkId?: string;
    qrId?: string;
    capturedAt?: Date;
    referenceId?: string;
    gatewayPaymentId: string;
    amount: number;
    currency?: string;
  }) {
    if (!input.orderId && !input.linkId && !input.qrId) return;
    const capturedAt = input.capturedAt ?? new Date();
    const instrument = input.qrId
      ? { gatewayQrId: input.qrId }
      : input.linkId
        ? { paymentLinkId: input.linkId }
        : { razorpayOrderId: input.orderId! };
    const validReference =
      input.referenceId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        input.referenceId,
      );
    const recovery = input.qrId
      ? { gatewayQrId: null, notes: 'Money payment QR' }
      : input.linkId
        ? { paymentLinkId: null, notes: 'Money payment link' }
        : { razorpayOrderId: null, notes: 'Razorpay Checkout' };
    const payment = await this.prisma.payment.findFirst({
      where: {
        mode: 'RAZORPAY',
        OR: [
          instrument,
          ...(validReference ? [{ id: input.referenceId, ...recovery }] : []),
        ],
      },
      include: {
        resident: {
          select: { property: { select: { id: true, timezone: true } } },
        },
      },
    });
    if (!payment) return;
    if (
      !Number.isSafeInteger(input.amount) ||
      input.amount <= 0 ||
      input.currency !== 'INR'
    )
      throw new UnauthorizedError(
        'Captured amount or currency does not match the payment intent',
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM residents WHERE id=${payment.residentId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM payments WHERE id=${payment.id}::uuid FOR UPDATE`;
      const current = await tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      if (
        (input.orderId &&
          current.razorpayOrderId &&
          current.razorpayOrderId !== input.orderId) ||
        (input.linkId &&
          current.paymentLinkId &&
          current.paymentLinkId !== input.linkId) ||
        (input.qrId &&
          current.gatewayQrId &&
          current.gatewayQrId !== input.qrId)
      )
        throw new UnauthorizedError(
          'Captured instrument does not match the payment intent',
        );

      const previous = await tx.payment.findUnique({
        where: { razorpayPaymentId: input.gatewayPaymentId },
      });
      if (previous) return previous;

      const property =
        current.capturePropertyId &&
        current.capturePropertyId !== payment.resident?.property.id
          ? await tx.property.findFirst({
              where: {
                id: current.capturePropertyId,
                organizationId: current.organizationId,
              },
              select: { timezone: true },
            })
          : payment.resident?.property;
      const timezone = property?.timezone ?? 'Asia/Kolkata';
      const collectionDate = new Date(
        `${dateKeyInTimeZone(capturedAt, timezone)}T00:00:00.000Z`,
      );
      const capture = {
        capturedAt,
        collectionDate,
        capturePropertyId:
          current.capturePropertyId ?? payment.resident?.property.id,
        capturePlatformFee: 0,
        razorpayPaymentId: input.gatewayPaymentId,
      };
      if (
        current.razorpayPaymentId ||
        ['CONFIRMED', 'DISPUTED', 'REFUNDED'].includes(current.status)
      ) {
        const extra = await tx.payment.create({
          data: {
            ...capture,
            organizationId: current.organizationId,
            residentId: current.residentId,
            amount: input.amount,
            mode: 'RAZORPAY',
            status: 'DISPUTED',
            reference: current.id,
            notes:
              'Additional gateway capture for an already settled payment intent',
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
      const balance = await tx.billingRecord.aggregate({
        where: {
          organizationId: current.organizationId,
          residentId: current.residentId,
          propertyId: capture.capturePropertyId ?? undefined,
          status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        _sum: { amount: true, paidAmount: true },
      });
      const due = (balance._sum.amount ?? 0) - (balance._sum.paidAmount ?? 0);
      // A captured payment is never discarded when another payment already
      // settled the bills. Keep it visible for reconciliation instead.
      const target = current.billingRecordId
        ? await tx.billingRecord.findFirst({
            where: {
              id: current.billingRecordId,
              residentId: current.residentId,
              propertyId: capture.capturePropertyId ?? undefined,
              organizationId: current.organizationId,
              status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
            },
          })
        : null;
      const status =
        input.amount !== current.amount ||
        due < current.amount ||
        (current.billingRecordId &&
          (!target || target.amount - target.paidAmount < current.amount))
          ? 'DISPUTED'
          : 'CONFIRMED';
      if (status === 'CONFIRMED')
        await this.allocatePayment(
          tx,
          current.residentId,
          current.amount,
          current.billingRecordId,
          current.id,
          input.linkId ? 'FALLBACK_LINK' : 'MANUAL_COLLECTION',
          capturedAt,
          capture.capturePropertyId,
        );
      const updated = await tx.payment.update({
        where: { id: current.id, version: current.version },
        data: {
          status,
          ...capture,
          amount: input.amount,
          ...(input.orderId ? { razorpayOrderId: input.orderId } : {}),
          ...(input.linkId ? { paymentLinkId: input.linkId } : {}),
          ...(input.qrId ? { gatewayQrId: input.qrId } : {}),
          version: { increment: 1 },
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: current.organizationId,
          action:
            status === 'DISPUTED'
              ? 'payment.reconciliation_required'
              : 'payment.gateway_captured',
          entityType: 'Payment',
          entityId: current.id,
          metadata: {
            gatewayPaymentId: input.gatewayPaymentId,
            amount: input.amount,
            expectedAmount: current.amount,
          },
        },
      });
      return updated;
    });
  }

  async applyDisputedCapture(id: string, reviewerId: string, reason: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, mode: 'RAZORPAY', razorpayPaymentId: { not: null } },
    });
    if (!payment) throw new NotFoundError('Captured payment', id);
    if (payment.status === 'CONFIRMED') return payment;
    const gateway = await this.razorpayAdapter.fetchPayment(
      payment.razorpayPaymentId!,
    );
    if (
      gateway.status !== 'captured' ||
      gateway.amount !== payment.amount ||
      gateway.currency !== 'INR' ||
      gateway.amount_refunded !== 0
    )
      throw new ConflictError(
        'The gateway payment is not eligible for due allocation',
      );

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM residents WHERE id=${payment.residentId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM payments WHERE id=${id}::uuid FOR UPDATE`;
      const current = await tx.payment.findUniqueOrThrow({
        where: { id },
        include: { _count: { select: { allocations: true } } },
      });
      if (current.status === 'CONFIRMED') return current;
      if (
        current.status !== 'DISPUTED' ||
        current.gatewayRefundedAmount > 0 ||
        current._count.allocations > 0 ||
        !current.capturePropertyId
      )
        throw new ConflictError(
          'The payment cannot be applied to current dues',
        );
      const collectionType = current.paymentLinkId
        ? 'FALLBACK_LINK'
        : 'MANUAL_COLLECTION';
      await this.allocatePayment(
        tx,
        current.residentId,
        current.amount,
        current.billingRecordId,
        id,
        collectionType,
        current.capturedAt ?? current.collectionDate,
        current.capturePropertyId,
      );
      const updated = await tx.payment.update({
        where: { id, version: current.version },
        data: { status: 'CONFIRMED', version: { increment: 1 } },
      });
      await tx.auditLog.create({
        data: {
          organizationId: current.organizationId,
          userId: reviewerId,
          entityType: 'Payment',
          entityId: id,
          action: 'platform_collection.applied_to_dues',
          metadata: { reason, amount: current.amount },
        },
      });
      return updated;
    });
  }

  async syncGatewayRefund(gatewayPaymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayPaymentId: gatewayPaymentId },
    });
    if (!payment) {
      // The refund can arrive before the captured event. Acknowledging it here
      // would lose the refund once capture is processed.
      throw new ConflictError('Gateway capture has not been recorded yet');
    }
    const gateway = await this.razorpayAdapter.fetchPayment(gatewayPaymentId);
    const refunded = gateway.amount_refunded;
    if (
      gateway.currency !== 'INR' ||
      gateway.amount !== payment.amount ||
      refunded === undefined ||
      !Number.isSafeInteger(refunded) ||
      refunded <= 0 ||
      refunded > payment.amount
    )
      throw new ConflictError(
        'Gateway refund balance is not ready for reconciliation',
      );

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM residents WHERE id=${payment.residentId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM payments WHERE id=${payment.id}::uuid FOR UPDATE`;
      const current = await tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: { allocations: { orderBy: { billingRecordId: 'desc' } } },
      });
      if (refunded <= current.gatewayRefundedAmount) return;
      const allocated = current.allocations.reduce(
        (sum, item) => sum + item.amount,
        0,
      );
      const canReverse =
        current.status === 'CONFIRMED' && allocated === current.amount;
      if (canReverse) {
        let remaining = refunded - current.gatewayRefundedAmount;
        for (const allocation of current.allocations) {
          if (!remaining) break;
          const reversed = Math.min(
            allocation.amount - allocation.refundedAmount,
            remaining,
          );
          if (!reversed) continue;
          const bill = await tx.billingRecord.findUniqueOrThrow({
            where: { id: allocation.billingRecordId },
          });
          if (bill.paidAmount < reversed || bill.status === 'CANCELLED')
            throw new ConflictError(
              'Billing record changed and requires refund reconciliation',
            );
          const paidAmount = bill.paidAmount - reversed;
          await tx.billingRecord.update({
            where: { id: bill.id, version: bill.version },
            data: {
              paidAmount,
              status: paidAmount > 0 ? 'PARTIALLY_PAID' : 'DUE',
              version: { increment: 1 },
            },
          });
          await tx.rentInvoice.updateMany({
            where: { billingRecordId: bill.id, status: 'PAID' },
            data: { status: 'PENDING', paidAt: null },
          });
          await tx.paymentAllocation.update({
            where: {
              paymentId_billingRecordId: {
                paymentId: payment.id,
                billingRecordId: bill.id,
              },
            },
            data: { refundedAmount: { increment: reversed } },
          });
          remaining -= reversed;
        }
      }
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          gatewayRefundedAmount: refunded,
          status:
            refunded === current.amount &&
            (canReverse || current.status === 'DISPUTED')
              ? 'REFUNDED'
              : canReverse
                ? 'CONFIRMED'
                : 'DISPUTED',
          version: { increment: 1 },
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: current.organizationId,
          action: 'payment.gateway_refunded',
          entityType: 'Payment',
          entityId: current.id,
          metadata: {
            gatewayPaymentId,
            refunded,
            priorRefunded: current.gatewayRefundedAmount,
            allocationReversed: canReverse,
          },
        },
      });
    });
  }

  /**
   * Generates formatted receipt data for confirmed payment.
   */
  private formatReceipt(
    payment: {
      id: string;
      amount: number;
      mode: string;
      collectionDate: Date;
      reference?: string | null;
      razorpayPaymentId?: string | null;
      createdAt: Date;
      capturedAt?: Date | null;
      gatewayRefundedAmount?: number;
      allocations?: {
        amount: number;
        billingRecord: { type: string; description: string | null };
      }[];
    },
    resident: {
      id: string;
      firstName: string;
      lastName?: string | null;
      mobile: string;
      property?: { name: string } | null;
    },
  ) {
    const receiptNumber = `RCP-${payment.createdAt.getUTCFullYear()}-${payment.id.slice(0, 8).toUpperCase()}`;

    return {
      receiptNumber,
      paymentId: payment.id,
      amountPaise: payment.amount,
      amountRupees: Monetary.toRupees(payment.amount),
      amountFormatted: Monetary.formatINR(payment.amount),
      mode: payment.mode,
      collectionDate: payment.collectionDate,
      reference: payment.razorpayPaymentId ?? payment.reference ?? null,
      refundedAmountPaise: payment.gatewayRefundedAmount ?? 0,
      refundedAmountFormatted: Monetary.formatINR(
        payment.gatewayRefundedAmount ?? 0,
      ),
      allocations:
        payment.allocations?.map(({ amount, billingRecord }) => ({
          type: billingRecord.type,
          description: billingRecord.description,
          amountPaise: amount,
          amountFormatted: Monetary.formatINR(amount),
        })) ?? [],
      resident: {
        id: resident.id,
        name: `${resident.firstName} ${resident.lastName ?? ''}`.trim(),
        mobile: resident.mobile,
        property: resident.property?.name ?? 'Accommodation',
      },
      issuedAt: payment.capturedAt ?? payment.createdAt,
    };
  }

  /**
   * Lists payments with pagination and filters.
   */
  async findAll(orgId: string, query: QueryPaymentsDto) {
    const where: Prisma.PaymentWhereInput = {
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
      ...paymentPropertyScope(query.propertyId),
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
      netAmountPaise: p.amount - p.gatewayRefundedAmount,
    }));

    return buildOffsetResponse(formatted, total, query.page, query.limit);
  }

  /**
   * Retrieves single payment receipt.
   */
  async getReceipt(paymentId: string, orgId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, organizationId: orgId, status: 'CONFIRMED' },
      include: {
        billingRecord: { select: { propertyId: true } },
        allocations: {
          orderBy: { billingRecordId: 'asc' },
          select: {
            amount: true,
            billingRecord: { select: { type: true, description: true } },
          },
        },
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

    const propertyId =
      payment.capturePropertyId ?? payment.billingRecord?.propertyId;
    const historicalProperty =
      propertyId && propertyId !== payment.resident.propertyId
        ? await this.prisma.property.findFirst({
            where: { id: propertyId, organizationId: orgId },
            select: { name: true },
          })
        : null;
    return this.formatReceipt(payment, {
      ...payment.resident,
      property: historicalProperty ?? payment.resident.property,
    });
  }
}
