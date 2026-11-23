import { z } from 'zod';
import { RentInvoiceStatus, RentCollectionType } from '@prisma/client';
export const queryInvoicesSchema = z.object({
    tenantId: z.string().uuid().optional(),
    propertyId: z.string().uuid().optional(),
    mandateId: z.string().uuid().optional(),
    billingMonth: z.coerce.number().int().min(1).max(12).optional(),
    billingYear: z.coerce.number().int().min(2020).max(2100).optional(),
    status: z.nativeEnum(RentInvoiceStatus).optional(),
    collectionType: z.nativeEnum(RentCollectionType).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=invoice.dto.js.map