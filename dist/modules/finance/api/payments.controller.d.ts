import { PaymentsService } from '../application/payments.service.js';
import { type RecordPaymentDto, type CreateRazorpayOrderDto, type VerifyRazorpayPaymentDto, type QueryPaymentsDto } from './dto/payment.dto.js';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    recordPayment(dto: RecordPaymentDto, orgId: string, userId: string): Promise<{
        receiptNumber: string;
        paymentId: string;
        amountPaise: number;
        amountRupees: number;
        amountFormatted: string;
        mode: string;
        collectionDate: Date;
        reference: string | null;
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
        resident: {
            id: string;
            name: string;
            mobile: string;
            property: string;
        };
        issuedAt: Date;
    }>;
    findAll(query: QueryPaymentsDto, orgId: string): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        amountRupees: number;
        amountFormatted: string;
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
        razorpayOrderId: string | null;
        razorpayPaymentId: string | null;
        razorpaySignature: string | null;
        recordedBy: string | null;
    }>>;
    getReceipt(id: string, orgId: string): Promise<{
        receiptNumber: string;
        paymentId: string;
        amountPaise: number;
        amountRupees: number;
        amountFormatted: string;
        mode: string;
        collectionDate: Date;
        reference: string | null;
        resident: {
            id: string;
            name: string;
            mobile: string;
            property: string;
        };
        issuedAt: Date;
    }>;
}
