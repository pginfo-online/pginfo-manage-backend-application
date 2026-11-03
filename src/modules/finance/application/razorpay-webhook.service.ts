import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import { UnauthorizedError } from '../../../common/errors/index.js';
import { Monetary } from '../domain/monetary.js';
import {
  WHATSAPP_ADAPTER,
  EMAIL_ADAPTER,
  type WhatsAppAdapter,
  type EmailAdapter,
} from '../../communications/domain/notification.interfaces.js';
import type { EnvConfig } from '../../../config/index.js';
import { Prisma } from '@prisma/client';

export interface RazorpayWebhookPayload {
  entity: string;
  account_id?: string;
  event: string;
  id?: string; // event id
  contains?: string[];
  created_at?: number;
  payload: {
    subscription?: {
      entity: {
        id: string;
        plan_id?: string;
        customer_id?: string;
        status?: string;
        token_id?: string;
        paid_count?: number;
        total_count?: number;
        auth_attempts?: number;
        notes?: Record<string, string>;
      };
    };
    payment?: {
      entity: {
        id: string;
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
    @Optional()
    @Inject(EMAIL_ADAPTER)
    private readonly emailAdapter?: EmailAdapter,
  ) {}

  private getPlatformFeePaise(): number {
    return this.config.get('PLATFORM_FEE_PAISE') ?? 3000;
  }

  /**
   * Authoritative webhook ingestion pipeline with strict HMAC SHA-256 verification,
   * idempotency deduplication, and handling of Autopay lifecycle events.
   */
  async handleWebhook(rawBody: string, signature: string) {
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
      event = JSON.parse(rawBody) as RazorpayWebhookPayload;
    } catch {
      this.logger.error('Failed to parse webhook JSON body');
      return { status: 'bad_request', message: 'Invalid JSON payload' };
    }

    // 3. Deduplication & Idempotency Key
    // Use event.id if provided by Razorpay; otherwise hash rawBody to guarantee deterministic event identity
    const eventId =
      event.id ||
      `evt_${createHash('sha256').update(rawBody).digest('hex').slice(0, 32)}`;

    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
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
        case 'subscription.authenticated':
        case 'order.authorized':
          await this.handleSubscriptionAuthenticated(event);
          break;

        case 'subscription.charged':
          await this.handleSubscriptionCharged(event);
          break;

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

        case 'subscription.cancelled':
        case 'subscription.paused':
          await this.handleSubscriptionCancelledOrPaused(event);
          break;

        default:
          this.logger.log(`Unhandled Razorpay event type: ${event.event}`);
          break;
      }

      // 5. Record successful event in WebhookEvent table for idempotency
      await this.prisma.webhookEvent.create({
        data: {
          eventId,
          eventType: event.event,
          payload: event as unknown as Prisma.InputJsonValue,
          status: 'SUCCESS',
        },
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
        await this.prisma.webhookEvent.create({
          data: {
            eventId,
            eventType: event.event,
            payload: event as unknown as Prisma.InputJsonValue,
            status: 'FAILED',
            error: errorMsg,
          },
        });
      } catch {
        // Ignore duplicate key if concurrent
      }

      throw err;
    }
  }

  /**
   * Event 1: `subscription.authenticated` / `order.authorized`
   * - Marks tenant mandate status as ACTIVE.
   * - Stores customer_id, token_id, and bank reference.
   */
  private async handleSubscriptionAuthenticated(event: RazorpayWebhookPayload) {
    const sub = event.payload.subscription?.entity;
    const payment = event.payload.payment?.entity;

    const subscriptionId = sub?.id || payment?.subscription_id;
    if (!subscriptionId) {
      this.logger.warn(
        'No subscription_id found in subscription.authenticated event',
      );
      return;
    }

    const mandate = await this.prisma.tenantMandate.findUnique({
      where: { razorpaySubscriptionId: subscriptionId },
      include: { tenant: true, property: true },
    });

    if (!mandate) {
      this.logger.warn(
        `TenantMandate not found for subscription ${subscriptionId}`,
      );
      return;
    }

    const customerId = sub?.customer_id;
    const tokenId = sub?.token_id;
    const bankRef =
      payment?.acquirer_data?.bank_transaction_id ||
      payment?.acquirer_data?.upi_transaction_id ||
      payment?.bank ||
      payment?.vpa ||
      'UPI_AUTOPAY';

    await this.prisma.tenantMandate.update({
      where: { id: mandate.id },
      data: {
        status: 'ACTIVE',
        razorpayCustomerId: customerId,
        razorpayTokenId: tokenId,
        bankReference: bankRef,
        startedAt: new Date(),
        collectionMode: 'AUTOPAY',
      },
    });

    // Audit Log
    await this.prisma.auditLog.create({
      data: {
        organizationId: mandate.organizationId,
        action: 'rent.mandate_activated',
        entityType: 'TenantMandate',
        entityId: mandate.id,
        metadata: {
          subscriptionId,
          customerId,
          tokenId,
          bankRef,
        },
      },
    });

    this.logger.log(
      `Mandate ${mandate.id} activated for tenant ${mandate.tenant.firstName}`,
    );
  }

  /**
   * Event 2: `subscription.charged` / `payment.captured`
   * - Extracts payment_id, amount, and subscription_id.
   * - Updates/creates rent_invoices for current month: status = 'PAID', paid_at = NOW(), collection_type = 'AUTOPAY'.
   * - Executes Route transfer: (amount - platform_fee) to landlord's linked_account_id.
   * - Triggers receipt notification to tenant and landlord.
   */
  private async handleSubscriptionCharged(event: RazorpayWebhookPayload) {
    const payment = event.payload.payment?.entity;
    const sub = event.payload.subscription?.entity;

    const paymentId = payment?.id;
    const subscriptionId = payment?.subscription_id || sub?.id;
    const totalAmount = payment?.amount;

    if (!paymentId || !subscriptionId || !totalAmount) {
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
        landlordPayoutAccount: true,
      },
    });

    if (!mandate) {
      this.logger.warn(
        `TenantMandate not found for subscription ${subscriptionId}`,
      );
      return;
    }

    // Determine billing month & year (current month)
    const now = new Date();
    const billingMonth = now.getUTCMonth() + 1;
    const billingYear = now.getUTCFullYear();

    // Calculate Route split
    const platformFee = this.getPlatformFeePaise();
    const transferAmount = Math.max(0, totalAmount - platformFee);

    const invoiceNumber = `INV-${billingYear}${String(billingMonth).padStart(2, '0')}-${mandate.tenantId.slice(0, 8).toUpperCase()}`;

    // Execute database updates inside transaction
    const invoice = await this.prisma.$transaction(async (tx) => {
      // Upsert RentInvoice
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
          amount: totalAmount,
          platformFee,
          transferAmount,
          status: 'PAID',
          collectionType: 'AUTOPAY',
          dueDate: new Date(
            Date.UTC(billingYear, billingMonth - 1, mandate.billingDay),
          ),
          paidAt: now,
          razorpayPaymentId: paymentId,
        },
        update: {
          status: 'PAID',
          paidAt: now,
          collectionType: 'AUTOPAY',
          razorpayPaymentId: paymentId,
          amount: totalAmount,
          platformFee,
          transferAmount,
        },
      });

      // Increment mandate paid count
      await tx.tenantMandate.update({
        where: { id: mandate.id },
        data: {
          paidCount: { increment: 1 },
          status: 'ACTIVE',
        },
      });

      // Keep existing BillingRecord & Payment in sync
      const billingRecord = await tx.billingRecord.findFirst({
        where: {
          residentId: mandate.tenantId,
          type: 'RENT',
          billingMonth,
          billingYear,
        },
      });

      if (billingRecord) {
        await tx.billingRecord.update({
          where: { id: billingRecord.id },
          data: {
            status: 'PAID',
            paidAmount: totalAmount,
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
          billingRecordId: billingRecord?.id,
          amount: totalAmount,
          status: 'CONFIRMED',
          mode: 'RAZORPAY',
          collectionDate: now,
          razorpayPaymentId: paymentId,
          reference: `AutoPay Mandate ${mandate.razorpaySubscriptionId}`,
          notes: `Rent Autopay for ${billingMonth}/${billingYear}`,
        },
      });

      return inv;
    });

    // Execute transfer via Razorpay Route to landlord linked account
    let transferId: string | null = null;
    const linkedAccountId = mandate.landlordPayoutAccount?.razorpayAccountId;

    if (linkedAccountId && transferAmount > 0) {
      try {
        const transferResult = await this.razorpayAdapter.transferPayment(
          paymentId,
          {
            account: linkedAccountId,
            amount: transferAmount,
            currency: 'INR',
            notes: {
              invoiceId: invoice.id,
              rentPeriod: `${billingMonth}/${billingYear}`,
              tenantId: mandate.tenantId,
            },
          },
        );
        transferId = transferResult.transferId;

        await this.prisma.rentInvoice.update({
          where: { id: invoice.id },
          data: { razorpayTransferId: transferId },
        });

        this.logger.log(
          `Razorpay Route transfer ${transferId} executed: ₹${Monetary.toRupees(transferAmount)} routed to ${linkedAccountId}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to execute Route transfer for invoice ${invoice.id}: ${(err as Error).message}`,
        );
      }
    } else {
      this.logger.warn(
        `Skipped Route transfer: linkedAccountId is ${linkedAccountId ?? 'MISSING'}, transferAmount is ${transferAmount}`,
      );
    }

    // Trigger payment receipts
    await this.sendReceiptNotifications(
      mandate,
      totalAmount,
      platformFee,
      transferAmount,
      billingMonth,
      billingYear,
      paymentId,
    );
  }

  /**
   * Sends payment receipt notifications to tenant and landlord.
   */
  private async sendReceiptNotifications(
    mandate: any,
    totalAmount: number,
    platformFee: number,
    transferAmount: number,
    month: number,
    year: number,
    paymentId: string,
  ) {
    const rentRupees = Monetary.toRupees(totalAmount);
    const landlordRupees = Monetary.toRupees(transferAmount);
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

    // Landlord notification
    if (mandate.landlordPayoutAccount?.phone && this.whatsappAdapter) {
      const landlordMsg =
        `💰 Rent Received via Autopay!\n\n` +
        `Tenant ${mandate.tenant.firstName} paid rent for ${mandate.property.name} (${unitStr}).\n` +
        `Total Rent: ₹${rentRupees.toLocaleString('en-IN')}\n` +
        `Platform Fee: ₹${Monetary.toRupees(platformFee)}\n` +
        `Transferred to Your Bank: ₹${landlordRupees.toLocaleString('en-IN')}\n` +
        `Payment ID: ${paymentId}`;

      try {
        await this.whatsappAdapter.send({
          to: mandate.landlordPayoutAccount.phone,
          message: landlordMsg,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to send landlord WhatsApp notification: ${(err as Error).message}`,
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
      this.logger.warn('No subscription_id found in payment.failed event');
      return;
    }

    const mandate = await this.prisma.tenantMandate.findUnique({
      where: { razorpaySubscriptionId: subscriptionId },
      include: {
        tenant: true,
        property: true,
        unit: true,
        landlordPayoutAccount: true,
      },
    });

    if (!mandate) {
      this.logger.warn(
        `TenantMandate not found for failed subscription ${subscriptionId}`,
      );
      return;
    }

    const now = new Date();
    const billingMonth = now.getUTCMonth() + 1;
    const billingYear = now.getUTCFullYear();

    // Generate fallback instant payment link via Razorpay
    let fallbackPaymentUrl: string | null = null;
    try {
      const link = await this.razorpayAdapter.createPaymentLink({
        amountPaise: mandate.rentAmount,
        description: `Fallback Rent Payment - ${billingMonth}/${billingYear} - ${mandate.property.name}`,
        customer: {
          name: `${mandate.tenant.firstName} ${mandate.tenant.lastName ?? ''}`.trim(),
          contact: mandate.tenant.mobile,
          email: mandate.tenant.email ?? undefined,
        },
        notes: {
          mandateId: mandate.id,
          tenantId: mandate.tenantId,
          billingMonth: String(billingMonth),
          billingYear: String(billingYear),
        },
      });
      fallbackPaymentUrl = link.shortUrl;
    } catch (err) {
      this.logger.error(
        `Failed to generate fallback payment link: ${(err as Error).message}`,
      );
    }

    // Update / create RentInvoice with status = FAILED and increment retry count
    const invoice = await this.prisma.rentInvoice.upsert({
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
        invoiceNumber: `INV-${billingYear}${String(billingMonth).padStart(2, '0')}-${mandate.tenantId.slice(0, 8).toUpperCase()}`,
        billingMonth,
        billingYear,
        amount: mandate.rentAmount,
        platformFee: this.getPlatformFeePaise(),
        transferAmount: Math.max(
          0,
          mandate.rentAmount - this.getPlatformFeePaise(),
        ),
        status: 'FAILED',
        collectionType: 'FALLBACK_LINK',
        dueDate: new Date(
          Date.UTC(billingYear, billingMonth - 1, mandate.billingDay),
        ),
        retryCount: 1,
        failureReason,
        fallbackPaymentUrl,
      },
      update: {
        status: 'FAILED',
        retryCount: { increment: 1 },
        failureReason,
        fallbackPaymentUrl: fallbackPaymentUrl || undefined,
      },
    });

    // Increment mandate retry count
    await this.prisma.tenantMandate.update({
      where: { id: mandate.id },
      data: {
        retryCount: { increment: 1 },
        failureReason,
      },
    });

    // Send fallback alert via WhatsApp to tenant
    const rentRupees = Monetary.toRupees(mandate.rentAmount);
    const tenantPhone = mandate.tenant.whatsappNumber || mandate.tenant.mobile;
    const alertMessage =
      `⚠️ Rent Autopay Failed!\n\n` +
      `Hello ${mandate.tenant.firstName}, your scheduled rent payment of ₹${rentRupees.toLocaleString('en-IN')} ` +
      `for ${mandate.property.name} could not be processed automatically.\n` +
      `Reason: ${failureReason}\n\n` +
      (fallbackPaymentUrl
        ? `Please pay immediately via this secure one-time fallback link to avoid late fees:\n${fallbackPaymentUrl}\n\n`
        : `Please contact your property manager to complete the rent payment.\n\n`) +
      `Autopay will retry on the next scheduled cycle.`;

    if (this.whatsappAdapter) {
      try {
        await this.whatsappAdapter.send({
          to: tenantPhone,
          message: alertMessage,
          templateName: 'rent_autopay_failed_fallback',
        });
      } catch (err) {
        this.logger.warn(
          `Failed to send failure fallback WhatsApp: ${(err as Error).message}`,
        );
      }
    }

    this.logger.warn(
      `Autopay payment failed for tenant ${mandate.tenant.firstName} (Invoice: ${invoice.id}). Fallback link: ${fallbackPaymentUrl}`,
    );
  }

  /**
   * Event 4: `subscription.cancelled` / `subscription.paused`
   * - Marks the mandate as REVOKED or PAUSED.
   * - Notifies the landlord that the tenant disabled Autopay.
   * - Flags the unit / mandate as MANUAL_COLLECTION.
   */
  private async handleSubscriptionCancelledOrPaused(
    event: RazorpayWebhookPayload,
  ) {
    const sub = event.payload.subscription?.entity;
    const subscriptionId = sub?.id;

    if (!subscriptionId) {
      this.logger.warn('No subscription_id in cancellation event');
      return;
    }

    const mandate = await this.prisma.tenantMandate.findUnique({
      where: { razorpaySubscriptionId: subscriptionId },
      include: {
        tenant: true,
        property: true,
        unit: true,
        landlordPayoutAccount: true,
      },
    });

    if (!mandate) {
      this.logger.warn(
        `TenantMandate not found for subscription ${subscriptionId}`,
      );
      return;
    }

    const isCancelled = event.event === 'subscription.cancelled';
    const newStatus = isCancelled ? 'REVOKED' : 'PAUSED';

    await this.prisma.tenantMandate.update({
      where: { id: mandate.id },
      data: {
        status: newStatus,
        collectionMode: 'MANUAL_COLLECTION',
        cancelledAt: isCancelled ? new Date() : undefined,
      },
    });

    const unitStr = mandate.unit
      ? `Unit ${mandate.unit.roomNumber}`
      : 'their unit';
    const landlordPhone = mandate.landlordPayoutAccount?.phone;

    if (landlordPhone && this.whatsappAdapter) {
      const landlordAlert =
        `🚨 Autopay Disabled by Tenant!\n\n` +
        `Tenant ${mandate.tenant.firstName} (${mandate.tenant.mobile}) has ${isCancelled ? 'cancelled' : 'paused'} ` +
        `their Autopay mandate for ${mandate.property.name} (${unitStr}).\n\n` +
        `This unit has been automatically flagged as MANUAL_COLLECTION. Please follow up directly for future rent dues.`;

      try {
        await this.whatsappAdapter.send({
          to: landlordPhone,
          message: landlordAlert,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to notify landlord of mandate cancellation: ${(err as Error).message}`,
        );
      }
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId: mandate.organizationId,
        action: `rent.mandate_${isCancelled ? 'revoked' : 'paused'}`,
        entityType: 'TenantMandate',
        entityId: mandate.id,
        metadata: {
          event: event.event,
          collectionMode: 'MANUAL_COLLECTION',
        },
      },
    });

    this.logger.log(
      `Mandate ${mandate.id} marked as ${newStatus} (MANUAL_COLLECTION)`,
    );
  }

  /**
   * Fallback for standard one-time checkout `payment.captured`
   */
  private async handleOneTimePaymentCaptured(event: RazorpayWebhookPayload) {
    const p = event.payload.payment?.entity;
    if (!p) return;

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

        if (payment.billingRecordId) {
          await tx.billingRecord.update({
            where: { id: payment.billingRecordId },
            data: {
              status: 'PAID',
              paidAmount: payment.amount,
            },
          });
        }
      });
    }
  }
}
