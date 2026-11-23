import { z } from 'zod';
export declare const moneyCategories: readonly ["Rent", "Deposit", "Electricity", "Water", "Internet", "Food", "Housekeeping", "Laundry", "Maintenance", "Repair", "Late Fine", "Damage Fine", "Key Charges", "Parking", "Common Areas", "KYC", "Agreement", "Move-out Charges"];
export declare const moneyDate: z.ZodEffects<z.ZodString, string, string>;
export declare const packageSchema: z.ZodEffects<z.ZodObject<{
    propertyType: z.ZodNativeEnum<{
        PG: "PG";
        HOSTEL: "HOSTEL";
        CO_LIVING: "CO_LIVING";
        FLAT: "FLAT";
        APARTMENT: "APARTMENT";
        RK: "RK";
        OTHER: "OTHER";
    }>;
    name: z.ZodString;
    category: z.ZodEnum<["Rent", "Deposit", "Electricity", "Water", "Internet", "Food", "Housekeeping", "Laundry", "Maintenance", "Repair", "Late Fine", "Damage Fine", "Key Charges", "Parking", "Common Areas", "KYC", "Agreement", "Move-out Charges"]>;
    billing: z.ZodEnum<["FIXED", "VARIABLE"]>;
    amount: z.ZodNumber;
    description: z.ZodDefault<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    version: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    description: string;
    amount: number;
    billing: "FIXED" | "VARIABLE";
    propertyType: "PG" | "HOSTEL" | "CO_LIVING" | "FLAT" | "APARTMENT" | "RK" | "OTHER";
    category: "Maintenance" | "Rent" | "Water" | "Food" | "Housekeeping" | "Deposit" | "Electricity" | "Internet" | "Laundry" | "Repair" | "Late Fine" | "Damage Fine" | "Key Charges" | "Parking" | "Common Areas" | "KYC" | "Agreement" | "Move-out Charges";
    version?: number | undefined;
}, {
    name: string;
    amount: number;
    billing: "FIXED" | "VARIABLE";
    propertyType: "PG" | "HOSTEL" | "CO_LIVING" | "FLAT" | "APARTMENT" | "RK" | "OTHER";
    category: "Maintenance" | "Rent" | "Water" | "Food" | "Housekeeping" | "Deposit" | "Electricity" | "Internet" | "Laundry" | "Repair" | "Late Fine" | "Damage Fine" | "Key Charges" | "Parking" | "Common Areas" | "KYC" | "Agreement" | "Move-out Charges";
    isActive?: boolean | undefined;
    description?: string | undefined;
    version?: number | undefined;
}>, {
    name: string;
    isActive: boolean;
    description: string;
    amount: number;
    billing: "FIXED" | "VARIABLE";
    propertyType: "PG" | "HOSTEL" | "CO_LIVING" | "FLAT" | "APARTMENT" | "RK" | "OTHER";
    category: "Maintenance" | "Rent" | "Water" | "Food" | "Housekeeping" | "Deposit" | "Electricity" | "Internet" | "Laundry" | "Repair" | "Late Fine" | "Damage Fine" | "Key Charges" | "Parking" | "Common Areas" | "KYC" | "Agreement" | "Move-out Charges";
    version?: number | undefined;
}, {
    name: string;
    amount: number;
    billing: "FIXED" | "VARIABLE";
    propertyType: "PG" | "HOSTEL" | "CO_LIVING" | "FLAT" | "APARTMENT" | "RK" | "OTHER";
    category: "Maintenance" | "Rent" | "Water" | "Food" | "Housekeeping" | "Deposit" | "Electricity" | "Internet" | "Laundry" | "Repair" | "Late Fine" | "Damage Fine" | "Key Charges" | "Parking" | "Common Areas" | "KYC" | "Agreement" | "Move-out Charges";
    isActive?: boolean | undefined;
    description?: string | undefined;
    version?: number | undefined;
}>;
export declare const moneyQuerySchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    search: z.ZodDefault<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sort: z.ZodDefault<z.ZodEnum<["DATE_ASC", "DATE_DESC", "ROOM", "AMOUNT_DESC", "AMOUNT_ASC"]>>;
    date: z.ZodDefault<z.ZodEnum<["ALL", "TODAY", "YESTERDAY", "30_DAYS", "3_MONTHS", "6_MONTHS"]>>;
    defaulter: z.ZodDefault<z.ZodEnum<["ALL", "RENT", "OTHER"]>>;
    type: z.ZodOptional<z.ZodEnum<["RENT", "SECURITY_DEPOSIT", "ELECTRICITY", "WIFI", "MAINTENANCE", "OTHER"]>>;
    active: z.ZodDefault<z.ZodEnum<["ALL", "ACTIVE", "DISABLED"]>>;
    startDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    endDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    mode: z.ZodOptional<z.ZodNativeEnum<{
        CASH: "CASH";
        UPI: "UPI";
        BANK_TRANSFER: "BANK_TRANSFER";
        CHEQUE: "CHEQUE";
        RAZORPAY: "RAZORPAY";
        OTHER: "OTHER";
    }>>;
}, "strip", z.ZodTypeAny, {
    search: string;
    sort: "DATE_ASC" | "DATE_DESC" | "ROOM" | "AMOUNT_DESC" | "AMOUNT_ASC";
    date: "ALL" | "TODAY" | "YESTERDAY" | "30_DAYS" | "3_MONTHS" | "6_MONTHS";
    limit: number;
    page: number;
    defaulter: "OTHER" | "RENT" | "ALL";
    active: "ACTIVE" | "ALL" | "DISABLED";
    type?: "OTHER" | "RENT" | "SECURITY_DEPOSIT" | "ELECTRICITY" | "MAINTENANCE" | "WIFI" | undefined;
    mode?: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY" | undefined;
    propertyId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    search?: string | undefined;
    sort?: "DATE_ASC" | "DATE_DESC" | "ROOM" | "AMOUNT_DESC" | "AMOUNT_ASC" | undefined;
    type?: "OTHER" | "RENT" | "SECURITY_DEPOSIT" | "ELECTRICITY" | "MAINTENANCE" | "WIFI" | undefined;
    date?: "ALL" | "TODAY" | "YESTERDAY" | "30_DAYS" | "3_MONTHS" | "6_MONTHS" | undefined;
    mode?: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    defaulter?: "OTHER" | "RENT" | "ALL" | undefined;
    active?: "ACTIVE" | "ALL" | "DISABLED" | undefined;
}>;
export declare const offerSchema: z.ZodEffects<z.ZodObject<{
    amount: z.ZodNumber;
    validTill: z.ZodEffects<z.ZodString, string, string>;
    minimumPayment: z.ZodEnum<["FULL", "CUSTOM"]>;
    minimumAmount: z.ZodOptional<z.ZodNumber>;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string;
    amount: number;
    validTill: string;
    minimumPayment: "FULL" | "CUSTOM";
    minimumAmount?: number | undefined;
}, {
    description: string;
    amount: number;
    validTill: string;
    minimumPayment: "FULL" | "CUSTOM";
    minimumAmount?: number | undefined;
}>, {
    description: string;
    amount: number;
    validTill: string;
    minimumPayment: "FULL" | "CUSTOM";
    minimumAmount?: number | undefined;
}, {
    description: string;
    amount: number;
    validTill: string;
    minimumPayment: "FULL" | "CUSTOM";
    minimumAmount?: number | undefined;
}>;
export declare const moneyPaymentSchema: z.ZodEffects<z.ZodObject<{
    residentId: z.ZodString;
    amount: z.ZodNumber;
    mode: z.ZodEffects<z.ZodNativeEnum<{
        CASH: "CASH";
        UPI: "UPI";
        BANK_TRANSFER: "BANK_TRANSFER";
        CHEQUE: "CHEQUE";
        RAZORPAY: "RAZORPAY";
        OTHER: "OTHER";
    }>, "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE", "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY">;
    collectionDate: z.ZodEffects<z.ZodString, string, string>;
    notes: z.ZodOptional<z.ZodString>;
    proofUrl: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodString;
    allocations: z.ZodArray<z.ZodObject<{
        billingRecordId: z.ZodString;
        amount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        billingRecordId: string;
    }, {
        amount: number;
        billingRecordId: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    mode: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";
    residentId: string;
    amount: number;
    idempotencyKey: string;
    collectionDate: string;
    allocations: {
        amount: number;
        billingRecordId: string;
    }[];
    notes?: string | undefined;
    proofUrl?: string | undefined;
}, {
    mode: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY";
    residentId: string;
    amount: number;
    idempotencyKey: string;
    collectionDate: string;
    allocations: {
        amount: number;
        billingRecordId: string;
    }[];
    notes?: string | undefined;
    proofUrl?: string | undefined;
}>, {
    mode: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";
    residentId: string;
    amount: number;
    idempotencyKey: string;
    collectionDate: string;
    allocations: {
        amount: number;
        billingRecordId: string;
    }[];
    notes?: string | undefined;
    proofUrl?: string | undefined;
}, {
    mode: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY";
    residentId: string;
    amount: number;
    idempotencyKey: string;
    collectionDate: string;
    allocations: {
        amount: number;
        billingRecordId: string;
    }[];
    notes?: string | undefined;
    proofUrl?: string | undefined;
}>;
export declare const remarkSchema: z.ZodObject<{
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string;
}, {
    description: string;
}>;
export declare const partySchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const bankLinkSchema: z.ZodObject<{
    propertyId: z.ZodNullable<z.ZodString>;
    version: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    propertyId: string | null;
    version?: number | undefined;
}, {
    propertyId: string | null;
    version?: number | undefined;
}>;
export type MoneyQuery = z.infer<typeof moneyQuerySchema>;
export type MoneyPayment = z.infer<typeof moneyPaymentSchema>;
export type PackageInput = z.infer<typeof packageSchema>;
export type OfferInput = z.infer<typeof offerSchema>;
