import { z } from 'zod';
export declare const onboardOwnerSchema: z.ZodObject<{
    ownerName: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    businessName: z.ZodString;
    businessType: z.ZodDefault<z.ZodEnum<["individual", "proprietorship", "partnership", "llp", "private_limited"]>>;
    accountNumber: z.ZodString;
    ifscCode: z.ZodString;
    propertyId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    phone: string;
    ownerName: string;
    businessName: string;
    businessType: "individual" | "proprietorship" | "partnership" | "llp" | "private_limited";
    accountNumber: string;
    ifscCode: string;
    propertyId?: string | undefined;
}, {
    email: string;
    phone: string;
    ownerName: string;
    businessName: string;
    accountNumber: string;
    ifscCode: string;
    propertyId?: string | undefined;
    businessType?: "individual" | "proprietorship" | "partnership" | "llp" | "private_limited" | undefined;
}>;
export type OnboardOwnerDto = z.infer<typeof onboardOwnerSchema>;
export declare const queryPayoutAccountsSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    propertyId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        PENDING: "PENDING";
        ACTIVE: "ACTIVE";
        SUSPENDED: "SUSPENDED";
        REJECTED: "REJECTED";
    }>>;
    kycStatus: z.ZodOptional<z.ZodNativeEnum<{
        PENDING: "PENDING";
        SUBMITTED: "SUBMITTED";
        VERIFIED: "VERIFIED";
        REJECTED: "REJECTED";
    }>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "ACTIVE" | "SUSPENDED" | "PENDING" | "REJECTED" | undefined;
    propertyId?: string | undefined;
    kycStatus?: "VERIFIED" | "PENDING" | "REJECTED" | "SUBMITTED" | undefined;
}, {
    search?: string | undefined;
    status?: "ACTIVE" | "SUSPENDED" | "PENDING" | "REJECTED" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
    kycStatus?: "VERIFIED" | "PENDING" | "REJECTED" | "SUBMITTED" | undefined;
}>;
export type QueryPayoutAccountsDto = z.infer<typeof queryPayoutAccountsSchema>;
