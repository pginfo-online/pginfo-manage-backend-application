import { AdminCasePriority, AdminCaseStatus, AdminCaseType, BedStatus, KycStatus, PlatformAdminStatus, PlatformRole, PropertyStatus, RoomStatus, } from '@prisma/client';
import { z } from 'zod';
import { PLATFORM_PERMISSIONS } from '../../domain/admin-permissions.js';
const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);
const search = z.string().trim().max(200).optional();
const uuid = z.string().uuid();
const reason = z.string().trim().min(5).max(1000);
const optionalBoolean = z.preprocess((value) => {
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    return value;
}, z.boolean().optional());
export const adminDashboardQuerySchema = z
    .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    organizationId: uuid.optional(),
})
    .superRefine((value, context) => {
    if (value.from && value.to && value.from > value.to) {
        context.addIssue({
            code: 'custom',
            message: 'from must be before or equal to to',
            path: ['from'],
        });
    }
});
export const adminListQuerySchema = z.object({ page, limit, search });
export const adminUsersQuerySchema = adminListQuerySchema.extend({
    isActive: optionalBoolean,
    organizationId: uuid.optional(),
});
export const adminOrganizationsQuerySchema = adminListQuerySchema.extend({
    isActive: optionalBoolean,
});
export const adminPropertiesQuerySchema = adminListQuerySchema.extend({
    organizationId: uuid.optional(),
    status: z.nativeEnum(PropertyStatus).optional(),
});
export const adminInventoryQuerySchema = adminListQuerySchema.extend({
    organizationId: uuid.optional(),
    propertyId: uuid.optional(),
    roomStatus: z.nativeEnum(RoomStatus).optional(),
    bedStatus: z.nativeEnum(BedStatus).optional(),
});
export const adminResidentsQuerySchema = adminListQuerySchema.extend({
    organizationId: uuid.optional(),
    propertyId: uuid.optional(),
    status: z
        .enum([
        'PENDING_MOVE_IN',
        'ACTIVE',
        'NOTICE_PERIOD',
        'MOVED_OUT',
        'ARCHIVED',
    ])
        .optional(),
});
export const adminBookingsQuerySchema = adminListQuerySchema.extend({
    organizationId: uuid.optional(),
    propertyId: uuid.optional(),
    status: z
        .enum(['CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'EXPIRED'])
        .optional(),
});
export const adminComplaintsQuerySchema = adminListQuerySchema.extend({
    organizationId: uuid.optional(),
    propertyId: uuid.optional(),
    status: z
        .enum([
        'RECEIVED',
        'VERIFIED',
        'NEED_MORE_TIME',
        'TEAM_WORKING',
        'PENDING',
        'RESOLVED',
    ])
        .optional(),
    urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});
export const adminAnnouncementsQuerySchema = adminListQuerySchema.extend({
    organizationId: uuid.optional(),
    propertyId: uuid.optional(),
    status: z
        .enum(['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED'])
        .optional(),
});
export const adminPaymentsQuerySchema = adminListQuerySchema.extend({
    organizationId: uuid.optional(),
    status: z
        .enum(['PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED', 'DISPUTED'])
        .optional(),
    mode: z
        .enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'RAZORPAY', 'OTHER'])
        .optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
});
export const adminPayoutsQuerySchema = adminListQuerySchema.extend({
    organizationId: uuid.optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED']).optional(),
    kycStatus: z.nativeEnum(KycStatus).optional(),
});
export const adminPendingQuerySchema = z.object({
    organizationId: uuid.optional(),
});
export const adminAuditQuerySchema = adminListQuerySchema.extend({
    organizationId: uuid.optional(),
    userId: uuid.optional(),
    action: z.string().trim().max(200).optional(),
    entityType: z.string().trim().max(100).optional(),
    entityId: z.string().trim().max(100).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
});
export const adminCasesQuerySchema = adminListQuerySchema.extend({
    type: z.nativeEnum(AdminCaseType).optional(),
    status: z.nativeEnum(AdminCaseStatus).optional(),
    priority: z.nativeEnum(AdminCasePriority).optional(),
    organizationId: uuid.optional(),
    assignedToUserId: uuid.optional(),
});
export const createPlatformAdminSchema = z.object({
    email: z.string().email().toLowerCase().trim(),
    role: z.nativeEnum(PlatformRole),
    permissionOverrides: z
        .array(z.enum(PLATFORM_PERMISSIONS))
        .max(30)
        .default([]),
});
export const updatePlatformAdminSchema = z
    .object({
    role: z.nativeEnum(PlatformRole).optional(),
    status: z.nativeEnum(PlatformAdminStatus).optional(),
    permissionOverrides: z
        .array(z.enum(PLATFORM_PERMISSIONS))
        .max(30)
        .optional(),
    reason,
})
    .refine((value) => value.role !== undefined ||
    value.status !== undefined ||
    value.permissionOverrides !== undefined, 'At least one admin field must be changed');
export const updateUserStatusSchema = z.object({
    isActive: z.boolean(),
    reason,
});
export const updateOrganizationStatusSchema = z.object({
    isActive: z.boolean(),
    reason,
});
export const updatePropertyStatusSchema = z.object({
    status: z.nativeEnum(PropertyStatus),
    reason,
});
export const updateRoomStatusSchema = z.object({
    status: z.nativeEnum(RoomStatus),
    reason,
});
export const updateBedStatusSchema = z.object({
    status: z.nativeEnum(BedStatus),
    reason,
});
export const reviewPayoutSchema = z
    .object({
    kycStatus: z.nativeEnum(KycStatus),
    status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED']).optional(),
    reason,
})
    .superRefine((value, context) => {
    if (value.kycStatus === 'VERIFIED' && value.status === 'REJECTED') {
        context.addIssue({
            code: 'custom',
            message: 'A verified payout account cannot be rejected',
            path: ['status'],
        });
    }
});
export const createAdminCaseSchema = z.object({
    type: z.nativeEnum(AdminCaseType),
    priority: z.nativeEnum(AdminCasePriority).default('MEDIUM'),
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(5000).optional(),
    organizationId: uuid.optional(),
    targetType: z.string().trim().min(2).max(100).optional(),
    targetId: z.string().trim().min(1).max(100).optional(),
    assignedToUserId: uuid.optional(),
    evidence: z.record(z.string(), z.unknown()).optional(),
    idempotencyKey: z.string().trim().min(8).max(200).optional(),
    dueAt: z.coerce.date().optional(),
});
export const updateAdminCaseSchema = z.object({
    status: z.nativeEnum(AdminCaseStatus).optional(),
    priority: z.nativeEnum(AdminCasePriority).optional(),
    assignedToUserId: uuid.nullable().optional(),
    resolution: z.string().trim().min(5).max(5000).optional(),
    evidence: z.record(z.string(), z.unknown()).optional(),
    dueAt: z.coerce.date().nullable().optional(),
    reason,
});
export const upsertPlatformSettingSchema = z.object({
    value: z.unknown(),
    description: z.string().trim().max(1000).optional(),
    isPublic: z.boolean().default(false),
    expectedVersion: z.number().int().positive().optional(),
    reason,
});
//# sourceMappingURL=admin.dto.js.map