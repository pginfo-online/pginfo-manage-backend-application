import { z } from 'zod';
import { PaymentMode } from '@prisma/client';

export const createExpenseSchema = z.object({
  propertyId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.coerce
    .number()
    .int()
    .positive('Expense amount must be positive paise'),
  expenseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'expenseDate must be YYYY-MM-DD')
    .default(() => new Date().toISOString().slice(0, 10))
    .transform((d) => new Date(d)),
  paymentMode: z.nativeEnum(PaymentMode),
  paidBy: z.string().trim().optional(),
  paidTo: z.string().trim().optional(),
  description: z.string().min(1, 'Description is required').trim(),
  receiptUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.partial();
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;

export const createExpenseCategorySchema = z.object({
  name: z.string().min(2, 'Category name is required').trim(),
});

export type CreateExpenseCategoryDto = z.infer<
  typeof createExpenseCategorySchema
>;

export const queryExpensesSchema = z.object({
  propertyId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  paymentMode: z.nativeEnum(PaymentMode).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((d) => (d ? new Date(d) : undefined)),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((d) => (d ? new Date(d) : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryExpensesDto = z.infer<typeof queryExpensesSchema>;
