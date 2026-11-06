import { Monetary } from './monetary.js';

export function buildAutopayInvite(
  tenant: {
    firstName: string;
    mobile: string;
    whatsappNumber: string | null;
    property: { name: string };
  },
  unitNumber: string,
  rentAmount: number,
  billingDay: number,
  authorizationUrl: string,
) {
  const suffix =
    billingDay >= 11 && billingDay <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[
          billingDay % 10
        ] ?? 'th');
  const params = {
    tenant_name: tenant.firstName,
    property_name: tenant.property.name,
    unit_number: unitNumber,
    rent_amount: Monetary.formatINR(rentAmount),
    billing_day: `${billingDay}${suffix}`,
    auth_url: authorizationUrl,
  };
  return {
    to: tenant.whatsappNumber || tenant.mobile,
    message:
      `Hello ${params.tenant_name}, your rent Autopay mandate for ${params.property_name} (Unit ${params.unit_number}) is ready. ` +
      `Monthly rent: ${params.rent_amount}. Billing day: ${params.billing_day} of each month. ` +
      `Authorize your UPI AutoPay or e-Mandate using this link: ${authorizationUrl}. ` +
      'Please open the link to approve the mandate. Thank you.',
    template: 'rent_autopay_mandate_invite',
    templateParams: params,
    authorizationUrl,
  };
}
