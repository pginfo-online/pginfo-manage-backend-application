import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AdminCommandService } from '../../src/modules/admin/application/admin-command.service.js';
import { AdminGovernanceService } from '../../src/modules/admin/application/admin-governance.service.js';
import { AdminQueryService } from '../../src/modules/admin/application/admin-query.service.js';

const actor = {
  id: 'admin-id',
  userId: '00000000-0000-4000-8000-000000000001',
  role: 'SUPER_ADMIN' as const,
  permissions: [] as any,
  email: 'admin@example.com',
};

describe('admin command safeguards', () => {
  it('does not permit forcing derived room occupancy', async () => {
    const service = new AdminCommandService({} as any, {} as any);
    await expect(
      service.updateRoomStatus(
        'room-id',
        { status: 'OCCUPIED', reason: 'Force occupied state' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks property archival while residents are active', async () => {
    const prisma = {
      property: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'property-id',
          organizationId: 'org-id',
          status: 'ACTIVE',
        }),
      },
      resident: { count: vi.fn().mockResolvedValue(2) },
    };
    const service = new AdminCommandService(prisma as any, {} as any);
    await expect(
      service.updatePropertyStatus(
        'property-id',
        { status: 'ARCHIVED', reason: 'Closing this property' },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('admin governance concurrency', () => {
  it('requires expectedVersion for existing settings', async () => {
    const prisma = {
      platformSetting: {
        findUnique: vi.fn().mockResolvedValue({ id: 'setting-id', version: 3 }),
      },
    };
    const service = new AdminGovernanceService(prisma as any, {} as any);
    await expect(
      service.upsertSetting(
        'payments.review_window',
        {
          value: { hours: 24 },
          isPublic: false,
          reason: 'Update review window',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('admin report exports', () => {
  it('neutralizes spreadsheet formulas in CSV fields', async () => {
    const service = new AdminQueryService({} as any);
    vi.spyOn(service, 'platformReport').mockResolvedValue({
      period: { from: new Date(), to: new Date() },
      organizations: [
        {
          id: 'organization-id',
          name: '=HYPERLINK("https://example.invalid")',
          slug: '+unsafe-slug',
          isActive: true,
          properties: 1,
          residents: 2,
          collections: 3,
          collectedPaise: 4,
          expensesPaise: 5,
          outstandingPaise: 6,
        },
      ],
    });

    const csv = await service.platformReportCsv({});

    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+unsafe-slug");
    expect(csv).not.toContain(',=HYPERLINK');
  });
});
