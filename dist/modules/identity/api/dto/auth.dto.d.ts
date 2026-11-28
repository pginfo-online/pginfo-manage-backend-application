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
export declare const loginSchema: z.ZodUnion<[z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    email: string;
}, {
    password: string;
    email: string;
}>, z.ZodObject<{
    mobile: z.ZodPipeline<z.ZodString, z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    mobile: string;
}, {
    password: string;
    mobile: string;
}>]>;
export type LoginDto = z.infer<typeof loginSchema>;
export declare const otpPurposeSchema: z.ZodEnum<["LOGIN", "REGISTER"]>;
export declare const sendOtpSchema: z.ZodObject<{
    mobile: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    purpose: z.ZodEnum<["LOGIN", "REGISTER"]>;
    email: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mobile: string;
    purpose: "LOGIN" | "REGISTER";
    email?: string | undefined;
}, {
    mobile: string;
    purpose: "LOGIN" | "REGISTER";
    email?: string | undefined;
}>;
export type SendOtpDto = z.infer<typeof sendOtpSchema>;
export declare const resendOtpSchema: z.ZodObject<{
    mobile: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    purpose: z.ZodEnum<["LOGIN", "REGISTER"]>;
}, "strip", z.ZodTypeAny, {
    mobile: string;
    purpose: "LOGIN" | "REGISTER";
}, {
    mobile: string;
    purpose: "LOGIN" | "REGISTER";
}>;
export type ResendOtpDto = z.infer<typeof resendOtpSchema>;
export declare const otpLoginSchema: z.ZodObject<{
    mobile: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    otp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    mobile: string;
    otp: string;
}, {
    mobile: string;
    otp: string;
}>;
export type OtpLoginDto = z.infer<typeof otpLoginSchema>;
export declare const otpRegisterSchema: z.ZodObject<{
    mobile: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    otp: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    organizationName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mobile: string;
    firstName: string;
    otp: string;
    email?: string | undefined;
    lastName?: string | undefined;
    organizationName?: string | undefined;
}, {
    mobile: string;
    firstName: string;
    otp: string;
    email?: string | undefined;
    lastName?: string | undefined;
    organizationName?: string | undefined;
}>;
export type OtpRegisterDto = z.infer<typeof otpRegisterSchema>;
