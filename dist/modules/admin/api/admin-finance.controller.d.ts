import type { Request } from 'express';
import type { PlatformAdminContext } from '../domain/admin-permissions.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import { AdminCommandService } from '../application/admin-command.service.js';
import { type AdminPaymentsQueryDto, type AdminPayoutsQueryDto, type AdminPendingQueryDto, type ReviewPayoutDto } from './dto/admin.dto.js';
export declare class AdminFinanceController {
    private readonly queryService;
    private readonly commands;
    constructor(queryService: AdminQueryService, commands: AdminCommandService);
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
            status: import("@prisma/client").$Enums.BillingStatus;
            type: import("@prisma/client").$Enums.BillingType;
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
            status: import("@prisma/client").$Enums.BillingStatus;
            type: import("@prisma/client").$Enums.BillingType;
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
            businessName: string;
            kycStatus: import("@prisma/client").$Enums.KycStatus;
            accountNumberMasked: string;
        }[];
    }>;
    payoutAccounts(query: AdminPayoutsQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        user: {
            id: string;
            email: string;
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
    reviewPayout(id: string, dto: ReviewPayoutDto, actor: PlatformAdminContext, request: Request): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.PayoutAccountStatus;
        updatedAt: Date;
        organizationId: string;
        businessName: string;
        kycStatus: import("@prisma/client").$Enums.KycStatus;
        accountNumberMasked: string;
    }>;
}
