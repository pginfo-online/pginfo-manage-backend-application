import type { Response } from 'express';
import { MoneyService } from '../application/money.service.js';
import { MoneyLinksService } from '../application/money-links.service.js';
import { type MoneyQuery, type PackageInput, type OfferInput, type MoneyPayment } from './dto/money.dto.js';
export declare class MoneyController {
    private readonly money;
    private readonly links;
    constructor(money: MoneyService, links: MoneyLinksService);
    createLink(id: string, org: string, user: string): Promise<{
        paymentLink: string;
        amount: number;
        expiresAt: Date | null;
    }>;
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
    report(kind: string, org: string, q: MoneyQuery, res: Response): Promise<void>;
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
    createPackage(org: string, user: string, dto: PackageInput): Promise<{
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
    updatePackage(id: string, org: string, user: string, dto: PackageInput): Promise<{
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
    dues(org: string, q: MoneyQuery): Promise<import("../../../common/pagination/index.js").PaginatedResponse<string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | null>>;
    summary(org: string, q: MoneyQuery): Promise<{
        activeExpenseCategories: number;
        reconciliationCount: number;
        reconciliationAmount: number;
        asOf: string;
    }>;
    context(id: string, org: string): Promise<{
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
        })[];
        offer: {
            id: string;
            createdAt: Date;
            organizationId: string;
            description: string;
            residentId: string;
            amount: number;
            validTill: Date;
            minimumPayment: string;
            minimumAmount: number | null;
            consumedAt: Date | null;
        } | null;
        totalDues: number;
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
    offer(id: string, org: string, user: string, dto: OfferInput): Promise<{
        id: string;
        createdAt: Date;
        organizationId: string;
        description: string;
        residentId: string;
        amount: number;
        validTill: Date;
        minimumPayment: string;
        minimumAmount: number | null;
        consumedAt: Date | null;
    }>;
    remark(id: string, org: string, user: string, dto: {
        description: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        userId: string | null;
        organizationId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        userAgent: string | null;
        ipAddress: string | null;
        action: string;
        entityType: string | null;
        entityId: string | null;
    }>;
    record(org: string, user: string, dto: MoneyPayment): Promise<{
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
            razorpayOrderId: string | null;
            razorpayPaymentId: string | null;
            razorpaySignature: string | null;
            recordedBy: string | null;
        }[];
        discount: number;
        replayed: boolean;
    }>;
    parties(org: string, q: MoneyQuery): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        id: string;
        name: string;
        createdAt: Date;
        organizationId: string;
    }>>;
    party(org: string, dto: {
        name: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        organizationId: string;
    }>;
    link(id: string, org: string, user: string, dto: {
        propertyId: string | null;
    }): Promise<{
        id: string;
        propertyId: string | null;
    }>;
}
