import { z } from 'zod';
export declare const createAnnouncementSchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    scope: z.ZodDefault<z.ZodNativeEnum<{
        ORGANIZATION: "ORGANIZATION";
        PROPERTY: "PROPERTY";
    }>>;
    title: z.ZodString;
    body: z.ZodString;
    scheduledAt: z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>;
}, "strip", z.ZodTypeAny, {
    body: string;
    scope: "ORGANIZATION" | "PROPERTY";
    title: string;
    propertyId?: string | undefined;
    scheduledAt?: Date | undefined;
}, {
    body: string;
    title: string;
    propertyId?: string | undefined;
    scope?: "ORGANIZATION" | "PROPERTY" | undefined;
    scheduledAt?: string | undefined;
}>;
export type CreateAnnouncementDto = z.infer<typeof createAnnouncementSchema>;
export declare const sendRentReminderSchema: z.ZodObject<{
    residentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    residentId: z.ZodOptional<z.ZodString>;
    propertyId: z.ZodOptional<z.ZodString>;
    channel: z.ZodDefault<z.ZodEnum<["WHATSAPP", "EMAIL", "BOTH"]>>;
    kind: z.ZodOptional<z.ZodEnum<["rent", "autopay"]>>;
}, "strip", z.ZodTypeAny, {
    channel: "WHATSAPP" | "EMAIL" | "BOTH";
    propertyId?: string | undefined;
    residentId?: string | undefined;
    residentIds?: string[] | undefined;
    kind?: "rent" | "autopay" | undefined;
}, {
    propertyId?: string | undefined;
    residentId?: string | undefined;
    residentIds?: string[] | undefined;
    channel?: "WHATSAPP" | "EMAIL" | "BOTH" | undefined;
    kind?: "rent" | "autopay" | undefined;
}>;
export type SendRentReminderDto = z.infer<typeof sendRentReminderSchema>;
export declare const queryAnnouncementsSchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        DRAFT: "DRAFT";
        SCHEDULED: "SCHEDULED";
        SENDING: "SENDING";
        SENT: "SENT";
        FAILED: "FAILED";
    }>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    status?: "FAILED" | "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | undefined;
    propertyId?: string | undefined;
}, {
    status?: "FAILED" | "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
}>;
export type QueryAnnouncementsDto = z.infer<typeof queryAnnouncementsSchema>;
