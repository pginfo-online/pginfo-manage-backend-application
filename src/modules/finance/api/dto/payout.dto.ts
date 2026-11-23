import { z } from 'zod';
import { PayoutAccountStatus, KycStatus } from '@prisma/client';

export const onboardOwnerSchema = z.object({
  ownerName: z
    .string()
    .trim()
    .min(2, 'Owner name must be at least 2 characters')
    .max(100),
  email: z.string().trim().email('Invalid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+91|91)?[6-9]\d{9}$/, 'Invalid Indian mobile number format'),
  businessName: z
    .string()
    .trim()
    .min(2, 'Business name must be at least 2 characters')
    .max(120),
  businessType: z
    .enum([
      'individual',
      'proprietorship',
      'partnership',
      'llp',
      'private_limited',
    ])
    .default('individual'),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{9,18}$/, 'Account number must be 9 to 18 digits'),
  ifscCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code (e.g. HDFC0001234)'),
  panNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN number')
    .optional(),
  routeTermsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Accept Razorpay Route terms to continue' }),
  }),
  propertyId: z.string().uuid().optional(),
});

export type OnboardOwnerDto = z.infer<typeof onboardOwnerSchema>;

export const queryPayoutAccountsSchema = z.object({
  search: z.string().trim().max(100).optional(),
  propertyId: z.string().uuid().optional(),
  status: z.nativeEnum(PayoutAccountStatus).optional(),
  kycStatus: z.nativeEnum(KycStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryPayoutAccountsDto = z.infer<typeof queryPayoutAccountsSchema>;
