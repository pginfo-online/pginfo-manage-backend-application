import {
  BadRequestException,
  Injectable,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import { UnauthorizedError } from '../../../common/errors/index.js';
import { Monetary } from '../domain/monetary.js';
import {
  WHATSAPP_ADAPTER,
  type WhatsAppAdapter,
} from '../../communications/domain/notification.interfaces.js';
import type { EnvConfig } from '../../../config/index.js';
import { Prisma } from '@prisma/client';
import { dateKeyInTimeZone } from '../../../common/time/property-date.js';
import { MoneyLinksService } from './money-links.service.js';
import { PaymentsService } from './payments.service.js';

export interface RazorpayWebhookPayload {
  entity: string;
  account_id?: string;
  event: string;
  id?: string; // event id
  contains?: string[];
  created_at?: number;
  payload: {
    qr_code?: {
      entity: {
        id: string;
        close_reason?: string;
        notes?: Record<string, string>;
      };
    };
    refund?: { entity: { id: string; payment_id: string } };
    payment_link?: {
      entity: {
        id: string;
        reference_id?: string;
        amount: number;
        amount_paid?: number;
        status?: string;
        notes?: Record<string, string>;
      };
    };
    subscription?: {
      entity: {
        id: string;
        plan_id?: string;
        customer_id?: string;
        status?: string;
        token_id?: string;
        paid_count?: number;
        charge_at?: number | null;
        current_start?: number | null;
        total_count?: number;
        auth_attempts?: number;
        notes?: Record<string, string>;
      };
    };
    payment?: {
      entity: {
        id: string;
        created_at?: number;
        amount: number;
        currency?: string;
        status?: string;
        order_id?: string;
        subscription_id?: string;
        method?: string;
        bank?: string;
        wallet?: string;
        vpa?: string;
        email?: string;
        contact?: string;
        error_code?: string;
        error_description?: string;
        acquirer_data?: {
          bank_transaction_id?: string;
          upi_transaction_id?: string;
          auth_code?: string;
        };
        notes?: Record<string, string>;
      };
    };
    order?: {
      entity: {
        id: string;
        amount?: number;
        status?: string;
        receipt?: string;
      };
    };
  };
}

@Injectable()
export class RazorpayWebhookService {
  private readonly logger = new Logger(RazorpayWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayAdapter: RazorpayAdapter,
    private readonly config: ConfigService<EnvConfig, true>,
    @Optional()
    @Inject(WHATSAPP_ADAPTER)
    private readonly whatsappAdapter?: WhatsAppAdapter,
    @Optional() private readonly paymentsService?: PaymentsService,
    @Optional() private readonly moneyLinks?: MoneyLinksService,
  ) {}

  private getPlatformFeePaise(): number {
    return this.config.get('PLATFORM_FEE_PAISE') ?? 3000;
  }

  /**
   * Authoritative webhook ingestion pipeline with strict HMAC SHA-256 verification,
   * idempotency deduplication, and handling of Autopay lifecycle events.
   */
  async handleWebhook(
    rawBody: Buffer | string,
    signature: string,
    providerEventId?: string,
  ) {
    // 1. Strict cryptographic signature verification
    const isValid = this.razorpayAdapter.verifyWebhookSignature(
      rawBody,
      signature,
    );
    if (!isValid) {
      this.logger.warn('Razorpay webhook HMAC signature verification failed');
      throw new UnauthorizedError('Invalid webhook signature');
    }

    // 2. Parse payload safely
    let event: RazorpayWebhookPayload;
    try {
      event = JSON.parse(rawBody.toString()) as RazorpayWebhookPayload;
    } catch {
      this.logger.error('Failed to parse webhook JSON body');
      throw new BadRequestException('Invalid JSON payload');
    }

    if (
      typeof event?.event !== 'string' ||
      !event.payload ||
      typeof event.payload !== 'object'
    )
      throw new BadRequestException('Invalid webhook event');

    // 3. Deduplication & Idempotency Key
    // Use event.id if provided by Razorpay; otherwise hash rawBody to guarantee deterministic event identity
    const eventId =
      providerEventId ||
      event.id ||
      `evt_${createHash('sha256').update(rawBody).digest('hex').slice(0, 32)}`;

    const diagnosticPayload = {
      accountId: event.account_id ?? null,
      createdAt: event.created_at ?? null,
      paymentId:
        event.payload.payment?.entity.id ??
        event.payload.refund?.entity.payment_id ??
        null,
      orderId:
        event.payload.order?.entity.id ??
        event.payload.payment?.entity.order_id ??
        null,
      subscriptionId:
        event.payload.subscription?.entity.id ??
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
      this.logger.log(
        `Webhook event ${eventId} (${event.event}) already processed. Skipping idempotently.`,
      );
      return {
        status: 'already_processed',
        eventId,
        processedAt: existingEvent.processedAt,
      };
    }

    this.logger.log(
      `Processing authoritative webhook event: ${event.event} [${eventId}]`,
    );

    try {
      // 4. Route event to specific handler
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
          // Can be subscription charge or one-time checkout
          if (event.payload.payment?.entity?.subscription_id) {
            await this.handleSubscriptionCharged(event);
          } else {
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

      // 5. Record successful event in WebhookEvent table for idempotency
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
    } catch (err: unknown) {
      const errorMsg = (err as Error).message;
      this.logger.error(
        `Error processing webhook event ${event.event}: ${errorMsg}`,
        (err as Error).stack,
      );

      // Record failure for diagnostics but still persist event
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
      } catch {
        // Ignore duplicate key if concurrent
      }

      throw err;
    }
  }

  private eventTime(event: RazorpayWebhookPayload): Date {
    return event.created_at ? new Date(event.created_at * 1000) : new Date();
  }

  private async updateMandateLifecycle(event: RazorpayWebhookPayload) {
    const statuses = {
      'subscription.authenticated': 'AUTHENTICATED',
      'subscription.activated': 'ACTIVE',
      'subscription.resumed': 'ACTIVE',
      'subscription.completed': 'COMPLETED',
      'subscription.expired': 'EXPIRED',
      'subscription.halted': 'PENDING',
      'subscription.cancelled': 'REVOKED',
      'subscription.paused': 'PAUSED',
    } as const;
    const status = statuses[event.event as keyof typeof statuses];
    const sub = event.payload.subscription?.entity;
    if (!sub || !status) return;
    const mandate = await this.prisma.tenantMandate.findUnique({
      where: { razorpaySubscriptionId: sub.id },
    });
    if (!mandate) return;
    const time = this.eventTime(event);
    const activated = status === 'ACTIVE' || status === 'AUTHENTICATED';
    const payment = event.payload.payment?.entity;
    const bankReference =
      payment?.acquirer_data?.bank_transaction_id ||
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

  /**
   * Event 2: `subscription.charged` / `payment.captured`
   * - Extracts payment_id, amount, and subscription_id.
   * - Updates/creates rent_invoices for current month: status = 'PAID', paid_at = NOW(), collection_type = 'AUTOPAY'.
   * - Sends a tenant receipt after allocating the funds.
   */
  private async handleSubscriptionCharged(event: RazorpayWebhookPayload) {
    const payment = event.payload.payment?.entity;
    const sub = event.payload.subscription?.entity;

    const paymentId = payment?.id;
    const subscriptionId = payment?.subscription_id || sub?.id;
    const totalAmount = payment?.amount;

    if (
      !paymentId ||
      !subscriptionId ||
      !Number.isSafeInteger(totalAmount) ||
      !totalAmount ||
      totalAmount <= 0 ||
      payment?.currency !== 'INR' ||
      payment?.status !== 'captured'
    ) {
      this.logger.warn(
        'Incomplete payment/subscription details in subscription.charged event',
      );
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
      this.logger.warn(
        `TenantMandate not found for subscription ${subscriptionId}`,
      );
      return;
    }

    const now = this.eventTime(event);
    const billingTimestamp = sub?.current_start || payment?.created_at;
    const propertyDate = dateKeyInTimeZone(
      billingTimestamp ? new Date(billingTimestamp * 1000) : now,
      mandate.property.timezone,
    );
    const billingMonth = Number(propertyDate.slice(5, 7));
    const billingYear = Number(propertyDate.slice(0, 4));

    const platformFee = Math.min(totalAmount, this.getPlatformFeePaise());
    const transferAmount = Math.max(0, totalAmount - platformFee);

    const invoiceNumber = `INV-${billingYear}${String(billingMonth).padStart(2, '0')}-${mandate.tenantId.slice(0, 8).toUpperCase()}`;

    // Execute database updates inside transaction
    const capture = await this.prisma.$transaction(async (tx) => {
      // Serialize subscription captures against manual and payment-link collections.
      await tx.$queryRaw`SELECT id FROM residents WHERE id=${mandate.tenantId}::uuid FOR UPDATE`;
      const previous = await tx.payment.findUnique({
        where: { razorpayPaymentId: paymentId },
        select: { id: true },
      });
      if (previous) return null;

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

      // Match the captured amount against the rent bill for this cycle.
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

      const canAllocate =
        !alreadySettled &&
        billingRecord &&
        ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'].includes(
          billingRecord.status,
        ) &&
        billingRecord.amount - billingRecord.paidAmount >= totalAmount;
      const invoicePaid =
        canAllocate &&
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
          dueDate: new Date(
            Date.UTC(billingYear, billingMonth - 1, mandate.billingDay),
          ),
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
            status:
              paidAmount === billingRecord.amount ? 'PAID' : 'PARTIALLY_PAID',
            paidAmount,
            version: { increment: 1 },
          },
        });

        // Link billingRecord to invoice
        await tx.rentInvoice.update({
          where: { id: inv.id },
          data: { billingRecordId: billingRecord.id },
        });
      }

      // Record in Payment table
      await tx.payment.create({
        data: {
          organizationId: mandate.organizationId,
          residentId: mandate.tenantId,
          billingRecordId: canAllocate ? billingRecord.id : undefined,
          amount: totalAmount,
          status: canAllocate ? 'CONFIRMED' : 'DISPUTED',
          mode: 'RAZORPAY',
          collectionDate: new Date(
            `${dateKeyInTimeZone(now, mandate.property.timezone)}T00:00:00.000Z`,
          ),
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
      await this.sendReceiptNotifications(
        mandate,
        totalAmount,
        billingMonth,
        billingYear,
        paymentId,
      );
  }

  /**
   * Sends a tenant receipt after the rent ledger records the capture.
   */
  private async sendReceiptNotifications(
    mandate: Prisma.TenantMandateGetPayload<{
      include: { tenant: true; property: true; unit: true };
    }>,
    totalAmount: number,
    month: number,
    year: number,
    paymentId: string,
  ) {
    const rentRupees = Monetary.toRupees(totalAmount);

    const unitStr = mandate.unit
      ? `Unit ${mandate.unit.roomNumber}`
      : 'your unit';

    // Tenant receipt via WhatsApp
    const tenantPhone = mandate.tenant.whatsappNumber || mandate.tenant.mobile;
    const tenantMsg =
      `✅ Rent Autopay Successful!\n\n` +
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
      } catch (err) {
        this.logger.warn(
          `Failed to send tenant WhatsApp receipt: ${(err as Error).message}`,
        );
      }
    }
  }

  /**
   * Event 3: `subscription.pending` / `payment.failed`
   * - Marks the invoice status as FAILED.
   * - Increments retry counter.
   * - Triggers a notification with a one-time instant fallback payment link.
   */
  private async handlePaymentFailed(event: RazorpayWebhookPayload) {
    const payment = event.payload.payment?.entity;
    const sub = event.payload.subscription?.entity;

    const subscriptionId = payment?.subscription_id || sub?.id;
    const failureReason =
      payment?.error_description ||
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
      this.logger.warn(
        `TenantMandate not found for failed subscription ${subscriptionId}`,
      );
      return;
    }

    const now = this.eventTime(event);
    const periodStart = sub?.current_start
      ? new Date(sub.current_start * 1000)
      : now;
    const propertyDate = dateKeyInTimeZone(
      periodStart,
      mandate.property.timezone,
    );
    const billingMonth = Number(propertyDate.slice(5, 7));
    const billingYear = Number(propertyDate.slice(0, 4));
    const key = { tenantId: mandate.tenantId, billingMonth, billingYear };
    const invoice = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM residents WHERE id=${mandate.tenantId}::uuid FOR UPDATE`;
      const existing = await tx.rentInvoice.findUnique({
        where: { tenantId_billingMonth_billingYear: key },
      });
      if (existing?.status === 'PAID') return null;
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
      if (bill?.status === 'PAID') return null;
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
      if (!claimed.count) return null;
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
      const platformFee = Math.min(
        mandate.rentAmount,
        this.getPlatformFeePaise(),
      );
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
          dueDate: new Date(
            Date.UTC(billingYear, billingMonth - 1, mandate.billingDay),
          ),
          retryCount: 1,
          failureReason,
        },
      });
    });
    if (
      !invoice ||
      mandate.tenant.sendWhatsappReminder === false ||
      !this.whatsappAdapter
    )
      return;

    let fallbackPaymentUrl: string | null = null;
    try {
      const link = await this.moneyLinks?.create(
        mandate.tenantId,
        mandate.organizationId,
      );
      fallbackPaymentUrl = link?.paymentLink ?? null;
    } catch (err) {
      this.logger.warn(
        `Unable to prepare fallback payment for mandate ${mandate.id}: ${(err as Error).message}`,
      );
    }
    const stillUnpaid = await this.prisma.rentInvoice.updateMany({
      where: {
        id: invoice.id,
        status: 'FAILED',
        retryCount: invoice.retryCount,
      },
      data: { fallbackPaymentUrl },
    });
    if (!stillUnpaid.count) return;

    // Send fallback alert via WhatsApp to tenant
    const rentRupees = Monetary.toRupees(mandate.rentAmount);
    const tenantPhone = mandate.tenant.whatsappNumber || mandate.tenant.mobile;
    const alertMessage =
      `⚠️ Rent Autopay Failed!\n\n` +
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
    } catch (err) {
      this.logger.warn(
        `Failed to send failure fallback WhatsApp: ${(err as Error).message}`,
      );
    }

    this.logger.warn(
      `Autopay payment failed for invoice ${invoice.id}; fallback link ${fallbackPaymentUrl ? 'prepared' : 'unavailable'}`,
    );
  }

  /**
   * Fallback for standard one-time checkout `payment.captured`
   */
  private async handleOneTimePaymentCaptured(event: RazorpayWebhookPayload) {
    const p = event.payload.payment?.entity;
    if (!p?.order_id || p.status !== 'captured') return;
    await this.paymentsService?.captureOnlinePayment({
      orderId: p.order_id,
      referenceId:
        event.event === 'order.paid' &&
        event.payload.order?.entity.id === p.order_id
          ? event.payload.order.entity.receipt
          : undefined,
      gatewayPaymentId: p.id,
      amount: p.amount,
      currency: p.currency,
      capturedAt: this.eventTime(event),
    });
  }
}
