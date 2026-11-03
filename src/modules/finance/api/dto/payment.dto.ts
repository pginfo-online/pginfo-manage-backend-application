import { z } from 'zod';
import { PaymentMode, PaymentStatus } from '@prisma/client';

export const recordPaymentSchema = z.object({
  residentId: z.string().uuid(),
  billingRecordId: z.string().uuid().optional(),
  amount: z.coerce
    .number()
    .int()
    .positive('Payment amount must be positive paise'),
  mode: z.nativeEnum(PaymentMode),
  collectionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'collectionDate must be YYYY-MM-DD')
    .default(() => new Date().toISOString().slice(0, 10))
    .transform((d) => new Date(d)),
  reference: z.string().trim().optional(),
  notes: z.string().optional(),
  proofUrl: z.string().url().optional(),
  idempotencyKey: z.string().optional(),
});

export type RecordPaymentDto = z.infer<typeof recordPaymentSchema>;

export const createRazorpayOrderSchema = z.object({
  residentId: z.string().uuid(),
  billingRecordId: z.string().uuid().optional(),
  amount: z.coerce.number().int().positive('Amount in paise'),
});

export type CreateRazorpayOrderDto = z.infer<typeof createRazorpayOrderSchema>;

export const verifyRazorpayPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export type VerifyRazorpayPaymentDto = z.infer<
  typeof verifyRazorpayPaymentSchema
>;

export const queryPaymentsSchema = z.object({
  residentId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  mode: z.nativeEnum(PaymentMode).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryPaymentsDto = z.infer<typeof queryPaymentsSchema>;
