import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayoutsController } from '../../src/modules/finance/api/payouts.controller.js';
import { MandatesController } from '../../src/modules/finance/api/mandates.controller.js';
import { InvoicesController } from '../../src/modules/finance/api/invoices.controller.js';

describe('Autopay Controllers (HTTP Endpoints)', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const tenantId = '00000000-0000-0000-0000-000000000010';
  const unitId = '00000000-0000-0000-0000-000000000030';

  let payoutsController: PayoutsController;
  let mandatesController: MandatesController;
  let invoicesController: InvoicesController;

  let mockPayoutsService: any;
  let mockMandatesService: any;
  let mockInvoicesService: any;

  beforeEach(() => {
    mockPayoutsService = {
      onboardOwner: vi.fn().mockResolvedValue({
        id: 'payout-1',
        accountId: 'acc_route_123',
        businessName: 'Sharma Properties',
        status: 'ACTIVE',
      }),
      queryPayoutAccounts: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      getActivePayoutAccount: vi.fn().mockResolvedValue({ id: 'payout-1' }),
    };

    mockMandatesService = {
      createMandate: vi.fn().mockResolvedValue({
        mandateId: 'mandate-1',
        subscriptionId: 'sub_123',
        shortUrl: 'https://rzp.io/i/test',
        rentAmountPaise: 2500000,
        rentAmountRupees: 25000,
        whatsappPayload: { to: '9876543210' },
        notificationSent: true,
      }),
      queryMandates: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      getMandate: vi.fn().mockResolvedValue({ id: 'mandate-1' }),
      cancelMandate: vi.fn().mockResolvedValue({ id: 'mandate-1', status: 'REVOKED' }),
    };

    mockInvoicesService = {
      getInvoice: vi.fn().mockResolvedValue({ id: 'inv-1', status: 'PAID' }),
      queryInvoices: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    };

    payoutsController = new PayoutsController(mockPayoutsService);
    mandatesController = new MandatesController(mockMandatesService);
    invoicesController = new InvoicesController(mockInvoicesService);
  });

  describe('PayoutsController', () => {
    it('POST /api/v1/payouts/onboard-owner invokes PayoutsService.onboardOwner', async () => {
      const dto = {
        ownerName: 'Ramesh Sharma',
        email: 'ramesh@example.com',
        phone: '9876543210',
        businessName: 'Sharma Properties',
        businessType: 'individual' as const,
        accountNumber: '123456789012',
        ifscCode: 'HDFC0001234',
      };

      const res = await payoutsController.onboardOwner(dto, orgId, userId);
      expect(mockPayoutsService.onboardOwner).toHaveBeenCalledWith(dto, orgId, userId);
      expect(res.accountId).toBe('acc_route_123');
    });
  });

  describe('MandatesController', () => {
    it('POST /api/v1/rent/mandates/create invokes MandatesService.createMandate', async () => {
      const dto = {
        tenantId,
        unitId,
        rentAmount: 2500000,
        billingDay: 5,
        tenureMonths: 11,
        mandateChannel: 'UPI' as const,
        sendWhatsAppNotification: true,
      };

      const res = await mandatesController.createMandate(dto, orgId, userId);
      expect(mockMandatesService.createMandate).toHaveBeenCalledWith(dto, orgId, userId);
      expect(res.subscriptionId).toBe('sub_123');
      expect(res.shortUrl).toBe('https://rzp.io/i/test');
    });

    it('POST /api/v1/rent/mandates/:id/cancel invokes MandatesService.cancelMandate', async () => {
      const res = await mandatesController.cancelMandate('mandate-1', orgId, userId);
      expect(mockMandatesService.cancelMandate).toHaveBeenCalledWith('mandate-1', orgId, userId);
      expect(res.status).toBe('REVOKED');
    });
  });

  describe('InvoicesController', () => {
    it('GET /api/v1/rent/invoices/:id invokes InvoicesService.getInvoice', async () => {
      const res = await invoicesController.getInvoice('inv-1', orgId);
      expect(mockInvoicesService.getInvoice).toHaveBeenCalledWith('inv-1', orgId);
      expect(res.status).toBe('PAID');
    });
  });
});
