import { z } from 'zod';
export declare const createMandateSchema: z.ZodEffects<z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    tenant_id: z.ZodOptional<z.ZodString>;
    unitId: z.ZodOptional<z.ZodString>;
    unit_id: z.ZodOptional<z.ZodString>;
    rentAmount: z.ZodOptional<z.ZodNumber>;
    rent_amount: z.ZodOptional<z.ZodNumber>;
    billingDay: z.ZodOptional<z.ZodNumber>;
    billing_day: z.ZodOptional<z.ZodNumber>;
    tenureMonths: z.ZodOptional<z.ZodNumber>;
    tenure_months: z.ZodOptional<z.ZodNumber>;
    mandateChannel: z.ZodOptional<z.ZodNativeEnum<{
        UPI: "UPI";
        EMANDATE: "EMANDATE";
        CARD: "CARD";
    }>>;
    mandate_channel: z.ZodOptional<z.ZodNativeEnum<{
        UPI: "UPI";
        EMANDATE: "EMANDATE";
        CARD: "CARD";
    }>>;
    sendWhatsAppNotification: z.ZodEffects<z.ZodDefault<z.ZodUnion<[z.ZodBoolean, z.ZodEnum<["true", "false"]>]>>, boolean, boolean | "true" | "false" | undefined>;
}, "strip", z.ZodTypeAny, {
    sendWhatsAppNotification: boolean;
    rentAmount?: number | undefined;
    tenantId?: string | undefined;
    unitId?: string | undefined;
    mandateChannel?: "UPI" | "EMANDATE" | "CARD" | undefined;
    billingDay?: number | undefined;
    tenureMonths?: number | undefined;
    tenant_id?: string | undefined;
    unit_id?: string | undefined;
    rent_amount?: number | undefined;
    billing_day?: number | undefined;
    tenure_months?: number | undefined;
    mandate_channel?: "UPI" | "EMANDATE" | "CARD" | undefined;
}, {
    rentAmount?: number | undefined;
    tenantId?: string | undefined;
    unitId?: string | undefined;
    mandateChannel?: "UPI" | "EMANDATE" | "CARD" | undefined;
    billingDay?: number | undefined;
    tenureMonths?: number | undefined;
    tenant_id?: string | undefined;
    unit_id?: string | undefined;
    rent_amount?: number | undefined;
    billing_day?: number | undefined;
    tenure_months?: number | undefined;
    mandate_channel?: "UPI" | "EMANDATE" | "CARD" | undefined;
    sendWhatsAppNotification?: boolean | "true" | "false" | undefined;
}>, {
    tenantId: string;
    unitId: string | undefined;
    rentAmount: number;
    billingDay: number;
    tenureMonths: number;
    mandateChannel: "UPI" | "EMANDATE" | "CARD";
    sendWhatsAppNotification: boolean;
}, {
    rentAmount?: number | undefined;
    tenantId?: string | undefined;
    unitId?: string | undefined;
    mandateChannel?: "UPI" | "EMANDATE" | "CARD" | undefined;
    billingDay?: number | undefined;
    tenureMonths?: number | undefined;
    tenant_id?: string | undefined;
    unit_id?: string | undefined;
    rent_amount?: number | undefined;
    billing_day?: number | undefined;
    tenure_months?: number | undefined;
    mandate_channel?: "UPI" | "EMANDATE" | "CARD" | undefined;
    sendWhatsAppNotification?: boolean | "true" | "false" | undefined;
}>;
export type CreateMandateDto = z.infer<typeof createMandateSchema>;
export declare const queryMandatesSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    propertyId: z.ZodOptional<z.ZodString>;
    unitId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        CREATED: "CREATED";
        AUTHENTICATED: "AUTHENTICATED";
        ACTIVE: "ACTIVE";
        PENDING: "PENDING";
        PAUSED: "PAUSED";
        REVOKED: "REVOKED";
        COMPLETED: "COMPLETED";
        EXPIRED: "EXPIRED";
    }>>;
    collectionMode: z.ZodOptional<z.ZodNativeEnum<{
        AUTOPAY: "AUTOPAY";
        MANUAL_COLLECTION: "MANUAL_COLLECTION";
    }>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    status?: "ACTIVE" | "REVOKED" | "EXPIRED" | "PENDING" | "CREATED" | "AUTHENTICATED" | "PAUSED" | "COMPLETED" | undefined;
    propertyId?: string | undefined;
    collectionMode?: "AUTOPAY" | "MANUAL_COLLECTION" | undefined;
    tenantId?: string | undefined;
    unitId?: string | undefined;
}, {
    status?: "ACTIVE" | "REVOKED" | "EXPIRED" | "PENDING" | "CREATED" | "AUTHENTICATED" | "PAUSED" | "COMPLETED" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
    collectionMode?: "AUTOPAY" | "MANUAL_COLLECTION" | undefined;
    tenantId?: string | undefined;
    unitId?: string | undefined;
}>;
export type QueryMandatesDto = z.infer<typeof queryMandatesSchema>;
