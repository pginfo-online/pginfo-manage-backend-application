var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import { NotFoundError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
let PayoutsService = class PayoutsService {
    prisma;
    razorpayAdapter;
    constructor(prisma, razorpayAdapter) {
        this.prisma = prisma;
        this.razorpayAdapter = razorpayAdapter;
    }
    maskAccountNumber(accountNumber) {
        const clean = accountNumber.replace(/\s+/g, '');
        if (clean.length <= 4)
            return clean;
        const last4 = clean.slice(-4);
        return '•'.repeat(clean.length - 4) + last4;
    }
    async onboardOwner(dto, orgId, userId) {
        const organization = await this.prisma.organization.findUnique({
            where: { id: orgId },
        });
        if (!organization) {
            throw new NotFoundError('Organization', orgId);
        }
        if (dto.propertyId) {
            const property = await this.prisma.property.findFirst({
                where: { id: dto.propertyId, organizationId: orgId },
            });
            if (!property) {
                throw new NotFoundError('Property', dto.propertyId);
            }
        }
        const maskedAcc = this.maskAccountNumber(dto.accountNumber);
        const routeAccount = await this.razorpayAdapter.createLinkedAccount({
            email: dto.email,
            phone: dto.phone,
            legalBusinessName: dto.businessType === 'individual' ? dto.ownerName : dto.businessName,
            businessType: dto.businessType,
            panNumber: dto.panNumber,
            accountNumber: dto.accountNumber,
            ifscCode: dto.ifscCode,
            beneficiaryName: dto.ownerName,
            notes: {
                organizationId: orgId,
                propertyId: dto.propertyId || '',
            },
        });
        const { payoutAccount, alreadyExisted } = await this.prisma.$transaction(async (tx) => {
            const inserted = await tx.landlordPayoutAccount.createMany({
                skipDuplicates: true,
                data: {
                    organizationId: orgId,
                    userId,
                    propertyId: dto.propertyId,
                    razorpayAccountId: routeAccount.accountId,
                    businessName: dto.businessName,
                    businessType: dto.businessType,
                    accountNumberMasked: maskedAcc,
                    ifscCode: dto.ifscCode,
                    beneficiaryName: dto.ownerName,
                    email: dto.email,
                    phone: dto.phone,
                    status: routeAccount.verified ? 'ACTIVE' : 'PENDING',
                    kycStatus: routeAccount.verified ? 'VERIFIED' : 'SUBMITTED',
                    metadata: { routeProductId: routeAccount.productId ?? null },
                },
            });
            const payoutAccount = await tx.landlordPayoutAccount.findFirst({
                where: {
                    organizationId: orgId,
                    razorpayAccountId: routeAccount.accountId,
                },
            });
            if (!payoutAccount)
                throw new ConflictException('Razorpay returned an account already registered elsewhere');
            if (inserted.count)
                await tx.auditLog.create({
                    data: {
                        organizationId: orgId,
                        userId,
                        action: 'payouts.onboard_owner',
                        entityType: 'LandlordPayoutAccount',
                        entityId: payoutAccount.id,
                    },
                });
            return { payoutAccount, alreadyExisted: inserted.count === 0 };
        });
        return {
            id: payoutAccount.id,
            accountId: payoutAccount.razorpayAccountId,
            businessName: payoutAccount.businessName,
            beneficiaryName: payoutAccount.beneficiaryName,
            accountNumberMasked: payoutAccount.accountNumberMasked,
            ifscCode: payoutAccount.ifscCode,
            status: payoutAccount.status,
            kycStatus: payoutAccount.kycStatus,
            alreadyExisted,
        };
    }
    async refreshVerification(id, orgId) {
        const account = await this.prisma.landlordPayoutAccount.findFirst({
            where: { id, organizationId: orgId },
        });
        if (!account)
            throw new NotFoundError('Bank account', id);
        const metadata = account.metadata;
        const productId = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
            ? metadata.routeProductId
            : null;
        if (typeof productId !== 'string')
            throw new ConflictException('This legacy bank entry needs onboarding through Razorpay Route');
        const verified = await this.razorpayAdapter.fetchRouteBankVerification(account.razorpayAccountId, productId);
        const updated = await this.prisma.landlordPayoutAccount.updateMany({
            where: {
                id,
                organizationId: orgId,
                updatedAt: account.updatedAt,
                status: { in: ['PENDING', 'ACTIVE'] },
            },
            data: {
                status: verified ? 'ACTIVE' : 'PENDING',
                kycStatus: verified ? 'VERIFIED' : 'SUBMITTED',
            },
        });
        if (!updated.count)
            throw new ConflictException('Bank account changed. Reload before checking again.');
        return { verified };
    }
    async getActivePayoutAccount(orgId, propertyId) {
        const account = await this.prisma.landlordPayoutAccount.findFirst({
            where: {
                organizationId: orgId,
                status: 'ACTIVE',
                kycStatus: 'VERIFIED',
                razorpayAccountId: { not: { startsWith: 'acc_sim_' } },
                AND: [
                    {
                        metadata: {
                            path: ['routeProductId'],
                            string_starts_with: 'acc_prd_',
                        },
                    },
                ],
                ...(propertyId ? { OR: [{ propertyId }, { propertyId: null }] } : {}),
            },
            orderBy: [
                ...(propertyId
                    ? [{ propertyId: { sort: 'desc', nulls: 'last' } }]
                    : []),
                { createdAt: 'desc' },
                { id: 'desc' },
            ],
        });
        if (!account) {
            throw new NotFoundError('LandlordPayoutAccount', `organization ${orgId}${propertyId ? ` / property ${propertyId}` : ''}`);
        }
        return account;
    }
    async queryPayoutAccounts(query, orgId) {
        const where = {
            organizationId: orgId,
            ...(query.search
                ? {
                    OR: [
                        {
                            beneficiaryName: {
                                contains: query.search,
                                mode: 'insensitive',
                            },
                        },
                        {
                            businessName: {
                                contains: query.search,
                                mode: 'insensitive',
                            },
                        },
                        {
                            ifscCode: {
                                contains: query.search,
                                mode: 'insensitive',
                            },
                        },
                        { accountNumberMasked: { contains: query.search } },
                    ],
                }
                : {}),
            ...(query.propertyId ? { propertyId: query.propertyId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.kycStatus ? { kycStatus: query.kycStatus } : {}),
        };
        const offset = (query.page - 1) * query.limit;
        const [accounts, total] = await Promise.all([
            this.prisma.landlordPayoutAccount.findMany({
                where,
                skip: offset,
                take: query.limit,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                include: {
                    property: { select: { id: true, name: true } },
                    user: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                },
            }),
            this.prisma.landlordPayoutAccount.count({ where }),
        ]);
        return buildOffsetResponse(accounts, total, query.page, query.limit);
    }
};
PayoutsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        RazorpayAdapter])
], PayoutsService);
export { PayoutsService };
//# sourceMappingURL=payouts.service.js.map