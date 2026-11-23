import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodOptional<z.ZodString>;
    organizationName: z.ZodOptional<z.ZodString>;
    mobile: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    password: string;
    email: string;
    firstName: string;
    mobile?: string | undefined;
    lastName?: string | undefined;
    organizationName?: string | undefined;
}, {
    password: string;
    email: string;
    firstName: string;
    mobile?: string | undefined;
    lastName?: string | undefined;
    organizationName?: string | undefined;
}>;
export type RegisterDto = z.infer<typeof registerSchema>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    email: string;
}, {
    password: string;
    email: string;
}>;
export type LoginDto = z.infer<typeof loginSchema>;
export declare const refreshTokenSchema: z.ZodObject<{
    organizationId: z.ZodOptional<z.ZodString>;
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
    organizationId?: string | undefined;
}, {
    refreshToken: string;
    organizationId?: string | undefined;
}>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
