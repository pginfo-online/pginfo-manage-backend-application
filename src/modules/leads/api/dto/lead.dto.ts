import { z } from 'zod';
import { LeadStatus } from '@prisma/client';

export const createLeadSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(2, 'Name is required').trim(),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
  email: z.string().email().optional(),
  budget: z.coerce.number().int().positive().optional(),
  sharingPreference: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  visitScheduledAt: z
    .string()
    .datetime()
    .optional()
    .transform((d) => (d ? new Date(d) : undefined)),
});

export type CreateLeadDto = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = z.object({
  name: z.string().min(2).trim().optional(),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  email: z.string().email().optional(),
  budget: z.coerce.number().int().positive().optional(),
  sharingPreference: z.string().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  visitScheduledAt: z
    .string()
    .datetime()
    .optional()
    .transform((d) => (d ? new Date(d) : undefined)),
});

export type UpdateLeadDto = z.infer<typeof updateLeadSchema>;

export const queryLeadsSchema = z.object({
  propertyId: z.string().uuid().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryLeadsDto = z.infer<typeof queryLeadsSchema>;
