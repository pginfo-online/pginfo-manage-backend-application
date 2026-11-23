import { z } from 'zod';
export declare const dashboardQuerySchema: z.ZodEffects<z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    month: z.ZodOptional<z.ZodNumber>;
    year: z.ZodOptional<z.ZodNumber>;
    fy: z.ZodOptional<z.ZodEnum<["true"]>>;
}, "strip", z.ZodTypeAny, {
    year?: number | undefined;
    month?: number | undefined;
    propertyId?: string | undefined;
    fy?: "true" | undefined;
}, {
    year?: number | undefined;
    month?: number | undefined;
    propertyId?: string | undefined;
    fy?: "true" | undefined;
}>, {
    year?: number | undefined;
    month?: number | undefined;
    propertyId?: string | undefined;
    fy?: "true" | undefined;
}, {
    year?: number | undefined;
    month?: number | undefined;
    propertyId?: string | undefined;
    fy?: "true" | undefined;
}>;
export type DashboardQueryDto = z.infer<typeof dashboardQuerySchema>;
export declare const dashboardPropertiesQuerySchema: z.ZodObject<{
    search: z.ZodDefault<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    search: string;
    page: number;
}, {
    search?: string | undefined;
    page?: number | undefined;
}>;
export type DashboardPropertiesQueryDto = z.infer<typeof dashboardPropertiesQuerySchema>;
