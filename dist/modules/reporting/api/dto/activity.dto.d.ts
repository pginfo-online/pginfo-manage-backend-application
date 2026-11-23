import { z } from 'zod';
export declare const activityQuerySchema: z.ZodObject<{
    entityType: z.ZodEnum<["Resident", "Room", "Property", "Payment", "Expense"]>;
    entityId: z.ZodString;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    entityType: "Property" | "Room" | "Resident" | "Payment" | "Expense";
    entityId: string;
    page: number;
}, {
    entityType: "Property" | "Room" | "Resident" | "Payment" | "Expense";
    entityId: string;
    limit?: number | undefined;
    page?: number | undefined;
}>;
export type ActivityQueryDto = z.infer<typeof activityQuerySchema>;
