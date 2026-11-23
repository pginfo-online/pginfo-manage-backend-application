import { z } from 'zod';
import { calendarDateSchema } from '../../../../common/validation/date.js';
import { PropertyType, PaymentMode } from '@prisma/client';
export const moneyCategories = [
    'Rent',
    'Deposit',
    'Electricity',
    'Water',
    'Internet',
    'Food',
    'Housekeeping',
    'Laundry',
    'Maintenance',
    'Repair',
    'Late Fine',
    'Damage Fine',
    'Key Charges',
    'Parking',
    'Common Areas',
    'KYC',
    'Agreement',
    'Move-out Charges',
];
export const moneyDate = calendarDateSchema;
const paise = z.number().int().positive().max(2147483647);
export const packageSchema = z
    .object({
    propertyType: z.nativeEnum(PropertyType),
    name: z.string().trim().min(2).max(100),
    category: z.enum(moneyCategories),
    billing: z.enum(['FIXED', 'VARIABLE']),
    amount: z.number().int().min(0).max(2147483647),
    description: z.string().trim().max(1000).default(''),
    isActive: z.boolean().default(true),
    version: z.number().int().positive().optional(),
})
    .refine((d) => d.billing !== 'FIXED' || d.amount > 0, 'Fixed packages require a positive amount');
export const moneyQuerySchema = z.object({
    propertyId: z.string().uuid().optional(),
    search: z.string().trim().max(100).default(''),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z
        .enum(['DATE_ASC', 'DATE_DESC', 'ROOM', 'AMOUNT_DESC', 'AMOUNT_ASC'])
        .default('DATE_ASC'),
    date: z
        .enum(['ALL', 'TODAY', 'YESTERDAY', '30_DAYS', '3_MONTHS', '6_MONTHS'])
        .default('ALL'),
    defaulter: z.enum(['ALL', 'RENT', 'OTHER']).default('ALL'),
    type: z
        .enum([
        'RENT',
        'SECURITY_DEPOSIT',
        'ELECTRICITY',
        'WIFI',
        'MAINTENANCE',
        'OTHER',
    ])
        .optional(),
    active: z.enum(['ALL', 'ACTIVE', 'DISABLED']).default('ACTIVE'),
    startDate: moneyDate.optional(),
    endDate: moneyDate.optional(),
    mode: z.nativeEnum(PaymentMode).optional(),
});
export const offerSchema = z
    .object({
    amount: paise,
    validTill: moneyDate,
    minimumPayment: z.enum(['FULL', 'CUSTOM']),
    minimumAmount: paise.optional(),
    description: z.string().trim().min(1).max(1000),
})
    .refine((d) => d.minimumPayment !== 'CUSTOM' || d.minimumAmount !== undefined, 'Enter a minimum payment');
export const moneyPaymentSchema = z
    .object({
    residentId: z.string().uuid(),
    amount: paise,
    mode: z
        .nativeEnum(PaymentMode)
        .refine((m) => m !== 'RAZORPAY', 'Use the online payment flow for Razorpay'),
    collectionDate: moneyDate,
    notes: z.string().trim().max(1000).optional(),
    proofUrl: z.string().url().max(2048).optional(),
    idempotencyKey: z.string().uuid(),
    allocations: z
        .array(z.object({ billingRecordId: z.string().uuid(), amount: paise }))
        .min(1)
        .max(100),
})
    .superRefine((d, ctx) => {
    if (d.allocations.reduce((s, a) => s + a.amount, 0) !== d.amount)
        ctx.addIssue({
            code: 'custom',
            message: 'Payment breakup must equal amount received',
        });
    if (new Set(d.allocations.map((a) => a.billingRecordId)).size !==
        d.allocations.length)
        ctx.addIssue({
            code: 'custom',
            message: 'Duplicate bill in payment breakup',
        });
});
export const remarkSchema = z.object({
    description: z.string().trim().min(1).max(2000),
});
export const partySchema = z.object({
    name: z.string().trim().min(1).max(100),
});
export const bankLinkSchema = z.object({
    propertyId: z.string().uuid().nullable(),
    version: z.number().int().positive().optional(),
});
//# sourceMappingURL=money.dto.js.map