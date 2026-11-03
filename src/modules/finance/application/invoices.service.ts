import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import type { QueryInvoicesDto } from '../api/dto/invoice.dto.js';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getInvoice(id: string, orgId: string) {
    const invoice = await this.prisma.rentInvoice.findFirst({
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
        mandate: {
          select: {
            id: true,
            razorpaySubscriptionId: true,
            mandateChannel: true,
            status: true,
            landlordPayoutAccount: {
              select: {
                razorpayAccountId: true,
                businessName: true,
                beneficiaryName: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError('RentInvoice', id);
    }

    return invoice;
  }

  async queryInvoices(query: QueryInvoicesDto, orgId: string) {
    const where = {
      organizationId: orgId,
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.mandateId ? { mandateId: query.mandateId } : {}),
      ...(query.billingMonth ? { billingMonth: query.billingMonth } : {}),
      ...(query.billingYear ? { billingYear: query.billingYear } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.collectionType ? { collectionType: query.collectionType } : {}),
    };

    const offset = (query.page - 1) * query.limit;
    const [invoices, total] = await Promise.all([
      this.prisma.rentInvoice.findMany({
        where,
        skip: offset,
        take: query.limit,
        orderBy: [
          { billingYear: 'desc' },
          { billingMonth: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          tenant: {
            select: { id: true, firstName: true, lastName: true, mobile: true },
          },
          property: { select: { id: true, name: true } },
          unit: { select: { id: true, roomNumber: true } },
        },
      }),
      this.prisma.rentInvoice.count({ where }),
    ]);

    return buildOffsetResponse(invoices, total, query.limit, offset);
  }
}
