import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import { PayoutsService } from './payouts.service.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { Monetary } from '../domain/monetary.js';
import {
  WHATSAPP_ADAPTER,
  type WhatsAppAdapter,
} from '../../communications/domain/notification.interfaces.js';
import type {
  CreateMandateDto,
  QueryMandatesDto,
} from '../api/dto/mandate.dto.js';

@Injectable()
export class MandatesService {
  private readonly logger = new Logger(MandatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayAdapter: RazorpayAdapter,
    private readonly payoutsService: PayoutsService,
    @Optional()
    @Inject(WHATSAPP_ADAPTER)
    private readonly whatsappAdapter?: WhatsAppAdapter,
  ) {}

  /**
   * Generates a monthly recurring mandate (UPI AutoPay / e-Mandate) via Razorpay Subscriptions.
   */
  async createMandate(dto: CreateMandateDto, orgId: string, userId: string) {
    // 1. Validate tenant (Resident)
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
      throw new ValidationError(
        `Cannot create mandate for tenant in status: ${tenant.status}`,
      );
    }

    // Determine unit
    const unitId = dto.unitId ?? tenant.roomId;
    let unitNumber = 'N/A';
    if (unitId) {
      const unit = await this.prisma.room.findFirst({
        where: { id: unitId, organizationId: orgId },
      });
      if (unit) {
        unitNumber = unit.roomNumber;
      }
    }

    // 2. Check if an active mandate already exists for this tenant & property
    const existingActiveMandate = await this.prisma.tenantMandate.findFirst({
      where: {
        tenantId: tenant.id,
        propertyId: tenant.propertyId,
        status: { in: ['ACTIVE', 'CREATED', 'AUTHENTICATED'] },
      },
    });

    if (existingActiveMandate) {
      throw new ConflictError(
        `An active or pending mandate already exists for this tenant (ID: ${existingActiveMandate.id}, status: ${existingActiveMandate.status})`,
      );
    }

    // 3. Find active Landlord Payout Account
    const payoutAccount = await this.payoutsService
      .getActivePayoutAccount(orgId, tenant.propertyId)
      .catch(() => null);

    // 4. Create recurring plan on Razorpay
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

    // 5. Create Subscription with Razorpay (UPI AutoPay & e-Mandate)
    const subscription = await this.razorpayAdapter.createSubscription({
      planId: plan.planId,
      totalCount: dto.tenureMonths,
      customerNotify: 1,
      notes: {
        tenantId: tenant.id,
        propertyId: tenant.propertyId,
        unitId: unitId ?? '',
        organizationId: orgId,
        billingDay: String(dto.billingDay),
      },
    });

    // 6. Save in tenant_mandates table
    const mandate = await this.prisma.tenantMandate.create({
      data: {
        organizationId: orgId,
        tenantId: tenant.id,
        propertyId: tenant.propertyId,
        unitId,
        bedId: tenant.bedId,
        landlordPayoutAccountId: payoutAccount?.id,
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

    // 7. Construct WhatsApp Notification Payload
    const rentRupees = Monetary.toRupees(dto.rentAmount);
    const tenantPhone = tenant.whatsappNumber || tenant.mobile;
    const whatsappMessage =
      `Hello ${tenant.firstName}, your automated hands-free rent collection mandate ` +
      `for ${tenant.property.name} (Unit ${unitNumber}) has been generated.\n\n` +
      `Rent Amount: ₹${rentRupees.toLocaleString('en-IN')}/month\n` +
      `Billing Day: ${dto.billingDay}th of every month\n` +
      `Tenure: ${dto.tenureMonths} months\n\n` +
      `Please authorize your UPI AutoPay or e-Mandate here:\n` +
      `${subscription.shortUrl}\n\n` +
      `Once approved, your monthly rent will be deducted automatically with zero manual follow-ups!`;

    const whatsappPayload = {
      to: tenantPhone,
      message: whatsappMessage,
      template: 'rent_autopay_mandate_invite',
      templateParams: {
        tenant_name: tenant.firstName,
        property_name: tenant.property.name,
        unit_number: unitNumber,
        rent_amount: `₹${rentRupees.toLocaleString('en-IN')}`,
        billing_day: `${dto.billingDay}th`,
        auth_url: subscription.shortUrl,
      },
      authorizationUrl: subscription.shortUrl,
    };

    // 8. Trigger WhatsApp notification
    let notificationSent = false;
    let notificationError: string | null = null;

    if (dto.sendWhatsAppNotification && this.whatsappAdapter) {
      try {
        const result = await this.whatsappAdapter.send({
          to: tenantPhone,
          message: whatsappMessage,
          templateName: 'rent_autopay_mandate_invite',
          templateParams: whatsappPayload.templateParams,
        });
        notificationSent = result.success;
        if (!result.success && result.error) {
          notificationError = result.error;
        }
      } catch (err) {
        notificationError = (err as Error).message;
        this.logger.warn(
          `Failed to send WhatsApp mandate invite: ${(err as Error).message}`,
        );
      }
    }

    // 9. Audit Log
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
      whatsappPayload,
      notificationSent,
      notificationError,
    };
  }

  /**
   * Retrieves a mandate by ID.
   */
  async getMandate(id: string, orgId: string) {
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

  /**
   * Lists mandates with filtering and pagination.
   */
  async queryMandates(query: QueryMandatesDto, orgId: string) {
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
          tenant: { select: { id: true, firstName: true, lastName: true, mobile: true } },
          property: { select: { id: true, name: true } },
          unit: { select: { id: true, roomNumber: true } },
        },
      }),
      this.prisma.tenantMandate.count({ where }),
    ]);

    return buildOffsetResponse(mandates, total, query.limit, offset);
  }

  /**
   * Cancels a mandate in Razorpay and marks status as REVOKED.
   */
  async cancelMandate(id: string, orgId: string, userId: string) {
    const mandate = await this.prisma.tenantMandate.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!mandate) {
      throw new NotFoundError('TenantMandate', id);
    }

    // Cancel in Razorpay
    try {
      await this.razorpayAdapter.cancelSubscription(
        mandate.razorpaySubscriptionId,
        false,
      );
    } catch (err) {
      this.logger.warn(
        `Razorpay subscription cancel returned error: ${(err as Error).message}`,
      );
    }

    // Update database
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
}
