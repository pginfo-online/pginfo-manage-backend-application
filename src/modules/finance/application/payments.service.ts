import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import {
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
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
  private readonly logger = new Logger(PaymentsService.name);

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

    if (payment.status === 'CONFIRMED') {
      return this.formatReceipt(payment, payment.resident);
    }

    const isSignatureValid = this.razorpayAdapter.verifyPaymentSignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );

    if (!isSignatureValid) {
      await this.prisma.payment.update({
        where: { id: dto.paymentId },
        data: { status: 'FAILED' },
      });
      throw new UnauthorizedError(
        'Invalid payment signature verification failed',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: dto.paymentId },
        data: {
          status: 'CONFIRMED',
          razorpayPaymentId: dto.razorpayPaymentId,
          razorpaySignature: dto.razorpaySignature,
        },
      });

      // Allocate to bills
      await this.allocatePayment(
        tx,
        payment.residentId,
        payment.amount,
        payment.billingRecordId,
      );

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'payment.razorpay_verified',
          entityType: 'Payment',
          entityId: dto.paymentId,
          metadata: {
            razorpayPaymentId: dto.razorpayPaymentId,
            amount: payment.amount,
          },
        },
      });

      return this.formatReceipt(updatedPayment, payment.resident);
    });
  }

  /**
   * Webhook handler for asynchronous Razorpay events.
   */
  async handleRazorpayWebhook(rawBody: string, signature: string) {
    const isValid = this.razorpayAdapter.verifyWebhookSignature(
      rawBody,
      signature,
    );
    if (!isValid) {
      throw new UnauthorizedError('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody) as {
      event: string;
      payload: {
        payment: { entity: { id: string; order_id: string; amount: number } };
      };
    };

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
          await this.allocatePayment(
            tx,
            payment.residentId,
            payment.amount,
            payment.billingRecordId,
          );
        });
        this.logger.log(`Confirmed payment ${payment.id} via Razorpay webhook`);
      }
    }

    return { status: 'ok' };
  }

  /**
   * Allocates payment amount to either targeted billing record or across unpaid bills FIFO.
   */
  private async allocatePayment(
    tx: Prisma.TransactionClient,
    residentId: string,
    amount: number,
    targetBillingRecordId?: string | null,
  ) {
    let remainingAmount = amount;

    if (targetBillingRecordId) {
      const record = await tx.billingRecord.findUnique({
        where: { id: targetBillingRecordId },
      });
      if (
        !record ||
        record.residentId !== residentId ||
        !['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'].includes(record.status)
      ) {
        throw new ConflictError(
          'The selected charge is not payable for this tenant',
        );
      }
      {
        const dueOnRecord = record.amount - record.paidAmount;
        const allocation = Math.min(dueOnRecord, remainingAmount);
        const newPaid = record.paidAmount + allocation;
        await tx.billingRecord.update({
          where: { id: targetBillingRecordId, version: record.version },
          data: {
            paidAmount: newPaid,
            status: newPaid >= record.amount ? 'PAID' : 'PARTIALLY_PAID',
            version: { increment: 1 },
          },
        });
        remainingAmount -= allocation;
      }
    }

    // Allocate any remaining amount to oldest unpaid bills (FIFO)
    if (remainingAmount > 0) {
      const unpaidRecords = await tx.billingRecord.findMany({
        where: {
          residentId,
          status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
          ...(targetBillingRecordId
            ? { id: { not: targetBillingRecordId } }
            : {}),
        },
        orderBy: { dueDate: 'asc' },
      });

      for (const record of unpaidRecords) {
        if (remainingAmount <= 0) break;
        const dueOnRecord = record.amount - record.paidAmount;
        if (dueOnRecord <= 0) continue;

        const allocation = Math.min(dueOnRecord, remainingAmount);
        const newPaid = record.paidAmount + allocation;
        await tx.billingRecord.update({
          where: { id: record.id, version: record.version },
          data: {
            paidAmount: newPaid,
            status: newPaid >= record.amount ? 'PAID' : 'PARTIALLY_PAID',
            version: { increment: 1 },
          },
        });
        remainingAmount -= allocation;
      }
    }
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
    },
    resident: {
      id: string;
      firstName: string;
      lastName?: string | null;
      mobile: string;
      property?: { name: string } | null;
    },
  ) {
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

  /**
   * Lists payments with pagination and filters.
   */
  async findAll(orgId: string, query: QueryPaymentsDto) {
    const where: Prisma.PaymentWhereInput = {
      organizationId: orgId,
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
                          mode: 'insensitive' as const,
                        },
                      },
                      {
                        lastName: {
                          contains: query.search,
                          mode: 'insensitive' as const,
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

  /**
   * Retrieves single payment receipt.
   */
  async getReceipt(paymentId: string, orgId: string) {
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
}
