import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertiesService } from '../../src/modules/property-operations/application/properties.service.js';
import { ConflictError, NotFoundError } from '../../src/common/errors/index.js';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      property: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      bed: {
        groupBy: vi.fn().mockResolvedValue([
          { status: 'OCCUPIED', _count: 4 },
          { status: 'AVAILABLE', _count: 6 },
        ]),
      },
      room: { groupBy: vi.fn() },
      resident: { groupBy: vi.fn() },
      booking: { groupBy: vi.fn() },
      billingRecord: { groupBy: vi.fn() },
      $queryRaw: vi.fn(),
      auditLog: {
        create: vi.fn(),
      },
    };

    service = new PropertiesService(mockPrisma as any);
  });

  it('should throw ConflictError if property name exists in organization', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({
      id: 'existing-id',
      name: 'Sunrise PG',
    });

    await expect(
      service.create(
        {
          name: 'Sunrise PG',
          type: 'PG',
          addressLine1: '123 MG Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
          country: 'IN',
          amenities: ['WiFi', 'AC'],
          rentDueDay: 5,
          timezone: 'Asia/Kolkata',
        },
        'org-1',
        'user-1',
      ),
    ).rejects.toThrow(ConflictError);
  });

  it('should compute occupancy stats accurately in findById', async () => {
    mockPrisma.property.findFirst.mockResolvedValue({
      id: 'prop-1',
      name: 'Sunrise PG',
      type: 'PG',
      _count: {
        rooms: 5,
        residents: 4,
        staff: 2,
        complaints: 1,
      },
    });

    const result = await service.findById('prop-1', 'org-1');
    expect(result.stats.totalRooms).toBe(5);
    expect(result.stats.totalBeds).toBe(10);
    expect(result.stats.occupiedBeds).toBe(4);
    expect(result.stats.availableBeds).toBe(6);
    expect(result.stats.occupancyRate).toBe(40);
  });

  it('aggregates property list counts without loading every room and bed', async () => {
    mockPrisma.property.count.mockResolvedValue(1);
    mockPrisma.property.findMany.mockResolvedValue([
      { id: 'prop-1', name: 'Sunrise PG' },
    ]);
    mockPrisma.room.groupBy.mockResolvedValue([
      { propertyId: 'prop-1', _count: 2 },
    ]);
    mockPrisma.$queryRaw.mockResolvedValue([
      { propertyId: 'prop-1', status: 'OCCUPIED', count: 1 },
      { propertyId: 'prop-1', status: 'AVAILABLE', count: 3 },
    ]);
    mockPrisma.resident.groupBy.mockResolvedValue([
      { propertyId: 'prop-1', _count: 1 },
    ]);
    mockPrisma.booking.groupBy.mockResolvedValue([]);
    mockPrisma.billingRecord.groupBy.mockResolvedValue([]);

    const page = await service.findAll('org-1', { page: 1, limit: 20 });
    expect(page.data[0]).toMatchObject({
      roomCount: 2,
      totalBeds: 4,
      occupiedBeds: 1,
      vacantBeds: 3,
      activeTenants: 1,
    });
    expect(mockPrisma.room.groupBy).toHaveBeenCalledOnce();
    expect(mockPrisma.bed.groupBy).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError if property does not belong to organization', async () => {
    mockPrisma.property.findFirst.mockResolvedValue(null);

    await expect(service.findById('nonexistent', 'org-1')).rejects.toThrow(
      NotFoundError,
    );
  });
});
