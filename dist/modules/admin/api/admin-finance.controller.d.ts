import type { Request } from 'express';
import type { PlatformAdminContext } from '../domain/admin-permissions.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import { PaymentsService } from '../../finance/application/payments.service.js';
import { AdminCollectionsService } from '../application/admin-collections.service.js';
import { AdminCommandService } from '../application/admin-command.service.js';
import { type PrepareManualPayoutDto, type RecordManualPayoutDto, type AdminPaymentsQueryDto, type AdminPayoutsQueryDto, type AdminPendingQueryDto, type ReviewPayoutDto } from './dto/admin.dto.js';
export declare class AdminFinanceController {
    private readonly queryService;
    private readonly commands;
    private readonly collections;
    private readonly paymentsService;
    constructor(queryService: AdminQueryService, commands: AdminCommandService, collections: AdminCollectionsService, paymentsService: PaymentsService);
    payments(query: AdminPaymentsQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        resident: {
            property: {
                id: string;
                name: string;
            };
            id: string;
            mobile: string;
            firstName: string;
            lastName: string | null;
        };
        billingRecord: {
            id: string;
            type: import("@prisma/client").$Enums.BillingType;
            status: import("@prisma/client").$Enums.BillingStatus;
            amount: number;
            paidAmount: number;
        } | null;
        id: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        mode: import("@prisma/client").$Enums.PaymentMode;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        version: number;
        amount: number;
        collectionDate: Date;
        reference: string | null;
        proofUrl: string | null;
        razorpayOrderId: string | null;
        razorpayPaymentId: string | null;
        recordedBy: string | null;
    }>>;
    payment(id: string): Promise<{
        resident: {
            property: {
                id: string;
                name: string;
            };
            room: {
                id: string;
                roomNumber: string;
            } | null;
            bed: {
                id: string;
                bedNumber: string;
            } | null;
            id: string;
            mobile: string;
            firstName: string;
            lastName: string | null;
        };
        billingRecord: {
            id: string;
            type: import("@prisma/client").$Enums.BillingType;
            status: import("@prisma/client").$Enums.BillingStatus;
            createdAt: Date;
            updatedAt: Date;
            organizationId: string;
            description: string | null;
            propertyId: string;
            version: number;
            residentId: string;
            attachmentUrls: string[];
            amount: number;
            paidAmount: number;
            lateFeeAmount: number;
            discountAmount: number;
            billingMonth: number | null;
            billingYear: number | null;
            dueDate: Date;
            periodStart: Date | null;
            periodEnd: Date | null;
            idempotencyKey: string | null;
        } | null;
        id: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        mode: import("@prisma/client").$Enums.PaymentMode;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        notes: string | null;
        version: number;
        amount: number;
        idempotencyKey: string | null;
        collectionDate: Date;
        reference: string | null;
        proofUrl: string | null;
        razorpayOrderId: string | null;
        razorpayPaymentId: string | null;
        recordedBy: string | null;
    }>;
    ledger(query: AdminPaymentsQueryDto): Promise<{
        totals: {
            grossPaise: number;
            platformFeesPaise: number;
            ownerTransfersPaise: number;
        };
        data: {
            property: {
                id: string;
                name: string;
            };
            id: string;
            status: import("@prisma/client").$Enums.RentInvoiceStatus;
            createdAt: Date;
            organizationId: string;
            amount: number;
            billingMonth: number;
            billingYear: number;
            dueDate: Date;
            failureReason: string | null;
            tenant: {
                id: string;
                firstName: string;
                lastName: string | null;
            };
            razorpayPaymentId: string | null;
            invoiceNumber: string;
            platformFee: number;
            transferAmount: number;
            collectionType: import("@prisma/client").$Enums.RentCollectionType;
            paidAt: Date | null;
            razorpayTransferId: string | null;
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
    pending(query: AdminPendingQueryDto): Promise<{
        summary: {
            pendingPayments: number;
            pendingPaymentAmountPaise: number;
            pendingInvoices: number;
            pendingPayoutAccounts: number;
            truncated: boolean;
        };
        payments: {
            resident: {
                id: string;
                firstName: string;
                lastName: string | null;
            };
            id: string;
            status: import("@prisma/client").$Enums.PaymentStatus;
            mode: import("@prisma/client").$Enums.PaymentMode;
            createdAt: Date;
            organizationId: string;
            amount: number;
            reference: string | null;
        }[];
        invoices: {
            id: string;
            status: import("@prisma/client").$Enums.RentInvoiceStatus;
            createdAt: Date;
            organizationId: string;
            amount: number;
            dueDate: Date;
            failureReason: string | null;
            retryCount: number;
            invoiceNumber: string;
            platformFee: number;
            transferAmount: number;
        }[];
        payoutAccounts: {
            id: string;
            status: import("@prisma/client").$Enums.PayoutAccountStatus;
            createdAt: Date;
            organizationId: string;
            kycStatus: import("@prisma/client").$Enums.KycStatus;
            businessName: string;
            accountNumberMasked: string;
        }[];
    }>;
    onlineCollections(query: AdminPaymentsQueryDto, actor: PlatformAdminContext): Promise<{
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
    collectionPayoutAccounts(id: string): Promise<{
        property: {
            name: string;
        } | null;
        id: string;
        ifscCode: string;
        beneficiaryName: string;
        accountNumberMasked: string;
    }[]>;
    reconcileCollection(id: string, dto: {
        settledOn: string;
    }, actor: PlatformAdminContext, request: Request): Promise<{
        createdAt: Date;
        bankReference: string;
        recordedBy: string;
        paymentId: string;
        providerId: string;
        netAmount: number;
        routeClear: boolean;
        settledOn: Date;
    }>;
    applyToDues(id: string, dto: {
        reason: string;
    }, actor: PlatformAdminContext): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
    }>;
    prepareManualPayout(id: string, dto: PrepareManualPayoutDto, actor: PlatformAdminContext, request: Request): Promise<{
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
    releaseManualPayout(id: string, actor: PlatformAdminContext, request: Request): Promise<{
        released: boolean;
    }>;
    recordManualPayout(id: string, dto: RecordManualPayoutDto, actor: PlatformAdminContext, request: Request): Promise<{
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
    revealBankDetails(id: string, actor: PlatformAdminContext, request: Request): Promise<{
        accountNumber: string;
        beneficiaryName: string;
        ifscCode: string;
    }>;
    payoutAccounts(query: AdminPayoutsQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        user: {
            id: string;
            email: string | null;
            firstName: string;
            lastName: string | null;
        };
        organization: {
            id: string;
            name: string;
        };
        property: {
            id: string;
            name: string;
        } | null;
        id: string;
        status: import("@prisma/client").$Enums.PayoutAccountStatus;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        phone: string;
        propertyId: string | null;
        kycStatus: import("@prisma/client").$Enums.KycStatus;
        businessName: string;
        businessType: string;
        ifscCode: string;
        beneficiaryName: string;
        accountNumberMasked: string;
        razorpayAccountId: string;
    }>>;
    reviewPayout(id: string, dto: ReviewPayoutDto, actor: PlatformAdminContext, request: Request): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.PayoutAccountStatus;
        updatedAt: Date;
        organizationId: string;
        kycStatus: import("@prisma/client").$Enums.KycStatus;
        businessName: string;
        accountNumberMasked: string;
    }>;
}
