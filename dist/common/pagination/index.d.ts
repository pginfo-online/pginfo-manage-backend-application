import { z } from 'zod';
export declare const cursorPaginationSchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    sortBy: string;
    sortOrder: "asc" | "desc";
    cursor?: string | undefined;
}, {
    limit?: number | undefined;
    cursor?: string | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type CursorPaginationQuery = z.infer<typeof cursorPaginationSchema>;
export declare const offsetPaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    sortBy: string;
    sortOrder: "asc" | "desc";
    page: number;
}, {
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    page?: number | undefined;
}>;
export type OffsetPaginationQuery = z.infer<typeof offsetPaginationSchema>;
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
export declare function buildCursorResponse<T extends {
    id: string;
}>(data: T[], total: number, limit: number): PaginatedResponse<T>;
export declare function buildOffsetResponse<T>(data: T[], total: number, page: number, limit: number): PaginatedResponse<T>;
