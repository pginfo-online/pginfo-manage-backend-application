import { z } from 'zod';

export const createSubMeterSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID'),
  roomId: z.string().uuid('Invalid room ID').optional().nullable(),
  meterNumber: z.string().min(1, 'Meter number is required').max(50),
  tariffRate: z
    .number()
    .int()
    .positive('Tariff rate must be positive in paise')
    .default(1000),
  initialReading: z
    .number()
    .nonnegative('Initial reading must be non-negative')
    .default(0),
});

export type CreateSubMeterDto = z.infer<typeof createSubMeterSchema>;

export const recordReadingSchema = z.object({
  reading: z.number().positive('Reading must be a positive number'),
  readingDate: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  photoUrl: z.string().url().optional().nullable(),
});

export type RecordReadingDto = z.infer<typeof recordReadingSchema>;

export const queryMetersSchema = z.object({
  propertyId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type QueryMetersDto = z.infer<typeof queryMetersSchema>;
