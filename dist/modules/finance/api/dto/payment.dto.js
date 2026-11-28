import { z } from 'zod';
import { calendarDateSchema } from '../../../../common/validation/date.js';
import { PaymentMode, PaymentStatus } from '@prisma/client';
import { moneyDate } from './money.dto.js';
export const recordPaymentSchema = z.object({
    residentId: z.string().uuid(),
    billingRecordId: z.string().uuid().optional(),
    amount: z.coerce
        .number()
        .int()
        .positive('Payment amount must be positive paise')
        .max(2147483647),
    mode: z
        .nativeEnum(PaymentMode)
        .refine((m) => m !== 'RAZORPAY', 'Use the verified gateway flow for online payments'),
    collectionDate: calendarDateSchema
        .default(() => new Date().toISOString().slice(0, 10))
        .transform((d) => new Date(d)),
    reference: z.string().trim().optional(),
    notes: z.string().optional(),
    proofUrl: z.string().url().optional(),
    idempotencyKey: z.string().optional(),
});
export const createRazorpayOrderSchema = z.object({
    residentId: z.string().uuid(),
    billingRecordId: z.string().uuid().optional(),
    amount: z.coerce.number().int().positive('Amount in paise').max(2147483647),
});
export const verifyRazorpayPaymentSchema = z.object({
    paymentId: z.string().uuid(),
    razorpayOrderId: z.string().regex(/^order_[A-Za-z0-9]+$/),
    razorpayPaymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/),
    razorpaySignature: z.string().regex(/^[a-fA-F0-9]{64}$/),
});
export const queryPaymentsSchema = z.object({
    startDate: moneyDate.optional(),
    endDate: moneyDate.optional(),
    residentId: z.string().uuid().optional(),
    propertyId: z.string().uuid().optional(),
    status: z.nativeEnum(PaymentStatus).optional(),
    mode: z.nativeEnum(PaymentMode).optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=payment.dto.js.map