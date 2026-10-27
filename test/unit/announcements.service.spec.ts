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
          },
        ]),
      },
      announcement: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      billingRecord: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'bill-1',
            residentId: 'res-1',
            amount: 800000,
            paidAmount: 0,
            resident: {
              firstName: 'Aarav',
              mobile: '9876543210',
              email: 'aarav@test.com',
              property: { name: 'Sunshine PG' },
            },
          },
        ]),
      },
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
});
