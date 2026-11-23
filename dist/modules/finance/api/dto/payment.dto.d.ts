import { z } from 'zod';
export declare const recordPaymentSchema: z.ZodObject<{
    residentId: z.ZodString;
    billingRecordId: z.ZodOptional<z.ZodString>;
    amount: z.ZodNumber;
    mode: z.ZodEffects<z.ZodNativeEnum<{
        CASH: "CASH";
        UPI: "UPI";
        BANK_TRANSFER: "BANK_TRANSFER";
        CHEQUE: "CHEQUE";
        RAZORPAY: "RAZORPAY";
        OTHER: "OTHER";
    }>, "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE", "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY">;
    collectionDate: z.ZodEffects<z.ZodDefault<z.ZodEffects<z.ZodString, string, string>>, Date, string | undefined>;
    reference: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    proofUrl: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mode: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";
    residentId: string;
    amount: number;
    collectionDate: Date;
    notes?: string | undefined;
    idempotencyKey?: string | undefined;
    billingRecordId?: string | undefined;
    reference?: string | undefined;
    proofUrl?: string | undefined;
}, {
    mode: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY";
    residentId: string;
    amount: number;
    notes?: string | undefined;
    idempotencyKey?: string | undefined;
    collectionDate?: string | undefined;
    billingRecordId?: string | undefined;
    reference?: string | undefined;
    proofUrl?: string | undefined;
}>;
export type RecordPaymentDto = z.infer<typeof recordPaymentSchema>;
export declare const createRazorpayOrderSchema: z.ZodObject<{
    residentId: z.ZodString;
    billingRecordId: z.ZodOptional<z.ZodString>;
    amount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    residentId: string;
    amount: number;
    billingRecordId?: string | undefined;
}, {
    residentId: string;
    amount: number;
    billingRecordId?: string | undefined;
}>;
export type CreateRazorpayOrderDto = z.infer<typeof createRazorpayOrderSchema>;
export declare const verifyRazorpayPaymentSchema: z.ZodObject<{
    paymentId: z.ZodString;
    razorpayOrderId: z.ZodString;
    razorpayPaymentId: z.ZodString;
    razorpaySignature: z.ZodString;
}, "strip", z.ZodTypeAny, {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    paymentId: string;
}, {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    paymentId: string;
}>;
export type VerifyRazorpayPaymentDto = z.infer<typeof verifyRazorpayPaymentSchema>;
export declare const queryPaymentsSchema: z.ZodObject<{
    startDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    endDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    residentId: z.ZodOptional<z.ZodString>;
    propertyId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        PENDING: "PENDING";
        CONFIRMED: "CONFIRMED";
        FAILED: "FAILED";
        REFUNDED: "REFUNDED";
        DISPUTED: "DISPUTED";
    }>>;
    mode: z.ZodOptional<z.ZodNativeEnum<{
        CASH: "CASH";
        UPI: "UPI";
        BANK_TRANSFER: "BANK_TRANSFER";
        CHEQUE: "CHEQUE";
        RAZORPAY: "RAZORPAY";
        OTHER: "OTHER";
    }>>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "CONFIRMED" | "PENDING" | "FAILED" | "REFUNDED" | "DISPUTED" | undefined;
    mode?: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY" | undefined;
    propertyId?: string | undefined;
    residentId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    search?: string | undefined;
    status?: "CONFIRMED" | "PENDING" | "FAILED" | "REFUNDED" | "DISPUTED" | undefined;
    mode?: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
    residentId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export type QueryPaymentsDto = z.infer<typeof queryPaymentsSchema>;
