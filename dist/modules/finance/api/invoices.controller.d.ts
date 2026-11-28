import { InvoicesService } from '../application/invoices.service.js';
import { type QueryInvoicesDto } from './dto/invoice.dto.js';
export declare class InvoicesController {
    private readonly invoicesService;
    constructor(invoicesService: InvoicesService);
    listInvoices(query: QueryInvoicesDto, orgId: string): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
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
    }>>;
    getInvoice(id: string, orgId: string): Promise<{
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
            email: string | null;
            mobile: string;
            firstName: string;
            lastName: string | null;
        };
        mandate: {
            landlordPayoutAccount: {
                businessName: string;
                beneficiaryName: string;
                razorpayAccountId: string;
            } | null;
            id: string;
            status: import("@prisma/client").$Enums.MandateStatus;
            razorpaySubscriptionId: string;
            mandateChannel: import("@prisma/client").$Enums.MandateChannel;
        } | null;
    } & {
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
    }>;
}
