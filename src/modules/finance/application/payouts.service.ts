import { Injectable, ConflictException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BankAccountCipher } from '../infrastructure/bank-account-cipher.js';
import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import { NotFoundError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import type {
  OnboardOwnerDto,
  QueryPayoutAccountsDto,
} from '../api/dto/payout.dto.js';

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayAdapter: RazorpayAdapter,
    private readonly bankCipher: BankAccountCipher,
  ) {}

  /**
   * Masks a bank account number for display & security compliance (e.g. ••••••••1234).
   */
  private maskAccountNumber(accountNumber: string): string {
    const clean = accountNumber.replace(/\s+/g, '');
    if (clean.length <= 4) return clean;
    const last4 = clean.slice(-4);
    return '•'.repeat(clean.length - 4) + last4;
  }

  async onboardOwner(dto: OnboardOwnerDto, orgId: string, userId: string) {
    if (
      dto.propertyId &&
      !(await this.prisma.property.findFirst({
        where: { id: dto.propertyId, organizationId: orgId },
        select: { id: true },
      }))
    )
      throw new NotFoundError('Property', dto.propertyId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM organizations WHERE id=${orgId}::uuid FOR UPDATE`;
      const accountNumberMasked = this.maskAccountNumber(dto.accountNumber);
      const candidates = await tx.landlordPayoutAccount.findMany({
        where: {
          organizationId: orgId,
          propertyId: dto.propertyId ?? null,
          ifscCode: dto.ifscCode,
          accountNumberMasked,
          accountNumberEncrypted: { not: null },
        },
      });
      const existing = candidates.find(
        (account) =>
          this.bankCipher.decrypt(
            account.accountNumberEncrypted!,
            account.id,
          ) === dto.accountNumber,
      );
      const id = existing?.id ?? randomUUID();
      const bank =
        existing ??
        (await tx.landlordPayoutAccount.create({
          data: {
            id,
            organizationId: orgId,
            userId,
            propertyId: dto.propertyId,
            razorpayAccountId: `manual_${id}`,
            businessName: dto.businessName,
            businessType: dto.businessType,
            accountNumberMasked,
            accountNumberEncrypted: this.bankCipher.encrypt(
              dto.accountNumber,
              id,
            ),
            ifscCode: dto.ifscCode,
            beneficiaryName: dto.ownerName,
            email: dto.email,
            phone: dto.phone,
            status: 'PENDING',
            kycStatus: 'SUBMITTED',
          },
        }));
      if (!existing)
        await tx.auditLog.create({
          data: {
            organizationId: orgId,
            userId,
            action: 'payouts.bank_submitted',
            entityType: 'LandlordPayoutAccount',
            entityId: id,
          },
        });
      return {
        id,
        businessName: bank.businessName,
        beneficiaryName: bank.beneficiaryName,
        accountNumberMasked: bank.accountNumberMasked,
        ifscCode: bank.ifscCode,
        status: bank.status,
        kycStatus: bank.kycStatus,
        alreadyExisted: Boolean(existing),
      };
    });
  }

  async refreshVerification(id: string, orgId: string) {
    const account = await this.prisma.landlordPayoutAccount.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!account) throw new NotFoundError('Bank account', id);
    if (account.razorpayAccountId.startsWith('manual_'))
      return {
        verified:
          account.status === 'ACTIVE' && account.kycStatus === 'VERIFIED',
      };
    const metadata = account.metadata;
    const productId =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? metadata.routeProductId
        : null;
    if (typeof productId !== 'string')
      throw new ConflictException(
        'This legacy bank entry needs onboarding through Razorpay Route',
      );
    const verified = await this.razorpayAdapter.fetchRouteBankVerification(
      account.razorpayAccountId,
      productId,
    );
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
      throw new ConflictException(
        'Bank account changed. Reload before checking again.',
      );
    return { verified };
  }

  /**
   * Retrieves the active landlord payout account for an organization (or specific property).
   */
  async getActivePayoutAccount(orgId: string, propertyId?: string) {
    const account = await this.prisma.landlordPayoutAccount.findFirst({
      omit: { accountNumberEncrypted: true },
      where: {
        organizationId: orgId,
        status: 'ACTIVE',
        kycStatus: 'VERIFIED',
        accountNumberEncrypted: { not: null },
        ...(propertyId ? { OR: [{ propertyId }, { propertyId: null }] } : {}),
      },
      orderBy: [
        ...(propertyId
          ? [{ propertyId: { sort: 'desc' as const, nulls: 'last' as const } }]
          : []),
        { createdAt: 'desc' as const },
        { id: 'desc' as const },
      ],
    });

    if (!account) {
      throw new NotFoundError(
        'LandlordPayoutAccount',
        `organization ${orgId}${propertyId ? ` / property ${propertyId}` : ''}`,
      );
    }

    return account;
  }

  /**
   * Queries payout accounts with pagination and filtering.
   */
  async queryPayoutAccounts(query: QueryPayoutAccountsDto, orgId: string) {
    const where = {
      organizationId: orgId,
      ...(query.search
        ? {
            OR: [
              {
                beneficiaryName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                businessName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                ifscCode: {
                  contains: query.search,
                  mode: 'insensitive' as const,
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
        omit: { accountNumberEncrypted: true },
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
}
