import { z } from 'zod';
import { PropertyType, PropertyStatus } from '@prisma/client';

export const createPropertySchema = z.object({
  name: z.string().min(2, 'Property name is required').trim(),
  type: z.nativeEnum(PropertyType),
  addressLine1: z.string().min(3, 'Address line 1 is required').trim(),
  addressLine2: z.string().trim().optional(),
  city: z.string().min(2, 'City is required').trim(),
  state: z.string().min(2, 'State is required').trim(),
  pincode: z
    .string()
    .regex(/^[1-9][0-9]{5}$/, 'Please enter a valid 6-digit Indian PIN code'),
  country: z.string().length(2).default('IN'),
  contactPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number')
    .optional(),
  contactEmail: z.string().email().optional(),
  timezone: z.string().default('Asia/Kolkata'),
  rentDueDay: z.coerce.number().int().min(1).max(28).default(1),
  description: z.string().optional(),
  amenities: z.array(z.string()).default([]),
  totalFloors: z.coerce.number().int().min(1).optional(),
});

export type CreatePropertyDto = z.infer<typeof createPropertySchema>;

export const updatePropertySchema = createPropertySchema.partial().extend({
  status: z.nativeEnum(PropertyStatus).optional(),
});

export type UpdatePropertyDto = z.infer<typeof updatePropertySchema>;

export const queryPropertiesSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(PropertyStatus).optional(),
  type: z.nativeEnum(PropertyType).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryPropertiesDto = z.infer<typeof queryPropertiesSchema>;
