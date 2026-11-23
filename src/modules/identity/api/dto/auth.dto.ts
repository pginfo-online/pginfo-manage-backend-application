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

export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  organizationId: z.string().uuid().optional(),
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
