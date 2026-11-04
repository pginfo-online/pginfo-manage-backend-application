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
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        groupBy: vi.fn().mockResolvedValue([]),
        findMany: vi.fn().mockResolvedValue([]),
      },
      room: {
        findFirst: vi.fn().mockResolvedValue({ id: 'room-1' }),
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
        updateMany: vi.fn(),
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
      payment: { create: vi.fn() },
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    service = new ResidentsService(mockPrisma as any);
  });

  it('should throw ConflictError when attempting to allocate an already occupied bed', async () => {
    mockPrisma.property.findFirst.mockResolvedValue({ id: 'prop-1' });
    mockPrisma.bed.findFirst.mockResolvedValue({
      id: 'bed-1',
      roomId: 'room-1',
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

  it('creates opening dues and collections in the resident transaction', async () => {
    mockPrisma.property.findFirst.mockResolvedValue({
      id: 'prop-1',
      timezone: 'Asia/Kolkata',
      rentDueDay: 1,
    });
    mockPrisma.resident.create.mockResolvedValue({ id: 'resident-1' });
    mockPrisma.billingRecord.create.mockResolvedValue({ id: 'bill-1' });
    mockPrisma.payment.create.mockResolvedValue({ id: 'payment-1' });

    await service.create(
      {
        propertyId: 'prop-1',
        firstName: 'Ankit',
        mobile: '9876543210',
        monthlyRent: 800000,
        securityDeposit: 0,
        joiningDate: new Date('2026-11-01'),
        profession: 'STUDENT',
        openingBalances: [
          {
            type: 'OTHER',
            amount: 120000,
            collectedAmount: 20000,
            dueDate: new Date('2026-11-01'),
            attachmentUrls: [],
            collectionMode: 'CASH',
          },
        ],
      },
      'org-1',
      'user-1',
    );

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(mockPrisma.billingRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 120000,
          paidAmount: 20000,
          status: 'PARTIALLY_PAID',
        }),
      }),
    );
    expect(mockPrisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          billingRecordId: 'bill-1',
          amount: 20000,
          status: 'CONFIRMED',
        }),
      }),
    );
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

  it('should recalculate room status using grouped bed counts during move-out', async () => {
    mockPrisma.resident.findFirst.mockResolvedValue({
      id: 'res-1',
      organizationId: 'org-1',
      status: 'ACTIVE',
      bedId: 'bed-1',
      roomId: 'room-1',
      notes: null,
    });
    mockPrisma.resident.update.mockResolvedValue({ id: 'res-1' });
    mockPrisma.bed.groupBy.mockResolvedValue([
      { status: 'AVAILABLE', _count: 1 },
      { status: 'OCCUPIED', _count: 1 },
    ]);

    await service.moveOut(
      'res-1',
      { moveOutDate: new Date('2026-11-02') },
      'org-1',
      'user-1',
    );

    expect(mockPrisma.occupancyRecord.updateMany).toHaveBeenCalledWith({
      where: { residentId: 'res-1', endDate: null },
      data: { endDate: new Date('2026-11-02'), reason: 'move_out' },
    });
    expect(mockPrisma.bed.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: { roomId: 'room-1', status: { not: 'ARCHIVED' } },
      _count: true,
    });
    expect(mockPrisma.room.update).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: { status: 'PARTIALLY_OCCUPIED' },
    });
  });

  it('should leave room status unchanged when it has no non-archived beds', async () => {
    mockPrisma.resident.findFirst.mockResolvedValue({
      id: 'res-1',
      organizationId: 'org-1',
      status: 'ACTIVE',
      bedId: null,
      roomId: 'room-1',
      notes: null,
    });
    mockPrisma.resident.update.mockResolvedValue({ id: 'res-1' });

    await service.moveOut(
      'res-1',
      { moveOutDate: new Date('2026-11-02') },
      'org-1',
      'user-1',
    );

    expect(mockPrisma.room.update).not.toHaveBeenCalled();
  });
});
