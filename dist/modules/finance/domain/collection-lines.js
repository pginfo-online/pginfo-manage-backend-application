import { Prisma } from '@prisma/client';
export function confirmedCollectionLines(organizationId, propertyId) {
    const scope = propertyId
        ? Prisma.sql `AND COALESCE(b.property_id, p.capture_property_id, r.property_id) = ${propertyId}::uuid`
        : Prisma.empty;
    return Prisma.sql `
    SELECT COALESCE(a.amount - a.refunded_amount, p.amount - p.gateway_refunded_amount) AS amount,
      p.resident_id, p.collection_date, p.mode::text AS mode, p.status::text AS status, p.recorded_by,
      b.due_date, b.type::text AS category
    FROM payments p
    JOIN residents r ON r.id = p.resident_id
    LEFT JOIN payment_allocations a ON a.payment_id = p.id
    LEFT JOIN billing_records b ON b.id = COALESCE(a.billing_record_id, p.billing_record_id)
    WHERE p.organization_id = ${organizationId}::uuid AND p.status = 'CONFIRMED' ${scope}
  `;
}
export function paymentPropertyScope(propertyId) {
    if (!propertyId)
        return {};
    return {
        OR: [
            { capturePropertyId: propertyId },
            { capturePropertyId: null, billingRecord: { propertyId } },
            {
                capturePropertyId: null,
                billingRecordId: null,
                resident: { propertyId },
            },
        ],
    };
}
//# sourceMappingURL=collection-lines.js.map