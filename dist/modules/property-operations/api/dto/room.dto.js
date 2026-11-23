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
    unitType: z.string().trim().default('Room'),
    gender: z.string().trim().default('UNISEX'),
    remarks: z.string().trim().optional(),
    lockInPeriod: z.string().trim().default('No Lock-in'),
    dailyStayMinPaise: z.coerce
        .number()
        .int()
        .nonnegative()
        .nullable()
        .optional(),
    dailyStayMaxPaise: z.coerce
        .number()
        .int()
        .nonnegative()
        .nullable()
        .optional(),
    areaSqft: z.coerce.number().int().positive().nullable().optional(),
    isDisabledForRent: z.boolean().default(false),
    isPublished: z.boolean().default(true),
    images: z.array(z.string()).default([]),
    isVerified: z.boolean().default(true),
    availableFrom: z
        .string()
        .datetime()
        .optional()
        .transform((v) => (v ? new Date(v) : undefined)),
    initialBedCount: z.coerce.number().int().min(1).max(20).optional(),
    bedNames: z.array(z.string()).optional(),
    bedRents: z.record(z.string(), z.number()).optional(),
});
export const updateRoomSchema = z.object({
    roomNumber: z.string().min(1).trim().optional(),
    floor: z.string().trim().optional(),
    sharingType: z.nativeEnum(SharingType).optional(),
    rentAmount: z.coerce.number().int().positive().optional(),
    status: z.nativeEnum(RoomStatus).optional(),
    amenities: z.array(z.string()).optional(),
    description: z.string().optional(),
    unitType: z.string().trim().optional(),
    gender: z.string().trim().optional(),
    remarks: z.string().trim().nullable().optional(),
    lockInPeriod: z.string().trim().optional(),
    dailyStayMinPaise: z.coerce
        .number()
        .int()
        .nonnegative()
        .nullable()
        .optional(),
    dailyStayMaxPaise: z.coerce
        .number()
        .int()
        .nonnegative()
        .nullable()
        .optional(),
    areaSqft: z.coerce.number().int().positive().nullable().optional(),
    isDisabledForRent: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    images: z.array(z.string()).optional(),
    isVerified: z.boolean().optional(),
    availableFrom: z
        .string()
        .datetime()
        .optional()
        .transform((v) => (v ? new Date(v) : undefined)),
});
export const createBedSchema = z.object({
    bedNumber: z.string().min(1, 'Bed number is required').trim(),
    rentAmount: z.coerce.number().int().positive().optional(),
    isDisabledForRent: z.boolean().default(false),
    remarks: z.string().trim().optional(),
});
export const updateBedSchema = z.object({
    bedNumber: z.string().min(1).trim().optional(),
    status: z.nativeEnum(BedStatus).optional(),
    rentAmount: z.coerce.number().int().positive().nullable().optional(),
    isDisabledForRent: z.boolean().optional(),
    remarks: z.string().trim().nullable().optional(),
});
export const queryRoomsSchema = z.object({
    search: z.string().trim().max(100).optional(),
    status: z.nativeEnum(RoomStatus).optional(),
    sharingType: z.nativeEnum(SharingType).optional(),
    gender: z.enum(['MALE', 'FEMALE', 'UNISEX']).optional(),
    floor: z.string().trim().max(30).optional(),
    unitType: z.string().trim().max(30).optional(),
    published: z.enum(['true', 'false']).optional(),
    vacancy: z.enum(['VACANT', 'FULL']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=room.dto.js.map