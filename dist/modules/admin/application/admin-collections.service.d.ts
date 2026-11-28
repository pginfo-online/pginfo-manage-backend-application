import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../../finance/infrastructure/razorpay.adapter.js';
import { BankAccountCipher } from '../../finance/infrastructure/bank-account-cipher.js';
import { AdminAuditService, type AdminRequestMetadata } from './admin-audit.service.js';
import type { PlatformAdminContext } from '../domain/admin-permissions.js';
import type { AdminPaymentsQueryDto, PrepareManualPayoutDto, RecordManualPayoutDto } from '../api/dto/admin.dto.js';
export declare class AdminCollectionsService {
    private readonly prisma;
    private readonly gateway;
    private readonly bankCipher;
    private readonly audit;
    constructor(prisma: PrismaService, gateway: RazorpayAdapter, bankCipher: BankAccountCipher, audit: AdminAuditService);
    list(query: AdminPaymentsQueryDto, actor: PlatformAdminContext): Promise<{
        totals: {
            [k: string]: number;
        };
        data: {
            manualPayout: {
                canComplete: boolean;
                createdAt: Date;
                amount: number;
                bankReference: string | null;
                recordedBy: string | null;
                paymentId: string;
                ifscCode: string;
                beneficiaryName: string;
                payoutAccountId: string;
                paidOn: Date | null;
                preparedBy: string;
                accountMasked: string;
            } | null;
            property: {
                id: string;
                name: string;
            };
            platformFee: number;
            ownerPayable: number;
            invoice: {
                organizationId: string;
                razorpayPaymentId: string | null;
                invoiceNumber: string;
                platformFee: number;
                collectionType: import("@prisma/client").$Enums.RentCollectionType;
                razorpayTransferId: string | null;
            } | undefined;
            resident: {
                property: {
                    id: string;
                    name: string;
                };
                firstName: string;
                lastName: string | null;
            };
            billingRecord: {
                propertyId: string;
            } | null;
            id: string;
            status: import("@prisma/client").$Enums.PaymentStatus;
            organizationId: string;
            notes: string | null;
            amount: number;
            collectionDate: Date;
            reference: string | null;
            paymentLinkId: string | null;
            gatewayQrId: string | null;
            capturedAt: Date | null;
            capturePropertyId: string | null;
            capturePlatformFee: number | null;
            gatewayRefundedAmount: number;
            razorpayOrderId: string | null;
            razorpayPaymentId: string | null;
            settlement: {
                createdAt: Date;
                bankReference: string;
                recordedBy: string;
                paymentId: string;
                providerId: string;
                netAmount: number;
                routeClear: boolean;
                settledOn: Date;
            } | null;
        }[];
        meta: {
            total: number;
            limit: number;
            hasMore: boolean;
            nextCursor?: string;
            page?: number;
            totalPages?: number;
        };
    }>;
    reconcile(id: string, date: string, actor: PlatformAdminContext, request: AdminRequestMetadata): Promise<{
        createdAt: Date;
        bankReference: string;
        recordedBy: string;
        paymentId: string;
        providerId: string;
        netAmount: number;
        routeClear: boolean;
        settledOn: Date;
    }>;
    preparePayout(id: string, input: PrepareManualPayoutDto, actor: PlatformAdminContext, request: AdminRequestMetadata): Promise<{
        createdAt: Date;
        amount: number;
        bankReference: string | null;
        recordedBy: string | null;
        paymentId: string;
        ifscCode: string;
        beneficiaryName: string;
        payoutAccountId: string;
        paidOn: Date | null;
        preparedBy: string;
        accountMasked: string;
    }>;
    recordPayout(id: string, input: RecordManualPayoutDto, actor: PlatformAdminContext, request: AdminRequestMetadata): Promise<{
        createdAt: Date;
        amount: number;
        bankReference: string | null;
        recordedBy: string | null;
        paymentId: string;
        ifscCode: string;
        beneficiaryName: string;
        payoutAccountId: string;
        paidOn: Date | null;
        preparedBy: string;
        accountMasked: string;
    }>;
    releasePayout(id: string, actor: PlatformAdminContext, request: AdminRequestMetadata): Promise<{
        released: boolean;
    }>;
    eligibleAccounts(id: string): Promise<{
        property: {
            name: string;
        } | null;
        id: string;
        ifscCode: string;
        beneficiaryName: string;
        accountNumberMasked: string;
    }[]>;
    reveal(id: string, actor: PlatformAdminContext, request: AdminRequestMetadata): Promise<{
        accountNumber: string;
        beneficiaryName: string;
        ifscCode: string;
    }>;
}
