import { z } from 'zod';
import { BillingType, BillingStatus } from '@prisma/client';

export const createChargeSchema = z.object({
  residentId: z.string().uuid(),
  type: z.nativeEnum(BillingType),
  amount: z.coerce
    .number()
    .int()
    .positive('Charge amount must be positive paise'),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD')
    .transform((d) => new Date(d)),
  description: z.string().min(1, 'Description is required').trim(),
  periodStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((d) => (d ? new Date(d) : undefined)),
  periodEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((d) => (d ? new Date(d) : undefined)),
});

export type CreateChargeDto = z.infer<typeof createChargeSchema>;

export const generateMonthlyDuesSchema = z.object({
  propertyId: z.string().uuid().optional(),
  billingMonth: z.coerce.number().int().min(1).max(12),
  billingYear: z.coerce.number().int().min(2020).max(2100),
});

export type GenerateMonthlyDuesDto = z.infer<typeof generateMonthlyDuesSchema>;

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

export type QueryBillingDto = z.infer<typeof queryBillingSchema>;
