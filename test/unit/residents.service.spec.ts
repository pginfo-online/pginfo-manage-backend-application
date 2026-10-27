import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResidentsService } from '../../src/modules/occupancy/application/residents.service.js';
import { ConflictError, NotFoundError } from '../../src/common/errors/index.js';

describe('ResidentsService', () => {
  let service: ResidentsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      property: {
        findFirst: vi.fn(),
      },
      bed: {
        findFirst: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      room: {
        update: vi.fn(),
      },
      resident: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      occupancyRecord: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
      billingRecord: {
        create: vi.fn(),
        aggregate: vi.fn().mockResolvedValue({
          _sum: {
            amount: 500000, // 5000 INR
            paidAmount: 200000, // 2000 INR
          },
        }),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    service = new ResidentsService(mockPrisma as any);
  });

  it('should throw ConflictError when attempting to allocate an already occupied bed', async () => {
    mockPrisma.property.findFirst.mockResolvedValue({ id: 'prop-1' });
    mockPrisma.bed.findFirst.mockResolvedValue({
      id: 'bed-1',
      bedNumber: 'A',
      residents: [{ id: 'res-other', firstName: 'Rahul', status: 'ACTIVE' }],
    });

    await expect(
      service.create(
        {
          propertyId: 'prop-1',
          roomId: 'room-1',
          bedId: 'bed-1',
          firstName: 'Ankit',
          mobile: '9876543210',
          monthlyRent: 800000, // 8000 INR
          securityDeposit: 1000000,
          joiningDate: new Date('2026-11-01'),
          profession: 'WORKING_PROFESSIONAL',
        },
        'org-1',
        'user-1',
      ),
    ).rejects.toThrow(ConflictError);
  });

  it('should compute financial summary accurately for a resident', async () => {
    mockPrisma.resident.findFirst.mockResolvedValue({
      id: 'res-1',
      firstName: 'Ankit',
      monthlyRent: 800000,
      occupancyHistory: [],
    });

    const result = await service.findById('res-1', 'org-1');
    expect(result.financialSummary.totalBilled).toBe(500000);
    expect(result.financialSummary.totalPaid).toBe(200000);
    expect(result.financialSummary.outstandingBalance).toBe(300000);
  });

  it('should throw NotFoundError if resident not in organization', async () => {
    mockPrisma.resident.findFirst.mockResolvedValue(null);
    await expect(service.findById('nonexistent', 'org-1')).rejects.toThrow(
      NotFoundError,
    );
  });
});
