import { z } from 'zod';
export declare const createBookingSchema: z.ZodObject<{
    propertyId: z.ZodString;
    roomId: z.ZodOptional<z.ZodString>;
    bedId: z.ZodOptional<z.ZodString>;
    guestName: z.ZodString;
    guestMobile: z.ZodString;
    guestEmail: z.ZodOptional<z.ZodString>;
    tokenAmount: z.ZodDefault<z.ZodNumber>;
    expectedMoveIn: z.ZodEffects<z.ZodString, Date, string>;
    expiryDate: z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>;
    notes: z.ZodOptional<z.ZodString>;
    paymentMode: z.ZodDefault<z.ZodNativeEnum<{
        CASH: "CASH";
        UPI: "UPI";
        BANK_TRANSFER: "BANK_TRANSFER";
        CHEQUE: "CHEQUE";
        RAZORPAY: "RAZORPAY";
        OTHER: "OTHER";
    }>>;
    paymentRef: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    propertyId: string;
    guestName: string;
    guestMobile: string;
    tokenAmount: number;
    expectedMoveIn: Date;
    paymentMode: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY";
    roomId?: string | undefined;
    bedId?: string | undefined;
    notes?: string | undefined;
    guestEmail?: string | undefined;
    expiryDate?: Date | undefined;
    paymentRef?: string | undefined;
}, {
    propertyId: string;
    guestName: string;
    guestMobile: string;
    expectedMoveIn: string;
    roomId?: string | undefined;
    bedId?: string | undefined;
    notes?: string | undefined;
    guestEmail?: string | undefined;
    tokenAmount?: number | undefined;
    expiryDate?: string | undefined;
    paymentMode?: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY" | undefined;
    paymentRef?: string | undefined;
}>;
export type CreateBookingDto = z.infer<typeof createBookingSchema>;
export declare const queryBookingsSchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        CONFIRMED: "CONFIRMED";
        CHECKED_IN: "CHECKED_IN";
        CANCELLED: "CANCELLED";
        EXPIRED: "EXPIRED";
    }>>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "CONFIRMED" | "CHECKED_IN" | "CANCELLED" | "EXPIRED" | undefined;
    propertyId?: string | undefined;
}, {
    search?: string | undefined;
    status?: "CONFIRMED" | "CHECKED_IN" | "CANCELLED" | "EXPIRED" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
}>;
export type QueryBookingsDto = z.infer<typeof queryBookingsSchema>;
