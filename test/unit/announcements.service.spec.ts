import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnouncementsService } from '../../src/modules/communications/application/announcements.service.js';

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;
  let mockPrisma: any;
  let mockEmail: any;
  let mockWhatsApp: any;

  beforeEach(() => {
    mockPrisma = {
      property: {
        findFirst: vi.fn(),
      },
      resident: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'res-1',
            firstName: 'Aarav',
            mobile: '9876543210',
            email: 'aarav@test.com',
            sendWhatsappReminder: true,
          },
        ]),
      },
      announcement: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      billingRecord: {
        groupBy: vi
          .fn()
          .mockResolvedValue([
            { residentId: 'res-1', _sum: { amount: 800000, paidAmount: 0 } },
          ]),
      },
      tenantMandate: { findMany: vi.fn().mockResolvedValue([]) },
      auditLog: {
        create: vi.fn(),
      },
    };

    mockEmail = {
      send: vi.fn().mockResolvedValue({ success: true, messageId: 'm-1' }),
    };

    mockWhatsApp = {
      send: vi.fn().mockResolvedValue({ success: true, messageId: 'wa-1' }),
    };

    service = new AnnouncementsService(
      mockPrisma as any,
      mockEmail,
      mockWhatsApp,
    );
  });

  it('should dispatch announcement to active residents via WhatsApp and Email', async () => {
    mockPrisma.announcement.findFirst.mockResolvedValue({
      id: 'ann-1',
      title: 'Water Maintenance',
      body: 'No water between 2 PM to 5 PM today.',
      propertyId: null,
    });
    mockPrisma.announcement.update.mockResolvedValue({
      id: 'ann-1',
      status: 'SENT',
    });

    const result = await service.send('ann-1', 'org-1', 'user-1');
    expect(mockWhatsApp.send).toHaveBeenCalled();
    expect(mockEmail.send).toHaveBeenCalled();
    expect(result.deliveryStats.sentCount).toBe(1);
  });

  it('should send rent reminders to residents with pending dues', async () => {
    const result = await service.sendRentReminders(
      { channel: 'BOTH' },
      'org-1',
      'user-1',
    );

    expect(result.remindersSent).toBe(1);
    expect(result.totalRemindedPaise).toBe(800000);
    expect(mockWhatsApp.send).toHaveBeenCalled();
    expect(mockEmail.send).toHaveBeenCalled();
  });

  it('honors a tenant opting out of WhatsApp rent reminders', async () => {
    const residents = await mockPrisma.resident.findMany();
    residents[0].sendWhatsappReminder = false;
    await service.sendRentReminders({ channel: 'BOTH' }, 'org-1', 'user-1');
    expect(mockWhatsApp.send).not.toHaveBeenCalled();
    expect(mockEmail.send).toHaveBeenCalled();
  });

  it('uses the approved WhatsApp template with the saved mandate authorization link', async () => {
    const [resident] = await mockPrisma.resident.findMany();
    resident.propertyId = 'property-1';
    mockPrisma.tenantMandate.findMany.mockResolvedValue([
      {
        tenantId: resident.id,
        propertyId: resident.propertyId,
        shortUrl: 'https://rzp.io/test',
        rentAmount: 1200000,
        billingDay: 5,
        property: { name: 'Green Residency' },
        unit: { roomNumber: '204' },
      },
    ]);
    const result = await service.sendRentReminders(
      { channel: 'WHATSAPP', kind: 'autopay', residentId: resident.id },
      'org-1',
      'user-1',
    );
    expect(mockWhatsApp.send).toHaveBeenCalledWith(
      expect.objectContaining({
        templateName: 'rent_autopay_mandate_invite',
        templateParams: expect.objectContaining({
          auth_url: 'https://rzp.io/test',
          billing_day: '5th',
        }),
      }),
    );
    expect(result.whatsapp).toEqual({ accepted: 1, failed: 0, skipped: 0 });
    expect(result.whatsappMessageId).toBe('wa-1');
  });

  it('reports email acceptance separately when there is no pending mandate for WhatsApp', async () => {
    const result = await service.sendRentReminders(
      { channel: 'BOTH', kind: 'autopay', residentId: 'res-1' },
      'org-1',
      'user-1',
    );
    expect(mockWhatsApp.send).not.toHaveBeenCalled();
    expect(result.whatsapp).toEqual({ accepted: 0, failed: 0, skipped: 1 });
    expect(result.email.accepted).toBe(1);
    expect(result.missingMandates).toBe(1);
  });
});
