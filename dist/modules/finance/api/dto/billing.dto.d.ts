import { z } from 'zod';
export declare const createChargeSchema: z.ZodObject<{
    residentId: z.ZodString;
    type: z.ZodNativeEnum<{
        RENT: "RENT";
        SECURITY_DEPOSIT: "SECURITY_DEPOSIT";
        ELECTRICITY: "ELECTRICITY";
        WATER: "WATER";
        MAINTENANCE: "MAINTENANCE";
        LATE_FEE: "LATE_FEE";
        OTHER: "OTHER";
    }>;
    amount: z.ZodNumber;
    dueDate: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, Date, string>;
    description: z.ZodString;
    periodStart: z.ZodEffects<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>, Date | undefined, string | undefined>;
    periodEnd: z.ZodEffects<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>, Date | undefined, string | undefined>;
}, "strip", z.ZodTypeAny, {
    type: "OTHER" | "RENT" | "SECURITY_DEPOSIT" | "ELECTRICITY" | "WATER" | "MAINTENANCE" | "LATE_FEE";
    description: string;
    residentId: string;
    amount: number;
    dueDate: Date;
    periodStart?: Date | undefined;
    periodEnd?: Date | undefined;
}, {
    type: "OTHER" | "RENT" | "SECURITY_DEPOSIT" | "ELECTRICITY" | "WATER" | "MAINTENANCE" | "LATE_FEE";
    description: string;
    residentId: string;
    amount: number;
    dueDate: string;
    periodStart?: string | undefined;
    periodEnd?: string | undefined;
}>;
export type CreateChargeDto = z.infer<typeof createChargeSchema>;
export declare const generateMonthlyDuesSchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    billingMonth: z.ZodNumber;
    billingYear: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    billingMonth: number;
    billingYear: number;
    propertyId?: string | undefined;
}, {
    billingMonth: number;
    billingYear: number;
    propertyId?: string | undefined;
}>;
export type GenerateMonthlyDuesDto = z.infer<typeof generateMonthlyDuesSchema>;
export declare const queryBillingSchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    residentId: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodNativeEnum<{
        RENT: "RENT";
        SECURITY_DEPOSIT: "SECURITY_DEPOSIT";
        ELECTRICITY: "ELECTRICITY";
        WATER: "WATER";
        MAINTENANCE: "MAINTENANCE";
        LATE_FEE: "LATE_FEE";
        OTHER: "OTHER";
    }>>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        ISSUED: "ISSUED";
        DUE: "DUE";
        PARTIALLY_PAID: "PARTIALLY_PAID";
        PAID: "PAID";
        OVERDUE: "OVERDUE";
        CANCELLED: "CANCELLED";
        WAIVED: "WAIVED";
    }>>;
    month: z.ZodOptional<z.ZodNumber>;
    year: z.ZodOptional<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "CANCELLED" | "ISSUED" | "DUE" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "WAIVED" | undefined;
    type?: "OTHER" | "RENT" | "SECURITY_DEPOSIT" | "ELECTRICITY" | "WATER" | "MAINTENANCE" | "LATE_FEE" | undefined;
    year?: number | undefined;
    month?: number | undefined;
    propertyId?: string | undefined;
    residentId?: string | undefined;
}, {
    search?: string | undefined;
    status?: "CANCELLED" | "ISSUED" | "DUE" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "WAIVED" | undefined;
    type?: "OTHER" | "RENT" | "SECURITY_DEPOSIT" | "ELECTRICITY" | "WATER" | "MAINTENANCE" | "LATE_FEE" | undefined;
    year?: number | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    month?: number | undefined;
    propertyId?: string | undefined;
    residentId?: string | undefined;
}>;
export type QueryBillingDto = z.infer<typeof queryBillingSchema>;
export declare const discountSchema: z.ZodObject<{
    amount: z.ZodNumber;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    amount: number;
    reason: string;
}, {
    amount: number;
    reason: string;
}>;
export type DiscountDto = z.infer<typeof discountSchema>;
