import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StaffService } from '../../src/modules/staff/application/staff.service.js';
import { NotFoundError } from '../../src/common/errors/index.js';

describe('StaffService', () => {
  let service: StaffService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      property: {
        findFirst: vi.fn(),
      },
      staffDesignation: {
        findFirst: vi.fn(),
      },
      staff: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    service = new StaffService(mockPrisma as any);
  });

  it('should throw NotFoundError if property not found in organization', async () => {
    mockPrisma.property.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          propertyId: 'prop-1',
          designationId: 'des-1',
          firstName: 'Ramesh',
          mobile: '9876543210',
          salary: 2500000,
        },
        'org-1',
        'user-1',
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it('should deactivate staff and record exit date', async () => {
    mockPrisma.staff.findFirst.mockResolvedValue({
      id: 'staff-1',
      organizationId: 'org-1',
    });
    mockPrisma.staff.update.mockResolvedValue({
      id: 'staff-1',
      status: 'INACTIVE',
    });

    const result = await service.deactivate('staff-1', 'org-1', 'user-1');
    expect(result.status).toBe('INACTIVE');
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });
});
