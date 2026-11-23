import { z } from 'zod';
export const activityQuerySchema = z.object({
    entityType: z.enum(['Resident', 'Room', 'Property', 'Payment', 'Expense']),
    entityId: z.string().uuid(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=activity.dto.js.map