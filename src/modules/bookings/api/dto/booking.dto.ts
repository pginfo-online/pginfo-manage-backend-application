import { z } from 'zod';
import { BookingStatus, PaymentMode } from '@prisma/client';

export const createBookingSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
  bedId: z.string().uuid().optional(),
  guestName: z.string().min(2, 'Guest name is required').trim(),
  guestMobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
  guestEmail: z.string().email().optional(),
  tokenAmount: z.coerce.number().int().min(0).default(0), // paise
  expectedMoveIn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'expectedMoveIn must be YYYY-MM-DD')
    .transform((d) => new Date(d)),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((d) => (d ? new Date(d) : undefined)),
  notes: z.string().optional(),
  paymentMode: z.nativeEnum(PaymentMode).default('UPI'),
  paymentRef: z.string().optional(),
});

export type CreateBookingDto = z.infer<typeof createBookingSchema>;

export const queryBookingsSchema = z.object({
  propertyId: z.string().uuid().optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryBookingsDto = z.infer<typeof queryBookingsSchema>;
