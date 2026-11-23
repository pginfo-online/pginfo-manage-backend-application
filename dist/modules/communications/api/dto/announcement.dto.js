import { z } from 'zod';
import { AnnouncementScope, AnnouncementStatus } from '@prisma/client';
export const createAnnouncementSchema = z.object({
    propertyId: z.string().uuid().optional(),
    scope: z.nativeEnum(AnnouncementScope).default('ORGANIZATION'),
    title: z.string().min(2, 'Title is required').trim(),
    body: z.string().min(5, 'Body must be at least 5 characters').trim(),
    scheduledAt: z
        .string()
        .datetime()
        .optional()
        .transform((d) => (d ? new Date(d) : undefined)),
});
export const sendRentReminderSchema = z.object({
    residentIds: z.array(z.string().uuid()).min(1).max(100).optional(),
    residentId: z.string().uuid().optional(),
    propertyId: z.string().uuid().optional(),
    channel: z.enum(['WHATSAPP', 'EMAIL', 'BOTH']).default('BOTH'),
    kind: z.enum(['rent', 'autopay']).optional(),
});
export const queryAnnouncementsSchema = z.object({
    propertyId: z.string().uuid().optional(),
    status: z.nativeEnum(AnnouncementStatus).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=announcement.dto.js.map