import { z } from 'zod';
export const calendarDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .refine((value) => {
    const date = new Date(value);
    return (Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === value &&
        value >= '1900-01-01' &&
        value <= '2100-12-31');
}, 'Enter a valid calendar date');
//# sourceMappingURL=date.js.map