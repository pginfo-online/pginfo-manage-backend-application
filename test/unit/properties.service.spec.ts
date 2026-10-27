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

  it('should throw NotFoundError if property does not belong to organization', async () => {
    mockPrisma.property.findFirst.mockResolvedValue(null);

    await expect(service.findById('nonexistent', 'org-1')).rejects.toThrow(
      NotFoundError,
    );
  });
});
