import { MandatesService } from '../application/mandates.service.js';
import { type CreateMandateDto, type QueryMandatesDto } from './dto/mandate.dto.js';
export declare class MandatesController {
    private readonly mandatesService;
    constructor(mandatesService: MandatesService);
    createMandate(dto: CreateMandateDto, orgId: string, userId: string): Promise<{
        mandateId: string;
        subscriptionId: string;
        status: import("@prisma/client").$Enums.MandateStatus;
        shortUrl: string;
        rentAmountPaise: number;
        rentAmountRupees: number;
        billingDay: number;
        tenureMonths: number;
        nextChargeDate: Date;
        whatsappPayload: {
            to: string;
            message: string;
            template: string;
            templateParams: {
                tenant_name: string;
                property_name: string;
                unit_number: string;
                rent_amount: string;
                billing_day: string;
                auth_url: string;
            };
            authorizationUrl: string;
        };
        notificationSent: boolean;
        notificationError: string | null;
        notificationMessageId: string | null;
    }>;
    listMandates(query: QueryMandatesDto, orgId: string): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        property: {
            id: string;
            name: string;
        };
        unit: {
            id: string;
            roomNumber: string;
        } | null;
        tenant: {
            id: string;
            mobile: string;
            firstName: string;
            lastName: string | null;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.MandateStatus;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        propertyId: string;
        rentAmount: number;
        bedId: string | null;
        collectionMode: import("@prisma/client").$Enums.MandateCollectionMode;
        tenantId: string;
        unitId: string | null;
        landlordPayoutAccountId: string | null;
        razorpayPlanId: string | null;
        razorpaySubscriptionId: string;
        razorpayCustomerId: string | null;
        razorpayTokenId: string | null;
        mandateChannel: import("@prisma/client").$Enums.MandateChannel;
        bankReference: string | null;
        billingDay: number;
        tenureMonths: number;
        totalCount: number;
        paidCount: number;
        shortUrl: string | null;
        failureReason: string | null;
        retryCount: number;
        startedAt: Date | null;
        nextChargeDate: Date | null;
        cancelledAt: Date | null;
    }>>;
    getMandate(id: string, orgId: string): Promise<{
        property: {
            id: string;
            name: string;
        };
        landlordPayoutAccount: {
            id: string;
            businessName: string;
            razorpayAccountId: string;
            beneficiaryName: string;
        } | null;
        unit: {
            id: string;
            roomNumber: string;
        } | null;
        tenant: {
            id: string;
            email: string | null;
            mobile: string;
            firstName: string;
            lastName: string | null;
        };
        invoices: {
            id: string;
            status: import("@prisma/client").$Enums.RentInvoiceStatus;
            createdAt: Date;
            updatedAt: Date;
            organizationId: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            propertyId: string;
            amount: number;
            billingMonth: number;
            billingYear: number;
            dueDate: Date;
            tenantId: string;
            unitId: string | null;
            failureReason: string | null;
            retryCount: number;
            billingRecordId: string | null;
            razorpayOrderId: string | null;
            razorpayPaymentId: string | null;
            invoiceNumber: string;
            platformFee: number;
            transferAmount: number;
            collectionType: import("@prisma/client").$Enums.RentCollectionType;
            paidAt: Date | null;
            razorpayTransferId: string | null;
            fallbackPaymentUrl: string | null;
            mandateId: string | null;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.MandateStatus;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        propertyId: string;
        rentAmount: number;
        bedId: string | null;
        collectionMode: import("@prisma/client").$Enums.MandateCollectionMode;
        tenantId: string;
        unitId: string | null;
        landlordPayoutAccountId: string | null;
        razorpayPlanId: string | null;
        razorpaySubscriptionId: string;
        razorpayCustomerId: string | null;
        razorpayTokenId: string | null;
        mandateChannel: import("@prisma/client").$Enums.MandateChannel;
        bankReference: string | null;
        billingDay: number;
        tenureMonths: number;
        totalCount: number;
        paidCount: number;
        shortUrl: string | null;
        failureReason: string | null;
        retryCount: number;
        startedAt: Date | null;
        nextChargeDate: Date | null;
        cancelledAt: Date | null;
    }>;
    resendInvite(id: string, orgId: string, userId: string): Promise<{
        notificationSent: boolean;
        notificationError: string | null;
        notificationMessageId: string | null;
    }>;
    cancelMandate(id: string, orgId: string, userId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.MandateStatus;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        propertyId: string;
        rentAmount: number;
        bedId: string | null;
        collectionMode: import("@prisma/client").$Enums.MandateCollectionMode;
        tenantId: string;
        unitId: string | null;
        landlordPayoutAccountId: string | null;
        razorpayPlanId: string | null;
        razorpaySubscriptionId: string;
        razorpayCustomerId: string | null;
        razorpayTokenId: string | null;
        mandateChannel: import("@prisma/client").$Enums.MandateChannel;
        bankReference: string | null;
        billingDay: number;
        tenureMonths: number;
        totalCount: number;
        paidCount: number;
        shortUrl: string | null;
        failureReason: string | null;
        retryCount: number;
        startedAt: Date | null;
        nextChargeDate: Date | null;
        cancelledAt: Date | null;
    }>;
}
