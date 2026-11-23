import { z } from 'zod';
import { StaffStatus } from '@prisma/client';
export const createStaffSchema = z.object({
    propertyId: z.string().uuid(),
    designationId: z.string().uuid(),
    firstName: z.string().min(1, 'First name is required').trim(),
    lastName: z.string().trim().optional(),
    mobile: z
        .string()
        .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
    email: z.string().email().optional(),
    salary: z.coerce
        .number()
        .int()
        .positive('Salary must be positive paise')
        .optional(),
    joiningDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .transform((d) => (d ? new Date(d) : undefined)),
    notes: z.string().optional(),
});
export const updateStaffSchema = z.object({
    designationId: z.string().uuid().optional(),
    firstName: z.string().min(1).trim().optional(),
    lastName: z.string().trim().optional(),
    mobile: z
        .string()
        .regex(/^[6-9]\d{9}$/)
        .optional(),
    email: z.string().email().optional(),
    status: z.nativeEnum(StaffStatus).optional(),
    salary: z.coerce.number().int().positive().nullable().optional(),
    exitDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .transform((d) => (d ? new Date(d) : undefined)),
    notes: z.string().optional(),
});
export const createStaffDesignationSchema = z.object({
    name: z.string().min(2, 'Designation name is required').trim(),
});
export const queryStaffSchema = z.object({
    propertyId: z.string().uuid().optional(),
    designationId: z.string().uuid().optional(),
    status: z.nativeEnum(StaffStatus).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=staff.dto.js.map