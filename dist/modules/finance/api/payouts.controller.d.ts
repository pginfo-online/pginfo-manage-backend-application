import { PayoutsService } from '../application/payouts.service.js';
import { type OnboardOwnerDto, type QueryPayoutAccountsDto } from './dto/payout.dto.js';
export declare class PayoutsController {
    private readonly payoutsService;
    constructor(payoutsService: PayoutsService);
    onboardOwner(dto: OnboardOwnerDto, orgId: string, userId: string): Promise<{
        id: string;
        accountId: string;
        businessName: string;
        beneficiaryName: string;
        accountNumberMasked: string;
        ifscCode: string;
        status: import("@prisma/client").$Enums.PayoutAccountStatus;
        kycStatus: import("@prisma/client").$Enums.KycStatus;
        alreadyExisted: boolean;
    }>;
    refreshVerification(id: string, orgId: string): Promise<{
        verified: boolean;
    }>;
    listAccounts(query: QueryPayoutAccountsDto, orgId: string): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string | null;
        };
        property: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.PayoutAccountStatus;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        organizationId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        propertyId: string | null;
        phone: string;
        businessName: string;
        businessType: string;
        ifscCode: string;
        kycStatus: import("@prisma/client").$Enums.KycStatus;
        razorpayAccountId: string;
        accountNumberMasked: string;
        beneficiaryName: string;
    }>>;
    getActiveAccount(propertyId: string | undefined, orgId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.PayoutAccountStatus;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        organizationId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        propertyId: string | null;
        phone: string;
        businessName: string;
        businessType: string;
        ifscCode: string;
        kycStatus: import("@prisma/client").$Enums.KycStatus;
        razorpayAccountId: string;
        accountNumberMasked: string;
        beneficiaryName: string;
    }>;
}
