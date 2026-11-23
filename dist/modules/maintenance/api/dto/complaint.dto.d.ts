import { z } from 'zod';
export declare const createComplaintSchema: z.ZodObject<{
    propertyId: z.ZodString;
    categoryId: z.ZodString;
    roomId: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    urgency: z.ZodDefault<z.ZodNativeEnum<{
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
        CRITICAL: "CRITICAL";
    }>>;
    assignedTo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description: string;
    propertyId: string;
    categoryId: string;
    urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    roomId?: string | undefined;
    location?: string | undefined;
    assignedTo?: string | undefined;
}, {
    description: string;
    propertyId: string;
    categoryId: string;
    roomId?: string | undefined;
    location?: string | undefined;
    urgency?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
    assignedTo?: string | undefined;
}>;
export type CreateComplaintDto = z.infer<typeof createComplaintSchema>;
export declare const updateComplaintStatusSchema: z.ZodObject<{
    status: z.ZodNativeEnum<{
        RECEIVED: "RECEIVED";
        VERIFIED: "VERIFIED";
        NEED_MORE_TIME: "NEED_MORE_TIME";
        TEAM_WORKING: "TEAM_WORKING";
        PENDING: "PENDING";
        RESOLVED: "RESOLVED";
    }>;
    notes: z.ZodOptional<z.ZodString>;
    resolution: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "RECEIVED" | "VERIFIED" | "NEED_MORE_TIME" | "TEAM_WORKING" | "PENDING" | "RESOLVED";
    notes?: string | undefined;
    resolution?: string | undefined;
}, {
    status: "RECEIVED" | "VERIFIED" | "NEED_MORE_TIME" | "TEAM_WORKING" | "PENDING" | "RESOLVED";
    notes?: string | undefined;
    resolution?: string | undefined;
}>;
export type UpdateComplaintStatusDto = z.infer<typeof updateComplaintStatusSchema>;
export declare const assignComplaintSchema: z.ZodObject<{
    assignedTo: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    assignedTo: string;
    notes?: string | undefined;
}, {
    assignedTo: string;
    notes?: string | undefined;
}>;
export type AssignComplaintDto = z.infer<typeof assignComplaintSchema>;
export declare const addCommentSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
export type AddCommentDto = z.infer<typeof addCommentSchema>;
export declare const createComplaintCategorySchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export type CreateComplaintCategoryDto = z.infer<typeof createComplaintCategorySchema>;
export declare const queryComplaintsSchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        RECEIVED: "RECEIVED";
        VERIFIED: "VERIFIED";
        NEED_MORE_TIME: "NEED_MORE_TIME";
        TEAM_WORKING: "TEAM_WORKING";
        PENDING: "PENDING";
        RESOLVED: "RESOLVED";
    }>>;
    urgency: z.ZodOptional<z.ZodNativeEnum<{
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
        CRITICAL: "CRITICAL";
    }>>;
    assignedTo: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "RECEIVED" | "VERIFIED" | "NEED_MORE_TIME" | "TEAM_WORKING" | "PENDING" | "RESOLVED" | undefined;
    propertyId?: string | undefined;
    categoryId?: string | undefined;
    urgency?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
    assignedTo?: string | undefined;
}, {
    search?: string | undefined;
    status?: "RECEIVED" | "VERIFIED" | "NEED_MORE_TIME" | "TEAM_WORKING" | "PENDING" | "RESOLVED" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
    categoryId?: string | undefined;
    urgency?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
    assignedTo?: string | undefined;
}>;
export type QueryComplaintsDto = z.infer<typeof queryComplaintsSchema>;
