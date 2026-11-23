import { z } from 'zod';
export declare const queryInvoicesSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    propertyId: z.ZodOptional<z.ZodString>;
    mandateId: z.ZodOptional<z.ZodString>;
    billingMonth: z.ZodOptional<z.ZodNumber>;
    billingYear: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        PENDING: "PENDING";
        PAID: "PAID";
        FAILED: "FAILED";
        CANCELLED: "CANCELLED";
    }>>;
    collectionType: z.ZodOptional<z.ZodNativeEnum<{
        AUTOPAY: "AUTOPAY";
        MANUAL_COLLECTION: "MANUAL_COLLECTION";
        FALLBACK_LINK: "FALLBACK_LINK";
    }>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    status?: "CANCELLED" | "PAID" | "PENDING" | "FAILED" | undefined;
    propertyId?: string | undefined;
    billingMonth?: number | undefined;
    billingYear?: number | undefined;
    tenantId?: string | undefined;
    collectionType?: "AUTOPAY" | "MANUAL_COLLECTION" | "FALLBACK_LINK" | undefined;
    mandateId?: string | undefined;
}, {
    status?: "CANCELLED" | "PAID" | "PENDING" | "FAILED" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
    billingMonth?: number | undefined;
    billingYear?: number | undefined;
    tenantId?: string | undefined;
    collectionType?: "AUTOPAY" | "MANUAL_COLLECTION" | "FALLBACK_LINK" | undefined;
    mandateId?: string | undefined;
}>;
export type QueryInvoicesDto = z.infer<typeof queryInvoicesSchema>;
