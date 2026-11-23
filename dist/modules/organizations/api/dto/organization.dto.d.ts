import { z } from 'zod';
export declare const createOrganizationSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug?: string | undefined;
}, {
    name: string;
    slug?: string | undefined;
}>;
export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;
export declare const addMemberSchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["ADMIN", "MANAGER", "STAFF", "VIEWER"]>>;
}, "strip", z.ZodTypeAny, {
    role: "ADMIN" | "MANAGER" | "STAFF" | "VIEWER";
    email: string;
}, {
    email: string;
    role?: "ADMIN" | "MANAGER" | "STAFF" | "VIEWER" | undefined;
}>;
export type AddMemberDto = z.infer<typeof addMemberSchema>;
export declare const updateMemberRoleSchema: z.ZodObject<{
    role: z.ZodEnum<["ADMIN", "MANAGER", "STAFF", "VIEWER"]>;
}, "strip", z.ZodTypeAny, {
    role: "ADMIN" | "MANAGER" | "STAFF" | "VIEWER";
}, {
    role: "ADMIN" | "MANAGER" | "STAFF" | "VIEWER";
}>;
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;
