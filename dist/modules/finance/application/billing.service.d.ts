import { PrismaService } from '../../../platform/database/index.js';
import type { CreateChargeDto, DiscountDto, GenerateMonthlyDuesDto, QueryBillingDto } from '../api/dto/billing.dto.js';
export declare class BillingService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateMonthlyDues(dto: GenerateMonthlyDuesDto, orgId: string, userId?: string): Promise<{
        billingMonth: number;
        billingYear: number;
        generatedCount: number;
        skippedCount: number;
        totalAmountPaise: number;
    }>;
    createCharge(dto: CreateChargeDto, orgId: string, userId: string): Promise<{
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
    }>;
    discount(id: string, dto: DiscountDto, orgId: string, userId: string): Promise<{
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
    }>;
    findAll(orgId: string, query: QueryBillingDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        resident: {
            room: {
                roomNumber: string;
            } | null;
            bed: {
                bedNumber: string;
            } | null;
            id: string;
            mobile: string;
            firstName: string;
            lastName: string | null;
        };
    } & {
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
    }>>;
    findById(id: string, orgId: string): Promise<{
        resident: {
            property: {
                id: string;
                name: string;
            };
            room: {
                roomNumber: string;
            } | null;
            bed: {
                bedNumber: string;
            } | null;
            id: string;
            email: string | null;
            mobile: string;
            firstName: string;
            lastName: string | null;
        };
        payments: {
            id: string;
            mode: import("@prisma/client").$Enums.PaymentMode;
            amount: number;
            collectionDate: Date;
            reference: string | null;
        }[];
    } & {
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
    }>;
    cancelBill(id: string, orgId: string, userId: string, reason?: string): Promise<{
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
    }>;
}
