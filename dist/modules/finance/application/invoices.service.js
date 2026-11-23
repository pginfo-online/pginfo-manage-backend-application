var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
let InvoicesService = class InvoicesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getInvoice(id, orgId) {
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
    async queryInvoices(query, orgId) {
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
};
InvoicesService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], InvoicesService);
export { InvoicesService };
//# sourceMappingURL=invoices.service.js.map