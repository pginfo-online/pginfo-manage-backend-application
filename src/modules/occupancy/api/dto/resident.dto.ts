import { z } from 'zod';
import {
  ResidentStatus,
  Profession,
  BillingType,
  PaymentMode,
} from '@prisma/client';

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, 'Enter a valid calendar date')
  .transform((value) => new Date(value));
const openingBalanceSchema = z
  .object({
    type: z.nativeEnum(BillingType).default('OTHER'),
    amount: z.number().int().min(0),
    dueDate: dateOnly,
    dueEndDate: dateOnly.optional(),
    attachmentUrls: z.array(z.string().url()).max(5).default([]),
    description: z.string().trim().max(500).optional(),
    collectedAmount: z.number().int().min(0).default(0),
    collectionDate: dateOnly.optional(),
    collectionMode: z.nativeEnum(PaymentMode).default('OTHER'),
  })
  .refine((value) => value.amount > 0 || value.collectedAmount > 0, {
    message: 'Enter a due or collection amount',
  })
  .refine(
    (value) => value.amount === 0 || value.collectedAmount <= value.amount,
    {
      message: 'Collection cannot exceed this due',
    },
  );

export const createResidentSchema = z.object({
  onboardingKey: z.string().uuid().optional(),
  propertyId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
  bedId: z.string().uuid().optional(),
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().trim().optional(),
  email: z.string().email().optional(),
  mobile: z
    .string()
    .regex(
      /^[6-9]\d{9}$/,
      'Please enter a valid 10-digit Indian mobile number',
    ),
  whatsappNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  alternatePhone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  sendWhatsappReminder: z.boolean().optional(),
  emergencyContact: z.string().optional(),
  permanentAddress: z.string().trim().optional(),
  parentName: z.string().trim().optional(),
  parentPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  idProofUrl: z.string().url().optional(),
  agreementUrl: z.string().url().optional(),
  profession: z.nativeEnum(Profession).default('OTHER'),
  stayType: z.enum(['LONG_TERM', 'SHORT_TERM']).optional(),
  tenantType: z
    .enum([
      'STUDENT',
      'PROFESSIONAL',
      'BACHELOR',
      'FAMILY',
      'COUPLE',
      'STAFF',
      'OTHER',
    ])
    .optional(),
  noticePeriodDays: z.number().int().min(0).max(365).optional(),
  agreementPeriodMonths: z.number().int().min(1).max(120).optional(),
  openingBalances: z.array(openingBalanceSchema).max(20).optional(),
  monthlyRent: z.coerce
    .number()
    .int()
    .positive('Monthly rent must be positive paise'),
  securityDeposit: z.coerce.number().int().min(0).default(0),
  joiningDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'joiningDate must be YYYY-MM-DD')
    .transform((d) => new Date(d)),
  moveInDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((d) => (d ? new Date(d) : undefined)),
  expectedVacatingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((d) => (d ? new Date(d) : undefined)),
  lockInEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((d) => (d ? new Date(d) : undefined)),
  rentDueDay: z.coerce.number().int().min(1).max(28).optional(),
  notes: z.string().optional(),
});

export type CreateResidentDto = z.infer<typeof createResidentSchema>;

export const updateResidentSchema = z.object({
  firstName: z.string().min(1).trim().optional(),
  lastName: z.string().trim().optional(),
  email: z.string().email().optional(),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  whatsappNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  alternatePhone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  sendWhatsappReminder: z.boolean().optional(),
  stayType: z.enum(['LONG_TERM', 'SHORT_TERM']).optional(),
  tenantType: z
    .enum([
      'STUDENT',
      'PROFESSIONAL',
      'BACHELOR',
      'FAMILY',
      'COUPLE',
      'STAFF',
      'OTHER',
    ])
    .optional(),
  noticePeriodDays: z.number().int().min(0).max(365).optional(),
  agreementPeriodMonths: z.number().int().min(1).max(120).optional(),
  emergencyContact: z.string().optional(),
  permanentAddress: z.string().trim().optional(),
  parentName: z.string().trim().optional(),
  parentPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  idProofUrl: z.string().url().optional(),
  agreementUrl: z.string().url().optional(),
  profession: z.nativeEnum(Profession).optional(),
  monthlyRent: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(ResidentStatus).optional(),
  expectedVacatingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((d) => (d ? new Date(d) : undefined)),
  lockInEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((d) => (d ? new Date(d) : undefined)),
  rentDueDay: z.coerce.number().int().min(1).max(28).optional(),
  notes: z.string().optional(),
});

export type UpdateResidentDto = z.infer<typeof updateResidentSchema>;

export const reallocateResidentSchema = z.object({
  propertyId: z.string().uuid().optional(),
  roomId: z.string().uuid(),
  bedId: z.string().uuid().optional(),
  newRentAmount: z.coerce.number().int().positive().optional(),
  reason: z.string().default('room_change'),
});

export type ReallocateResidentDto = z.infer<typeof reallocateResidentSchema>;

export const swapBedsSchema = z.object({
  residentOneId: z.string().uuid(),
  residentTwoId: z.string().uuid(),
  reason: z.string().default('bed_swap'),
});

export type SwapBedsDto = z.infer<typeof swapBedsSchema>;

export const moveOutSchema = z.object({
  moveOutDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .default(() => new Date().toISOString().slice(0, 10))
    .transform((d) => new Date(d)),
  notes: z.string().optional(),
});

export type MoveOutDto = z.infer<typeof moveOutSchema>;

export const queryResidentsSchema = z.object({
  propertyId: z.string().uuid().optional(),
  status: z.nativeEnum(ResidentStatus).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryResidentsDto = z.infer<typeof queryResidentsSchema>;

export const noticeSchema = z.object({
  date: dateOnly,
  reason: z.string().trim().min(1).max(1000),
});
export type NoticeDto = z.infer<typeof noticeSchema>;

export const bulkMoveOutSchema = moveOutSchema.extend({
  residentIds: z
    .array(z.string().uuid())
    .min(1)
    .max(50)
    .transform((ids) => [...new Set(ids)].sort()),
  archive: z.boolean().default(false),
});
export type BulkMoveOutDto = z.infer<typeof bulkMoveOutSchema>;
