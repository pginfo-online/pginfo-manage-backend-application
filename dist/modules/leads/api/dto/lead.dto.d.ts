import { z } from 'zod';
export declare const createLeadSchema: z.ZodObject<{
    propertyId: z.ZodString;
    name: z.ZodString;
    mobile: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    budget: z.ZodOptional<z.ZodNumber>;
    sharingPreference: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    visitScheduledAt: z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>;
}, "strip", z.ZodTypeAny, {
    name: string;
    mobile: string;
    propertyId: string;
    email?: string | undefined;
    notes?: string | undefined;
    budget?: number | undefined;
    sharingPreference?: string | undefined;
    source?: string | undefined;
    visitScheduledAt?: Date | undefined;
}, {
    name: string;
    mobile: string;
    propertyId: string;
    email?: string | undefined;
    notes?: string | undefined;
    budget?: number | undefined;
    sharingPreference?: string | undefined;
    source?: string | undefined;
    visitScheduledAt?: string | undefined;
}>;
export type CreateLeadDto = z.infer<typeof createLeadSchema>;
export declare const updateLeadSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    mobile: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    budget: z.ZodOptional<z.ZodNumber>;
    sharingPreference: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        NEW: "NEW";
        CONTACTED: "CONTACTED";
        VISITED: "VISITED";
        TOKEN_PAID: "TOKEN_PAID";
        CONVERTED: "CONVERTED";
        LOST: "LOST";
    }>>;
    source: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    visitScheduledAt: z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>;
}, "strip", z.ZodTypeAny, {
    status?: "NEW" | "CONTACTED" | "VISITED" | "TOKEN_PAID" | "CONVERTED" | "LOST" | undefined;
    name?: string | undefined;
    email?: string | undefined;
    mobile?: string | undefined;
    notes?: string | undefined;
    budget?: number | undefined;
    sharingPreference?: string | undefined;
    source?: string | undefined;
    visitScheduledAt?: Date | undefined;
}, {
    status?: "NEW" | "CONTACTED" | "VISITED" | "TOKEN_PAID" | "CONVERTED" | "LOST" | undefined;
    name?: string | undefined;
    email?: string | undefined;
    mobile?: string | undefined;
    notes?: string | undefined;
    budget?: number | undefined;
    sharingPreference?: string | undefined;
    source?: string | undefined;
    visitScheduledAt?: string | undefined;
}>;
export type UpdateLeadDto = z.infer<typeof updateLeadSchema>;
export declare const queryLeadsSchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        NEW: "NEW";
        CONTACTED: "CONTACTED";
        VISITED: "VISITED";
        TOKEN_PAID: "TOKEN_PAID";
        CONVERTED: "CONVERTED";
        LOST: "LOST";
    }>>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "NEW" | "CONTACTED" | "VISITED" | "TOKEN_PAID" | "CONVERTED" | "LOST" | undefined;
    propertyId?: string | undefined;
}, {
    search?: string | undefined;
    status?: "NEW" | "CONTACTED" | "VISITED" | "TOKEN_PAID" | "CONVERTED" | "LOST" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
}>;
export type QueryLeadsDto = z.infer<typeof queryLeadsSchema>;
export declare const leadStatsQuerySchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    propertyId?: string | undefined;
}, {
    propertyId?: string | undefined;
}>;
export type LeadStatsQueryDto = z.infer<typeof leadStatsQuerySchema>;
