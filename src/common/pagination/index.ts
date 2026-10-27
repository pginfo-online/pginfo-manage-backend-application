import { z } from 'zod';

/**
 * Cursor-based pagination query schema.
 * Used for large, frequently updated collections.
 */
export const cursorPaginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CursorPaginationQuery = z.infer<typeof cursorPaginationSchema>;

/**
 * Offset-based pagination for simpler use cases (small collections).
 */
export const offsetPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type OffsetPaginationQuery = z.infer<typeof offsetPaginationSchema>;

/**
 * Paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
    page?: number;
    totalPages?: number;
  };
}

/**
 * Build a cursor-based paginated response.
 */
export function buildCursorResponse<T extends { id: string }>(
  data: T[],
  total: number,
  limit: number,
): PaginatedResponse<T> {
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

/**
 * Build an offset-based paginated response.
 */
export function buildOffsetResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
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
