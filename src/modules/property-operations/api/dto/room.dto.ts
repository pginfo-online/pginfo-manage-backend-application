import { z } from 'zod';
import { SharingType, RoomStatus, BedStatus } from '@prisma/client';

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required').trim(),
  floor: z.string().trim().default('0'),
  sharingType: z.nativeEnum(SharingType),
  rentAmount: z.coerce
    .number()
    .int()
    .positive('Rent amount must be positive paise'),
  amenities: z.array(z.string()).default([]),
  description: z.string().optional(),
  availableFrom: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  /**
   * If provided, automatically generates beds for this room.
   * e.g. ["A", "B"] or 2
   */
  initialBedCount: z.coerce.number().int().min(1).max(10).optional(),
});

export type CreateRoomDto = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = z.object({
  roomNumber: z.string().min(1).trim().optional(),
  floor: z.string().trim().optional(),
  sharingType: z.nativeEnum(SharingType).optional(),
  rentAmount: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(RoomStatus).optional(),
  amenities: z.array(z.string()).optional(),
  description: z.string().optional(),
  availableFrom: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

export type UpdateRoomDto = z.infer<typeof updateRoomSchema>;

export const createBedSchema = z.object({
  bedNumber: z.string().min(1, 'Bed number is required').trim(),
  rentAmount: z.coerce.number().int().positive().optional(),
});

export type CreateBedDto = z.infer<typeof createBedSchema>;

export const updateBedSchema = z.object({
  bedNumber: z.string().min(1).trim().optional(),
  status: z.nativeEnum(BedStatus).optional(),
  rentAmount: z.coerce.number().int().positive().nullable().optional(),
});

export type UpdateBedDto = z.infer<typeof updateBedSchema>;
