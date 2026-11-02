import { z } from 'zod';
import { MandateStatus, MandateChannel, MandateCollectionMode } from '@prisma/client';

export const createMandateSchema = z
  .object({
    // Support both camelCase and snake_case from user requests
    tenantId: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    unitId: z.string().uuid().optional(),
    unit_id: z.string().uuid().optional(),
    rentAmount: z.coerce.number().int().positive().optional(),
    rent_amount: z.coerce.number().int().positive().optional(),
    billingDay: z.coerce.number().int().min(1).max(28).optional(),
    billing_day: z.coerce.number().int().min(1).max(28).optional(),
    tenureMonths: z.coerce.number().int().min(1).max(36).optional(),
    tenure_months: z.coerce.number().int().min(1).max(36).optional(),
    mandateChannel: z.nativeEnum(MandateChannel).optional(),
    mandate_channel: z.nativeEnum(MandateChannel).optional(),
    sendWhatsAppNotification: z.coerce.boolean().default(true),
  })
  .transform((data) => {
    const tenantId = data.tenantId ?? data.tenant_id;
    if (!tenantId) {
      throw new Error('tenant_id or tenantId is required');
    }
    const rentAmount = data.rentAmount ?? data.rent_amount;
    if (!rentAmount) {
      throw new Error('rent_amount or rentAmount is required');
    }

    return {
      tenantId,
      unitId: data.unitId ?? data.unit_id,
      rentAmount,
      billingDay: data.billingDay ?? data.billing_day ?? 5,
      tenureMonths: data.tenureMonths ?? data.tenure_months ?? 11,
      mandateChannel: data.mandateChannel ?? data.mandate_channel ?? 'UPI',
      sendWhatsAppNotification: data.sendWhatsAppNotification,
    };
  });

export type CreateMandateDto = z.infer<typeof createMandateSchema>;

export const queryMandatesSchema = z.object({
  tenantId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  status: z.nativeEnum(MandateStatus).optional(),
  collectionMode: z.nativeEnum(MandateCollectionMode).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryMandatesDto = z.infer<typeof queryMandatesSchema>;
