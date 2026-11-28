import { z } from 'zod';
export const registerSchema = z.object({
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password is too long')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    firstName: z
        .string()
        .trim()
        .min(1, 'First name is required')
        .max(100, 'First name is too long'),
    lastName: z.string().trim().max(100, 'Last name is too long').optional(),
    organizationName: z
        .string()
        .trim()
        .min(2, 'Organization name must be at least 2 characters')
        .max(100, 'Organization name is too long')
        .optional(),
    mobile: z
        .string()
        .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number')
        .optional(),
});
export const refreshTokenSchema = z.object({
    organizationId: z.string().uuid().optional(),
    refreshToken: z.string().min(1, 'Refresh token is required'),
});
const indianMobileSchema = z
    .string()
    .trim()
    .transform((val) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91'))
        return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0'))
        return digits.slice(1);
    return digits;
})
    .refine((val) => /^[6-9]\d{9}$/.test(val), 'Please enter a valid 10-digit Indian mobile number');
const loginPassword = z.string().min(1, 'Password is required');
export const loginSchema = z.union([
    z.object({
        email: z.string().email('Invalid email address').toLowerCase().trim(),
        password: loginPassword,
    }),
    z.object({
        mobile: z.string().trim().regex(/^[+\d().\s-]+$/).pipe(indianMobileSchema),
        password: loginPassword,
    }),
]);
export const otpPurposeSchema = z.enum(['LOGIN', 'REGISTER']);
export const sendOtpSchema = z.object({
    mobile: indianMobileSchema,
    purpose: otpPurposeSchema,
    email: z
        .string()
        .email('Invalid email address')
        .toLowerCase()
        .trim()
        .optional(),
});
export const resendOtpSchema = z.object({
    mobile: indianMobileSchema,
    purpose: otpPurposeSchema,
});
export const otpLoginSchema = z.object({
    mobile: indianMobileSchema,
    otp: z
        .string()
        .trim()
        .regex(/^\d{4}$/, 'OTP must be a 4-digit code'),
});
export const otpRegisterSchema = z.object({
    mobile: indianMobileSchema,
    otp: z
        .string()
        .trim()
        .regex(/^\d{4}$/, 'OTP must be a 4-digit code'),
    firstName: z
        .string()
        .trim()
        .min(1, 'First name is required')
        .max(100, 'First name is too long'),
    lastName: z.string().trim().max(100, 'Last name is too long').optional(),
    email: z
        .string()
        .email('Invalid email address')
        .toLowerCase()
        .trim()
        .optional(),
    organizationName: z
        .string()
        .trim()
        .min(2, 'Organization name must be at least 2 characters')
        .max(100, 'Organization name is too long')
        .optional(),
});
//# sourceMappingURL=auth.dto.js.map