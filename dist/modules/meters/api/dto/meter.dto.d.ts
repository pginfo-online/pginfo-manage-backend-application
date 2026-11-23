import { z } from 'zod';
export declare const createSubMeterSchema: z.ZodObject<{
    propertyId: z.ZodString;
    roomId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    meterNumber: z.ZodString;
    tariffRate: z.ZodDefault<z.ZodNumber>;
    initialReading: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    propertyId: string;
    meterNumber: string;
    tariffRate: number;
    initialReading: number;
    roomId?: string | null | undefined;
}, {
    propertyId: string;
    meterNumber: string;
    roomId?: string | null | undefined;
    tariffRate?: number | undefined;
    initialReading?: number | undefined;
}>;
export type CreateSubMeterDto = z.infer<typeof createSubMeterSchema>;
export declare const recordReadingSchema: z.ZodObject<{
    reading: z.ZodNumber;
    readingDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    photoUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    reading: number;
    readingDate?: string | undefined;
    photoUrl?: string | null | undefined;
}, {
    reading: number;
    readingDate?: string | undefined;
    photoUrl?: string | null | undefined;
}>;
export type RecordReadingDto = z.infer<typeof recordReadingSchema>;
export declare const queryMetersSchema: z.ZodObject<{
    propertyId: z.ZodOptional<z.ZodString>;
    roomId: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean | undefined;
    propertyId?: string | undefined;
    roomId?: string | undefined;
}, {
    isActive?: "true" | "false" | undefined;
    propertyId?: string | undefined;
    roomId?: string | undefined;
}>;
export type QueryMetersDto = z.infer<typeof queryMetersSchema>;
