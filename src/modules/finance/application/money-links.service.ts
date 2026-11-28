import {
  Injectable,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import { MoneyService } from './money.service.js';

@Injectable()
export class MoneyLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RazorpayAdapter,
    private readonly money: MoneyService,
  ) {}
  create(
    residentId: string,
    org: string,
    user?: string,
  ): Promise<{ paymentLink: string; amount: number; expiresAt: Date | null }>;
  create(
    residentId: string,
    org: string,
    user: string,
    kind: 'qr',
  ): Promise<{ qrImageUrl: string; amount: number; expiresAt: Date | null }>;
  async create(
    residentId: string,
    org: string,
    user?: string,
    kind: 'link' | 'qr' = 'link',
  ) {
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
      throw new BadRequestException(
        'Online collection requires outstanding dues for a single property',
      );
    const propertyId = properties[0]!;
    if (!this.gateway.canCreateMoneyLinks())
      throw new ServiceUnavailableException(
        'Configure Razorpay API credentials and webhook secret to create payment links',
      );
    const payment = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM residents WHERE id=${residentId}::uuid AND organization_id=${org}::uuid FOR UPDATE`;
      const balance = await tx.billingRecord.aggregate({
        where: {
          residentId,
          organizationId: org,
          propertyId,
          status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        _sum: { amount: true, paidAmount: true },
      });
      if (
        (balance._sum.amount ?? 0) - (balance._sum.paidAmount ?? 0) !==
        context.totalDues
      )
        throw new ConflictException(
          'Dues changed; reload the balance before creating a payment link',
        );
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
          throw new ConflictException(
            'Payment link is being prepared; retry shortly',
          );
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
    const result = (url: string, expiresAt: Date | null) => ({
      ...(kind === 'qr' ? { qrImageUrl: url } : { paymentLink: url }),
      amount: payment.amount,
      expiresAt,
    });
    if (payment.paymentLinkUrl)
      return result(payment.paymentLinkUrl, payment.paymentLinkExpiresAt);
    if (kind === 'qr') {
      const qr = await this.gateway.createCollectionQr(
        payment.amount,
        Math.floor(payment.paymentLinkExpiresAt!.getTime() / 1000),
        payment.id,
      );
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
    // Keep the durable pending intent on a network error: the signed paid webhook
    // can still reconcile a provider link whose creation response was lost.
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
      expireBy: Math.floor(payment.paymentLinkExpiresAt!.getTime() / 1000),
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
}
