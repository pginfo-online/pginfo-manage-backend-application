import { z } from 'zod';
export declare const createStaffSchema: z.ZodObject<{
    propertyId: z.ZodString;
    designationId: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodOptional<z.ZodString>;
    mobile: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    salary: z.ZodOptional<z.ZodNumber>;
    joiningDate: z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mobile: string;
    firstName: string;
    propertyId: string;
    designationId: string;
    email?: string | undefined;
    lastName?: string | undefined;
    joiningDate?: Date | undefined;
    notes?: string | undefined;
    salary?: number | undefined;
}, {
    mobile: string;
    firstName: string;
    propertyId: string;
    designationId: string;
    email?: string | undefined;
    lastName?: string | undefined;
    joiningDate?: string | undefined;
    notes?: string | undefined;
    salary?: number | undefined;
}>;
export type CreateStaffDto = z.infer<typeof createStaffSchema>;
export declare const updateStaffSchema: z.ZodObject<{
    designationId: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    mobile: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        ACTIVE: "ACTIVE";
        INACTIVE: "INACTIVE";
        TERMINATED: "TERMINATED";
    }>>;
    salary: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    exitDate: z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: "ACTIVE" | "INACTIVE" | "TERMINATED" | undefined;
    email?: string | undefined;
    mobile?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    notes?: string | undefined;
    designationId?: string | undefined;
    salary?: number | null | undefined;
    exitDate?: Date | undefined;
}, {
    status?: "ACTIVE" | "INACTIVE" | "TERMINATED" | undefined;
    email?: string | undefined;
    mobile?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    notes?: string | undefined;
    designationId?: string | undefined;
    salary?: number | null | undefined;
    exitDate?: string | undefined;
}>;
export type UpdateStaffDto = z.infer<typeof updateStaffSchema>;
export declare const createStaffDesignationSchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export type CreateStaffDesignationDto = z.infer<typeof createStaffDesignationSchema>;
export declare const queryStaffSchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    designationId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        ACTIVE: "ACTIVE";
        INACTIVE: "INACTIVE";
        TERMINATED: "TERMINATED";
    }>>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "ACTIVE" | "INACTIVE" | "TERMINATED" | undefined;
    propertyId?: string | undefined;
    designationId?: string | undefined;
}, {
    search?: string | undefined;
    status?: "ACTIVE" | "INACTIVE" | "TERMINATED" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
    designationId?: string | undefined;
}>;
export type QueryStaffDto = z.infer<typeof queryStaffSchema>;
