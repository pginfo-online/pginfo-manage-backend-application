import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .trim(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must contain only lowercase alphanumeric characters and hyphens',
    )
    .optional(),
});

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;

export const addMemberSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']).default('VIEWER'),
});

export type AddMemberDto = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']),
});

export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;
