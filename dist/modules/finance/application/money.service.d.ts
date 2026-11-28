import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/index.js';
import type { MoneyQuery, PackageInput, OfferInput, MoneyPayment } from '../api/dto/money.dto.js';
export declare class MoneyService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private audit;
    private resident;
    properties(org: string, q: MoneyQuery): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        id: string;
        type: import("@prisma/client").$Enums.PropertyType;
        name: string;
    }>>;
    property(id: string, org: string): Promise<{
        id: string;
        type: import("@prisma/client").$Enums.PropertyType;
        name: string;
    }>;
    packages(org: string, q: MoneyQuery): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        description: string;
        version: number;
        amount: number;
        billing: string;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        category: string;
    }>>;
    savePackage(org: string, user: string, dto: PackageInput, id?: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        description: string;
        version: number;
        amount: number;
        billing: string;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        category: string;
    }>;
    private duesWhere;
    dues(org: string, q: MoneyQuery): Promise<import("../../../common/pagination/index.js").PaginatedResponse<string | number | boolean | Prisma.JsonObject | Prisma.JsonArray | null>>;
    summary(org: string, propertyId?: string): Promise<{
        activeExpenseCategories: number;
        reconciliationCount: number;
        reconciliationAmount: number;
        asOf: string;
    }>;
    paymentContext(id: string, org: string): Promise<{
        resident: {
            property: {
                name: string;
            };
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
            propertyId: string;
            whatsappNumber: string | null;
            parentName: string | null;
            parentPhone: string | null;
        };
        bills: ({
            _count: {
                rentInvoices: number;
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
        })[];
        offer: {
            id: string;
            createdAt: Date;
            organizationId: string;
            description: string;
            consumedAt: Date | null;
            residentId: string;
            amount: number;
            validTill: Date;
            minimumPayment: string;
            minimumAmount: number | null;
        } | null;
        totalDues: number;
    }>;
    offer(id: string, org: string, user: string, dto: OfferInput): Promise<{
        id: string;
        createdAt: Date;
        organizationId: string;
        description: string;
        consumedAt: Date | null;
        residentId: string;
        amount: number;
        validTill: Date;
        minimumPayment: string;
        minimumAmount: number | null;
    }>;
    record(dto: MoneyPayment, org: string, user: string): Promise<{
        payments: {
            id: string;
            status: import("@prisma/client").$Enums.PaymentStatus;
            mode: import("@prisma/client").$Enums.PaymentMode;
            createdAt: Date;
            updatedAt: Date;
            organizationId: string;
            notes: string | null;
            version: number;
            residentId: string;
            amount: number;
            idempotencyKey: string | null;
            collectionDate: Date;
            billingRecordId: string | null;
            reference: string | null;
            proofUrl: string | null;
            paymentLinkId: string | null;
            paymentLinkUrl: string | null;
            paymentLinkExpiresAt: Date | null;
            gatewayQrId: string | null;
            capturedAt: Date | null;
            capturePropertyId: string | null;
            capturePlatformFee: number | null;
            gatewayRefundedAmount: number;
            razorpayOrderId: string | null;
            razorpayPaymentId: string | null;
            razorpaySignature: string | null;
            recordedBy: string | null;
        }[];
        replayed: boolean;
        discount?: undefined;
    } | {
        payments: {
            id: string;
            status: import("@prisma/client").$Enums.PaymentStatus;
            mode: import("@prisma/client").$Enums.PaymentMode;
            createdAt: Date;
            updatedAt: Date;
            organizationId: string;
            notes: string | null;
            version: number;
            residentId: string;
            amount: number;
            idempotencyKey: string | null;
            collectionDate: Date;
            billingRecordId: string | null;
            reference: string | null;
            proofUrl: string | null;
            paymentLinkId: string | null;
            paymentLinkUrl: string | null;
            paymentLinkExpiresAt: Date | null;
            gatewayQrId: string | null;
            capturedAt: Date | null;
            capturePropertyId: string | null;
            capturePlatformFee: number | null;
            gatewayRefundedAmount: number;
            razorpayOrderId: string | null;
            razorpayPaymentId: string | null;
            razorpaySignature: string | null;
            recordedBy: string | null;
        }[];
        discount: number;
        replayed: boolean;
    }>;
    remark(id: string, org: string, user: string, description: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string | null;
        organizationId: string | null;
        metadata: Prisma.JsonValue | null;
        userAgent: string | null;
        ipAddress: string | null;
        action: string;
        entityType: string | null;
        entityId: string | null;
    }>;
    parties(org: string, q: MoneyQuery): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        id: string;
        name: string;
        createdAt: Date;
        organizationId: string;
    }>>;
    createParty(org: string, name: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        organizationId: string;
    }>;
    linkBank(id: string, org: string, user: string, propertyId: string | null): Promise<{
        id: string;
        propertyId: string | null;
    }>;
    reminder(id: string, org: string): Promise<{
        resident: {
            property: {
                name: string;
            };
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
            propertyId: string;
            whatsappNumber: string | null;
            parentName: string | null;
            parentPhone: string | null;
        };
        totalDues: number;
        paymentLink: string | null;
        linkAmount: number;
        expiresAt: Date | null;
        message: string;
    }>;
    report(kind: string, org: string, q: MoneyQuery): AsyncGenerator<string>;
}
