export declare function buildAutopayInvite(tenant: {
    firstName: string;
    mobile: string;
    whatsappNumber: string | null;
    property: {
        name: string;
    };
}, unitNumber: string, rentAmount: number, billingDay: number, authorizationUrl: string): {
    to: string;
    message: string;
    template: string;
    templateParams: {
        tenant_name: string;
        property_name: string;
        unit_number: string;
        rent_amount: string;
        billing_day: string;
        auth_url: string;
    };
    authorizationUrl: string;
};
