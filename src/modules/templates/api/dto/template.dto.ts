import { z } from 'zod';

export const createAgreementTemplateSchema = z.object({
  propertyId: z.string().uuid().optional().nullable(),
  name: z.string().min(2, 'Template name is required').max(100),
  content: z.string().min(10, 'Template content must be at least 10 characters'),
  isDefault: z.boolean().default(false),
});

export type CreateAgreementTemplateDto = z.infer<typeof createAgreementTemplateSchema>;

export const updateAgreementTemplateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  content: z.string().min(10).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateAgreementTemplateDto = z.infer<typeof updateAgreementTemplateSchema>;
