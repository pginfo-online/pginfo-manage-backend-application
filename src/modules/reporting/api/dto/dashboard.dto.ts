import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const dashboardQuerySchema = z
  .object({
    propertyId: z.string().uuid().optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce
      .number()
      .int()
      .min(2000)
      .max(currentYear + 1)
      .optional(),
  })
  .refine((value) => (value.month == null) === (value.year == null), {
    message: 'month and year must be provided together',
  });

export type DashboardQueryDto = z.infer<typeof dashboardQuerySchema>;
