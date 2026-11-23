import { z } from 'zod';
import { calendarDateSchema } from '../../../../common/validation/date.js';
import { BillingType, BillingStatus } from '@prisma/client';
export const createChargeSchema = z.object({
    residentId: z.string().uuid(),
    type: z.nativeEnum(BillingType),
    amount: z.coerce
        .number()
        .int()
        .positive('Charge amount must be positive paise')
        .max(2147483647),
    dueDate: calendarDateSchema.transform((d) => new Date(d)),
    description: z.string().min(1, 'Description is required').trim(),
    periodStart: calendarDateSchema
        .optional()
        .transform((d) => (d ? new Date(d) : undefined)),
    periodEnd: calendarDateSchema
        .optional()
        .transform((d) => (d ? new Date(d) : undefined)),
});
export const generateMonthlyDuesSchema = z.object({
    propertyId: z.string().uuid().optional(),
    billingMonth: z.coerce.number().int().min(1).max(12),
    billingYear: z.coerce.number().int().min(2020).max(2100),
});
export const queryBillingSchema = z.object({
    propertyId: z.string().uuid().optional(),
    residentId: z.string().uuid().optional(),
    type: z.nativeEnum(BillingType).optional(),
    status: z.nativeEnum(BillingStatus).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const discountSchema = z.object({
    amount: z.number().int().positive().max(2147483647),
    reason: z.string().trim().min(1).max(500),
});
//# sourceMappingURL=billing.dto.js.map