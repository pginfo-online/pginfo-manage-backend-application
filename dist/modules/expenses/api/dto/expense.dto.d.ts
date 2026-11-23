import { z } from 'zod';
export declare const createExpenseSchema: z.ZodObject<{
    propertyId: z.ZodString;
    categoryId: z.ZodString;
    amount: z.ZodNumber;
    expenseDate: z.ZodEffects<z.ZodDefault<z.ZodEffects<z.ZodString, string, string>>, Date, string | undefined>;
    paymentMode: z.ZodNativeEnum<{
        CASH: "CASH";
        UPI: "UPI";
        BANK_TRANSFER: "BANK_TRANSFER";
        CHEQUE: "CHEQUE";
        RAZORPAY: "RAZORPAY";
        OTHER: "OTHER";
    }>;
    paidBy: z.ZodOptional<z.ZodString>;
    paidTo: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    receiptUrl: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description: string;
    propertyId: string;
    paymentMode: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY";
    amount: number;
    categoryId: string;
    expenseDate: Date;
    notes?: string | undefined;
    paidBy?: string | undefined;
    paidTo?: string | undefined;
    receiptUrl?: string | undefined;
}, {
    description: string;
    propertyId: string;
    paymentMode: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY";
    amount: number;
    categoryId: string;
    notes?: string | undefined;
    expenseDate?: string | undefined;
    paidBy?: string | undefined;
    paidTo?: string | undefined;
    receiptUrl?: string | undefined;
}>;
export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;
export declare const updateExpenseSchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodNumber>;
    expenseDate: z.ZodOptional<z.ZodEffects<z.ZodDefault<z.ZodEffects<z.ZodString, string, string>>, Date, string | undefined>>;
    paymentMode: z.ZodOptional<z.ZodNativeEnum<{
        CASH: "CASH";
        UPI: "UPI";
        BANK_TRANSFER: "BANK_TRANSFER";
        CHEQUE: "CHEQUE";
        RAZORPAY: "RAZORPAY";
        OTHER: "OTHER";
    }>>;
    paidBy: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    paidTo: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
    receiptUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    propertyId?: string | undefined;
    notes?: string | undefined;
    paymentMode?: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY" | undefined;
    amount?: number | undefined;
    categoryId?: string | undefined;
    expenseDate?: Date | undefined;
    paidBy?: string | undefined;
    paidTo?: string | undefined;
    receiptUrl?: string | undefined;
}, {
    description?: string | undefined;
    propertyId?: string | undefined;
    notes?: string | undefined;
    paymentMode?: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY" | undefined;
    amount?: number | undefined;
    categoryId?: string | undefined;
    expenseDate?: string | undefined;
    paidBy?: string | undefined;
    paidTo?: string | undefined;
    receiptUrl?: string | undefined;
}>;
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;
export declare const createExpenseCategorySchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export type CreateExpenseCategoryDto = z.infer<typeof createExpenseCategorySchema>;
export declare const queryExpensesSchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    paymentMode: z.ZodOptional<z.ZodNativeEnum<{
        CASH: "CASH";
        UPI: "UPI";
        BANK_TRANSFER: "BANK_TRANSFER";
        CHEQUE: "CHEQUE";
        RAZORPAY: "RAZORPAY";
        OTHER: "OTHER";
    }>>;
    search: z.ZodOptional<z.ZodString>;
    startDate: z.ZodEffects<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>, Date | undefined, string | undefined>;
    endDate: z.ZodEffects<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>, Date | undefined, string | undefined>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    propertyId?: string | undefined;
    paymentMode?: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY" | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    categoryId?: string | undefined;
}, {
    search?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
    paymentMode?: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    categoryId?: string | undefined;
}>;
export type QueryExpensesDto = z.infer<typeof queryExpensesSchema>;
