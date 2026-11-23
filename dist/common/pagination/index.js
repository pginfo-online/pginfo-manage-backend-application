import { z } from 'zod';
export const cursorPaginationSchema = z.object({
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
export const offsetPaginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
export function buildCursorResponse(data, total, limit) {
    const hasMore = data.length === limit;
    const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;
    return {
        data,
        meta: {
            total,
            limit,
            hasMore,
            nextCursor,
        },
    };
}
export function buildOffsetResponse(data, total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        data,
        meta: {
            total,
            limit,
            hasMore: page < totalPages,
            page,
            totalPages,
        },
    };
}
//# sourceMappingURL=index.js.map