import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import type { RecordPaymentDto, CreateRazorpayOrderDto, VerifyRazorpayPaymentDto, QueryPaymentsDto } from '../api/dto/payment.dto.js';
export declare class PaymentsService {
    private readonly prisma;
    private readonly razorpayAdapter;
    constructor(prisma: PrismaService, razorpayAdapter: RazorpayAdapter);
    recordPayment(dto: RecordPaymentDto, orgId: string, userId: string): Promise<{
        receiptNumber: string;
        paymentId: string;
        amountPaise: number;
        amountRupees: number;
        amountFormatted: string;
        mode: string;
        collectionDate: Date;
        reference: string | null;
        refundedAmountPaise: number;
        refundedAmountFormatted: string;
        allocations: {
            type: string;
            description: string | null;
            amountPaise: number;
            amountFormatted: string;
        }[];
        resident: {
            id: string;
            name: string;
            mobile: string;
            property: string;
        };
        issuedAt: Date;
    }>;
    createRazorpayOrder(dto: CreateRazorpayOrderDto, orgId: string, userId: string): Promise<{
        paymentId: string;
        razorpayOrderId: string;
        amountPaise: number;
        amountRupees: number;
        currency: string;
    }>;
    verifyRazorpayPayment(dto: VerifyRazorpayPaymentDto, orgId: string, userId: string): Promise<{
        receiptNumber: string;
        paymentId: string;
        amountPaise: number;
        amountRupees: number;
        amountFormatted: string;
        mode: string;
        collectionDate: Date;
        reference: string | null;
        refundedAmountPaise: number;
        refundedAmountFormatted: string;
        allocations: {
            type: string;
            description: string | null;
            amountPaise: number;
            amountFormatted: string;
        }[];
        resident: {
            id: string;
            name: string;
            mobile: string;
            property: string;
        };
        issuedAt: Date;
    }>;
    private allocatePayment;
    captureOnlinePayment(input: {
        orderId?: string;
        linkId?: string;
        qrId?: string;
        capturedAt?: Date;
        referenceId?: string;
        gatewayPaymentId: string;
        amount: number;
        currency?: string;
    }): Promise<{
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
    } | undefined>;
    applyDisputedCapture(id: string, reviewerId: string, reason: string): Promise<{
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
    }>;
    syncGatewayRefund(gatewayPaymentId: string): Promise<void>;
    private formatReceipt;
    findAll(orgId: string, query: QueryPaymentsDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        amountRupees: number;
        amountFormatted: string;
        netAmountPaise: number;
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
        };
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
    }>>;
    getReceipt(paymentId: string, orgId: string): Promise<{
        receiptNumber: string;
        paymentId: string;
        amountPaise: number;
        amountRupees: number;
        amountFormatted: string;
        mode: string;
        collectionDate: Date;
        reference: string | null;
        refundedAmountPaise: number;
        refundedAmountFormatted: string;
        allocations: {
            type: string;
            description: string | null;
            amountPaise: number;
            amountFormatted: string;
        }[];
        resident: {
            id: string;
            name: string;
            mobile: string;
            property: string;
        };
        issuedAt: Date;
    }>;
}
