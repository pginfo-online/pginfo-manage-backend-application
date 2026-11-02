import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomsService } from '../../src/modules/property-operations/application/rooms.service.js';
import { ConflictError, NotFoundError } from '../../src/common/errors/index.js';

describe('RoomsService', () => {
  let service: RoomsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      property: {
        findFirst: vi.fn(),
      },
      room: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      bed: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
      },
      booking: {
        count: vi.fn().mockResolvedValue(2),
      },
      auditLog: {
        create: vi.fn(),
      },
      resident: {
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };

    service = new RoomsService(mockPrisma as any);
  });

  it('should calculate all 17 inventory statistics accurately', async () => {
    mockPrisma.property.findFirst.mockResolvedValue({ id: 'prop-1', name: 'Vanalilka' });

    // Mock 2 rooms: Room 101 with 4 beds, Room 102 with 2 beds
    mockPrisma.room.findMany.mockResolvedValue([
      {
        id: 'room-1',
        roomNumber: '101',
        floor: 'Ground Floor',
        gender: 'UNISEX',
        isDisabledForRent: false,
        isVerified: true,
        beds: [
          { id: 'b1', bedNumber: 'BedA', status: 'OCCUPIED', isDisabledForRent: false, residents: [{ status: 'ACTIVE' }], bookings: [] },
          { id: 'b2', bedNumber: 'BedB', status: 'OCCUPIED', isDisabledForRent: false, residents: [{ status: 'ACTIVE' }], bookings: [] },
          { id: 'b3', bedNumber: 'BedC', status: 'AVAILABLE', isDisabledForRent: false, residents: [], bookings: [] },
          { id: 'b4', bedNumber: 'BedD', status: 'OCCUPIED', isDisabledForRent: false, residents: [{ status: 'NOTICE_PERIOD' }], bookings: [{ id: 'bk-1' }] },
        ],
      },
      {
        id: 'room-2',
        roomNumber: '102',
        floor: 'Ground Floor',
        gender: 'MALE',
        isDisabledForRent: true,
        isVerified: false,
        beds: [
          { id: 'b5', bedNumber: 'BedA', status: 'AVAILABLE', isDisabledForRent: true, residents: [], bookings: [] },
          { id: 'b6', bedNumber: 'BedB', status: 'AVAILABLE', isDisabledForRent: true, residents: [], bookings: [] },
        ],
      },
    ]);

    const stats = await service.getInventoryStats('prop-1', 'org-1');

    expect(stats.totalRooms).toBe(2);
    expect(stats.totalBeds).toBe(6);
    expect(stats.occupiedRooms).toBe(1);
    expect(stats.semiVacantRooms).toBe(1);
    expect(stats.occupiedBeds).toBe(3);
    expect(stats.vacantBeds).toBe(1); // BedC
    expect(stats.underNoticeTenants).toBe(1);
    expect(stats.underNoticeWithBooking).toBe(1);
    expect(stats.disabledForRent).toBe(1); // Room 102
    expect(stats.disabledForRentBeds).toBe(2); // Beds of Room 102
    expect(stats.maleRooms).toBe(1);
    expect(stats.unverifiedRooms).toBe(1);
    expect(stats.newBookings).toBe(2);
  });

  it('should toggle disable for rent on a room', async () => {
    mockPrisma.room.findFirst.mockResolvedValue({
      id: 'room-1',
      roomNumber: '101',
      isDisabledForRent: false,
    });
    mockPrisma.room.update.mockResolvedValue({
      id: 'room-1',
      roomNumber: '101',
      isDisabledForRent: true,
    });

    const result = await service.toggleDisableRent('room-1', 'org-1', 'user-1');
    expect(result.isDisabledForRent).toBe(true);
    expect(mockPrisma.room.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'room-1' },
        data: { isDisabledForRent: true },
      }),
    );
  });

  it('should toggle publish status on a room', async () => {
    mockPrisma.room.findFirst.mockResolvedValue({
      id: 'room-1',
      roomNumber: '101',
      isPublished: true,
    });
    mockPrisma.room.update.mockResolvedValue({
      id: 'room-1',
      roomNumber: '101',
      isPublished: false,
    });

    const result = await service.togglePublish('room-1', 'org-1', 'user-1');
    expect(result.isPublished).toBe(false);
    expect(mockPrisma.room.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'room-1' },
        data: { isPublished: false },
      }),
    );
  });
});
