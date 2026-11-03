import { z } from 'zod';
import { ResidentStatus, Profession } from '@prisma/client';

export const createResidentSchema = z.object({
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
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryResidentsDto = z.infer<typeof queryResidentsSchema>;
