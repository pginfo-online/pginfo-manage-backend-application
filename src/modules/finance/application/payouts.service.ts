import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayAdapter: RazorpayAdapter,
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

  /**
   * Onboards a property owner / landlord with Razorpay Route linked account.
   * Creates a sub-merchant account on Razorpay and persists the record.
   */
  async onboardOwner(dto: OnboardOwnerDto, orgId: string, userId: string) {
    // 1. Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!organization) {
      throw new NotFoundError('Organization', orgId);
    }

    // 2. If propertyId is specified, verify property belongs to this org
    if (dto.propertyId) {
      const property = await this.prisma.property.findFirst({
        where: { id: dto.propertyId, organizationId: orgId },
      });
      if (!property) {
        throw new NotFoundError('Property', dto.propertyId);
      }
    }

    // 3. Check for existing active account for this owner & org
    const maskedAcc = this.maskAccountNumber(dto.accountNumber);
    const existing = await this.prisma.landlordPayoutAccount.findFirst({
      where: {
        organizationId: orgId,
        userId,
        accountNumberMasked: maskedAcc,
        ifscCode: dto.ifscCode,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
    });

    if (existing) {
      this.logger.log(
        `Returning existing active linked payout account for user ${userId}: ${existing.razorpayAccountId}`,
      );
      return {
        id: existing.id,
        accountId: existing.razorpayAccountId,
        businessName: existing.businessName,
        beneficiaryName: existing.beneficiaryName,
        accountNumberMasked: existing.accountNumberMasked,
        ifscCode: existing.ifscCode,
        status: existing.status,
        kycStatus: existing.kycStatus,
        alreadyExisted: true,
      };
    }

    // 4. Create linked account with Razorpay Route
    const routeAccount = await this.razorpayAdapter.createLinkedAccount({
      email: dto.email,
      phone: dto.phone,
      legalBusinessName: dto.businessName,
      businessType: dto.businessType,
      contactName: dto.ownerName,
      accountNumber: dto.accountNumber,
      ifscCode: dto.ifscCode,
      beneficiaryName: dto.ownerName,
      notes: {
        organizationId: orgId,
        userId,
        propertyId: dto.propertyId || '',
      },
    });

    // 5. Persist the payout account record in database
    const payoutAccount = await this.prisma.landlordPayoutAccount.create({
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
        status: 'ACTIVE',
        kycStatus: 'VERIFIED',
        metadata: {
          rawStatus: routeAccount.status,
          onboardedAt: new Date().toISOString(),
          ...(dto.panNumber
            ? { panMasked: `*****${dto.panNumber.slice(-4)}` }
            : {}),
        },
      },
    });

    // 6. Audit Log
    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'payouts.onboard_owner',
        entityType: 'LandlordPayoutAccount',
        entityId: payoutAccount.id,
        metadata: {
          accountId: routeAccount.accountId,
          businessName: dto.businessName,
          propertyId: dto.propertyId,
        },
      },
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
      alreadyExisted: false,
    };
  }

  /**
   * Retrieves the active landlord payout account for an organization (or specific property).
   */
  async getActivePayoutAccount(orgId: string, propertyId?: string) {
    const account = await this.prisma.landlordPayoutAccount.findFirst({
      where: {
        organizationId: orgId,
        status: 'ACTIVE',
        ...(propertyId ? { OR: [{ propertyId }, { propertyId: null }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
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
        orderBy: { createdAt: 'desc' },
        include: {
          property: { select: { id: true, name: true } },
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.landlordPayoutAccount.count({ where }),
    ]);

    return buildOffsetResponse(accounts, total, query.limit, offset);
  }
}
