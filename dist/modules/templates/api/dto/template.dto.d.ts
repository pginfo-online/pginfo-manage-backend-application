import { z } from 'zod';
export declare const createAgreementTemplateSchema: z.ZodObject<{
    propertyId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    name: z.ZodString;
    content: z.ZodString;
    isDefault: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    content: string;
    isDefault: boolean;
    propertyId?: string | null | undefined;
}, {
    name: string;
    content: string;
    propertyId?: string | null | undefined;
    isDefault?: boolean | undefined;
}>;
export type CreateAgreementTemplateDto = z.infer<typeof createAgreementTemplateSchema>;
export declare const updateAgreementTemplateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    content?: string | undefined;
    isDefault?: boolean | undefined;
}, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    content?: string | undefined;
    isDefault?: boolean | undefined;
}>;
export type UpdateAgreementTemplateDto = z.infer<typeof updateAgreementTemplateSchema>;
