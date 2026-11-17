import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { Prisma } from '@prisma/client';
import { REDIS_CLIENT } from '../../../platform/cache/index.js';
import type { Redis } from 'ioredis';
import type {
  CreateRoomDto,
  UpdateRoomDto,
  CreateBedDto,
  UpdateBedDto,
  QueryRoomsDto,
} from '../api/dto/room.dto.js';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis,
  ) {}

  private async getCached<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    try {
      const data = await this.redis.get(key);
      return data ? (JSON.parse(data) as T) : null;
    } catch {
      return null;
    }
  }

  private async setCached(key: string, data: any, ttlSeconds = 180): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    } catch (err: any) {
      this.logger.warn(`Redis set error for ${key}: ${err.message}`);
    }
  }

  async invalidateRoomCache(propertyId: string): Promise<void> {
    if (!this.redis) return;
    try {
      const keys = await this.redis.keys(`property:rooms:${propertyId}:*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      const statKeys = await this.redis.keys(`property:stats:${propertyId}*`);
      if (statKeys.length > 0) {
        await this.redis.del(...statKeys);
      }
      const orgKeys = await this.redis.keys(`org:properties:*`);
      if (orgKeys.length > 0) {
        await this.redis.del(...orgKeys);
      }
    } catch (err: any) {
      this.logger.warn(`Redis invalidation error: ${err.message}`);
    }
  }

  private logAudit(data: {
    organizationId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
  }) {
    if (this.prisma.auditLog?.create) {
      void Promise.resolve(this.prisma.auditLog.create({ data })).catch((err: any) =>
        this.logger.warn(`Failed to write audit log: ${err?.message ?? err}`),
      );
    }
  }

  /**
   * Creates a room within a property. If initialBedCount is specified,
   * automatically creates the initial beds in a single atomic transaction.
   */
  async create(
    propertyId: string,
    dto: CreateRoomDto,
    orgId: string,
    userId: string,
  ) {
    const [property, existing] = await Promise.all([
      this.prisma.property.findFirst({
        where: { id: propertyId, organizationId: orgId },
        select: { id: true },
      }),
      this.prisma.room.findUnique({
        where: {
          propertyId_roomNumber: { propertyId, roomNumber: dto.roomNumber },
        },
        select: { id: true },
      }),
    ]);

    if (!property) {
      throw new NotFoundError('Property', propertyId);
    }

    if (existing) {
      throw new ConflictError(
        `Room '${dto.roomNumber}' already exists in this property`,
      );
    }

    const bedNames =
      dto.bedNames && dto.bedNames.length > 0
        ? dto.bedNames
        : dto.initialBedCount && dto.initialBedCount > 0
          ? Array.from({ length: dto.initialBedCount }, (_, i) => {
              const bedLetters = [
                'A',
                'B',
                'C',
                'D',
                'E',
                'F',
                'G',
                'H',
                'I',
                'J',
                'K',
                'L',
              ];
              return `Bed${bedLetters[i] ?? `${i + 1}`}`;
            })
          : [];

    const bedsData = bedNames.map((name) => ({
      organizationId: orgId,
      bedNumber: name,
      status: 'AVAILABLE' as const,
      rentAmount:
        dto.bedRents && dto.bedRents[name] ? dto.bedRents[name] : null,
    }));

    const room = await this.prisma.room.create({
      data: {
        propertyId,
        organizationId: orgId,
        roomNumber: dto.roomNumber,
        floor: dto.floor,
        sharingType: dto.sharingType,
        rentAmount: dto.rentAmount,
        amenities: dto.amenities,
        description: dto.description,
        unitType: dto.unitType || 'Room',
        gender: dto.gender || 'UNISEX',
        remarks: dto.remarks,
        lockInPeriod: dto.lockInPeriod || 'No Lock-in',
        dailyStayMinPaise: dto.dailyStayMinPaise,
        dailyStayMaxPaise: dto.dailyStayMaxPaise,
        areaSqft: dto.areaSqft,
        isDisabledForRent: dto.isDisabledForRent ?? false,
        isPublished: dto.isPublished ?? true,
        images: dto.images ?? [],
        isVerified: dto.isVerified ?? true,
        availableFrom: dto.availableFrom,
        beds: bedsData.length > 0 ? { create: bedsData } : undefined,
      },
      include: {
        beds: {
          where: { status: { not: 'ARCHIVED' } },
          select: { id: true, bedNumber: true, status: true, rentAmount: true },
          orderBy: { bedNumber: 'asc' },
        },
      },
    });

    this.logAudit({
      organizationId: orgId,
      userId,
      action: 'room.create',
      entityType: 'Room',
      entityId: room.id,
    });

    await this.invalidateRoomCache(propertyId);

    return room;
  }

  /**
   * Lists all rooms in a property with beds (cached for speed, lean queries).
   */
  async findAll(propertyId: string, orgId: string, query?: QueryRoomsDto) {
    const cacheKey = `property:rooms:${propertyId}:${JSON.stringify(query || {})}`;
    const cached = await this.getCached<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: Prisma.RoomWhereInput = {
      propertyId,
      organizationId: orgId,
      status: query?.status ?? { not: 'ARCHIVED' },
      ...(query?.sharingType ? { sharingType: query.sharingType } : {}),
      ...(query?.gender ? { gender: query.gender } : {}),
      ...(query?.floor ? { floor: query.floor } : {}),
      ...(query?.unitType ? { unitType: query.unitType } : {}),
      ...(query?.published ? { isPublished: query.published === 'true' } : {}),
      ...(query?.search
        ? { roomNumber: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(query?.vacancy === 'VACANT'
        ? { beds: { some: { status: 'AVAILABLE' } } }
        : query?.vacancy === 'FULL'
          ? {
              AND: [
                { beds: { some: {} } },
                { beds: { none: { status: 'AVAILABLE' } } },
              ],
            }
          : {}),
    };

    const [rooms, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        ...(query
          ? { skip: (query.page - 1) * query.limit, take: query.limit }
          : {}),
        include: {
          beds: {
            where: { status: { not: 'ARCHIVED' } },
            select: { id: true, bedNumber: true, status: true },
            orderBy: { bedNumber: 'asc' },
          },
        },
        orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      }),
      this.prisma.room.count({ where }),
    ]);

    const result = query
      ? buildOffsetResponse(rooms, total, query.page, query.limit)
      : rooms;

    await this.setCached(cacheKey, result, 180);

    return result;
  }

  /**
   * Retrieves single room by ID scoped to current organization.
   */
  async findById(id: string, orgId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, organizationId: orgId },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            type: true,
            timezone: true,
          },
        },
        beds: {
          where: { status: { not: 'ARCHIVED' } },
          include: {
            residents: {
              where: {
                status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
              },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                mobile: true,
                status: true,
                monthlyRent: true,
                joiningDate: true,
              },
            },
            bookings: {
              where: { status: { in: ['CONFIRMED'] } },
              select: {
                id: true,
                guestName: true,
                guestMobile: true,
                expectedMoveIn: true,
                status: true,
              },
            },
          },
          orderBy: { bedNumber: 'asc' },
        },
      },
    });

    if (!room) {
      throw new NotFoundError('Room', id);
    }

    return room;
  }

  /**
   * Updates an existing room.
   */
  async update(id: string, dto: UpdateRoomDto, orgId: string, userId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, propertyId: true, roomNumber: true },
    });

    if (!room) {
      throw new NotFoundError('Room', id);
    }

    if (dto.roomNumber && dto.roomNumber !== room.roomNumber) {
      const existing = await this.prisma.room.findUnique({
        where: {
          propertyId_roomNumber: {
            propertyId: room.propertyId,
            roomNumber: dto.roomNumber,
          },
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictError(
          `Room '${dto.roomNumber}' already exists in this property`,
        );
      }
    }

    const updated = await this.prisma.room.update({
      where: { id },
      data: dto,
      include: {
        beds: {
          where: { status: { not: 'ARCHIVED' } },
          select: { id: true, bedNumber: true, status: true },
          orderBy: { bedNumber: 'asc' },
        },
      },
    });

    this.logAudit({
      organizationId: orgId,
      userId,
      action: 'room.update',
      entityType: 'Room',
      entityId: id,
    });

    await this.invalidateRoomCache(room.propertyId);

    return updated;
  }

  /**
   * Archives a room (soft delete).
   */
  async archive(id: string, orgId: string, userId: string) {
    const [room, activeResidents] = await Promise.all([
      this.prisma.room.findFirst({
        where: { id, organizationId: orgId },
        select: { id: true, propertyId: true },
      }),
      this.prisma.resident.count({
        where: {
          roomId: id,
          status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
        },
      }),
    ]);

    if (!room) {
      throw new NotFoundError('Room', id);
    }

    if (activeResidents > 0) {
      throw new ConflictError(
        `Cannot archive room with ${activeResidents} active residents. Reallocate them first.`,
      );
    }

    await this.prisma.room.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    this.logAudit({
      organizationId: orgId,
      userId,
      action: 'room.archive',
      entityType: 'Room',
      entityId: id,
    });

    await this.invalidateRoomCache(room.propertyId);

    return { success: true, message: 'Room archived successfully' };
  }

  /**
   * Adds a bed to a room.
   */
  async addBed(
    roomId: string,
    dto: CreateBedDto,
    orgId: string,
    userId: string,
  ) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, organizationId: orgId },
      select: { id: true, roomNumber: true, propertyId: true },
    });

    if (!room) {
      throw new NotFoundError('Room', roomId);
    }

    const existing = await this.prisma.bed.findUnique({
      where: {
        roomId_bedNumber: {
          roomId,
          bedNumber: dto.bedNumber,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError(
        `Bed '${dto.bedNumber}' already exists in room '${room.roomNumber}'`,
      );
    }

    const bed = await this.prisma.bed.create({
      data: {
        roomId,
        organizationId: orgId,
        bedNumber: dto.bedNumber,
        rentAmount: dto.rentAmount,
        isDisabledForRent: dto.isDisabledForRent ?? false,
        remarks: dto.remarks,
      },
    });

    this.logAudit({
      organizationId: orgId,
      userId,
      action: 'bed.create',
      entityType: 'Bed',
      entityId: bed.id,
    });

    await this.invalidateRoomCache(room.propertyId);

    return bed;
  }

  /**
   * Updates an existing bed.
   */
  async updateBed(
    bedId: string,
    dto: UpdateBedDto,
    orgId: string,
    userId: string,
  ) {
    const bed = await this.prisma.bed.findFirst({
      where: { id: bedId, organizationId: orgId },
      include: { room: { select: { id: true, propertyId: true } } },
    });

    if (!bed) {
      throw new NotFoundError('Bed', bedId);
    }

    if (dto.bedNumber && dto.bedNumber !== bed.bedNumber) {
      const existing = await this.prisma.bed.findUnique({
        where: {
          roomId_bedNumber: {
            roomId: bed.roomId,
            bedNumber: dto.bedNumber,
          },
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictError(
          `Bed '${dto.bedNumber}' already exists in this room`,
        );
      }
    }

    const updated = await this.prisma.bed.update({
      where: { id: bedId },
      data: dto,
    });

    this.logAudit({
      organizationId: orgId,
      userId,
      action: 'bed.update',
      entityType: 'Bed',
      entityId: bedId,
    });

    await this.invalidateRoomCache(bed.room.propertyId);

    return updated;
  }

  /**
   * Archives a bed.
   */
  async archiveBed(bedId: string, orgId: string, userId: string) {
    const [bed, activeResident] = await Promise.all([
      this.prisma.bed.findFirst({
        where: { id: bedId, organizationId: orgId },
        include: { room: { select: { id: true, propertyId: true } } },
      }),
      this.prisma.resident.findFirst({
        where: {
          bedId,
          status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
        },
        select: { firstName: true },
      }),
    ]);

    if (!bed) {
      throw new NotFoundError('Bed', bedId);
    }

    if (activeResident) {
      throw new ConflictError(
        `Cannot archive occupied bed (Resident: ${activeResident.firstName}). Please reallocate first.`,
      );
    }

    await this.prisma.bed.update({
      where: { id: bedId },
      data: { status: 'ARCHIVED' },
    });

    this.logAudit({
      organizationId: orgId,
      userId,
      action: 'bed.archive',
      entityType: 'Bed',
      entityId: bedId,
    });

    await this.invalidateRoomCache(bed.room.propertyId);

    return { success: true, message: 'Bed archived successfully' };
  }

  /**
   * Toggles whether a room is disabled for rent.
   */
  async toggleDisableRent(id: string, orgId: string, userId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, isDisabledForRent: true, propertyId: true },
    });

    if (!room) {
      throw new NotFoundError('Room', id);
    }

    const updated = await this.prisma.room.update({
      where: { id },
      data: { isDisabledForRent: !room.isDisabledForRent },
      include: {
        beds: {
          where: { status: { not: 'ARCHIVED' } },
          select: { id: true, bedNumber: true, status: true },
          orderBy: { bedNumber: 'asc' },
        },
      },
    });

    this.logAudit({
      organizationId: orgId,
      userId,
      action: updated.isDisabledForRent
        ? 'room.disable_rent'
        : 'room.enable_rent',
      entityType: 'Room',
      entityId: id,
    });

    await this.invalidateRoomCache(room.propertyId);

    return updated;
  }

  /**
   * Toggles whether a room is published to marketplace/listings.
   */
  async togglePublish(id: string, orgId: string, userId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, isPublished: true, propertyId: true },
    });

    if (!room) {
      throw new NotFoundError('Room', id);
    }

    const updated = await this.prisma.room.update({
      where: { id },
      data: { isPublished: !room.isPublished },
      include: {
        beds: {
          where: { status: { not: 'ARCHIVED' } },
          select: { id: true, bedNumber: true, status: true },
          orderBy: { bedNumber: 'asc' },
        },
      },
    });

    this.logAudit({
      organizationId: orgId,
      userId,
      action: updated.isPublished ? 'room.publish' : 'room.unpublish',
      entityType: 'Room',
      entityId: id,
    });

    await this.invalidateRoomCache(room.propertyId);

    return updated;
  }

  /**
   * Calculates comprehensive inventory statistics for a property.
   * Covers all 17 KPI metrics required for production-scale management.
   */
  async getInventoryStats(propertyId: string, orgId: string) {
    const cacheKey = `property:stats:${propertyId}`;
    const cached = await this.getCached<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, organizationId: orgId },
      select: { id: true },
    });

    if (!property) {
      throw new NotFoundError('Property', propertyId);
    }

    const [rooms, confirmedBookingsCount, pendingResidentsCount] =
      await Promise.all([
        this.prisma.room.findMany({
          where: { propertyId, organizationId: orgId, status: { not: 'ARCHIVED' } },
          include: {
            beds: {
              where: { status: { not: 'ARCHIVED' } },
              include: {
                residents: {
                  where: {
                    status: {
                      in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'],
                    },
                  },
                },
                bookings: {
                  where: { status: { in: ['CONFIRMED'] } },
                },
              },
            },
          },
        }),
        this.prisma.booking.count({
          where: {
            propertyId,
            organizationId: orgId,
            status: 'CONFIRMED',
          },
        }),
        this.prisma.resident.count({
          where: {
            propertyId,
            organizationId: orgId,
            status: 'PENDING_MOVE_IN',
          },
        }),
      ]);

    const newBookingsCount =
      (confirmedBookingsCount || 0) + (pendingResidentsCount || 0);

    let totalBeds = 0;
    let vacantRooms = 0;
    let semiVacantRooms = 0;
    let vacantBeds = 0;
    let overbookedRooms = 0;
    let overbookedBeds = 0;
    let occupiedRooms = 0;
    let occupiedBeds = 0;
    let underNoticeTenants = 0;
    let unverifiedRooms = 0;
    let maleRooms = 0;
    let femaleRooms = 0;
    let underNoticeWithBooking = 0;
    let disabledForRent = 0;
    let disabledForRentBeds = 0;

    for (const room of rooms) {
      if (room.isDisabledForRent) {
        disabledForRent++;
      }
      if (!room.isVerified) {
        unverifiedRooms++;
      }
      if (room.gender === 'MALE') {
        maleRooms++;
      } else if (room.gender === 'FEMALE') {
        femaleRooms++;
      }

      const roomBedCount = room.beds.length;
      totalBeds += roomBedCount;

      let roomOccupiedBeds = 0;
      let roomBookings = 0;

      for (const bed of room.beds) {
        const isBedDisabled = bed.isDisabledForRent || room.isDisabledForRent;
        if (isBedDisabled) {
          disabledForRentBeds++;
        }

        const activeResidents = bed.residents.filter(
          (r) => r.status === 'ACTIVE',
        );
        const noticeResidents = bed.residents.filter(
          (r) => r.status === 'NOTICE_PERIOD',
        );
        const pendingResidents = bed.residents.filter(
          (r) => r.status === 'PENDING_MOVE_IN',
        );
        const totalResidents =
          activeResidents.length +
          noticeResidents.length +
          pendingResidents.length;
        const totalBookings = bed.bookings.length;

        underNoticeTenants += noticeResidents.length;
        if (noticeResidents.length > 0 && totalBookings > 0) {
          underNoticeWithBooking += 1;
        }

        const isAllocated =
          totalResidents > 0 ||
          bed.status === 'OCCUPIED' ||
          bed.status === 'RESERVED';

        if (isAllocated) {
          const count = Math.max(1, totalResidents);
          occupiedBeds += count;
          roomOccupiedBeds += count;
        } else if (
          !isBedDisabled &&
          bed.status === 'AVAILABLE' &&
          totalBookings === 0
        ) {
          vacantBeds++;
        }

        if (totalResidents > 1 || (totalResidents >= 1 && totalBookings > 0)) {
          overbookedBeds++;
        }

        roomBookings += totalBookings;
      }

      if (roomOccupiedBeds > 0) {
        occupiedRooms++;
      }

      if (
        roomBedCount > 0 &&
        roomOccupiedBeds === 0 &&
        !room.isDisabledForRent
      ) {
        vacantRooms++;
      } else if (roomOccupiedBeds > 0 && roomOccupiedBeds < roomBedCount) {
        semiVacantRooms++;
      }

      if (roomOccupiedBeds + roomBookings > roomBedCount && roomBedCount > 0) {
        overbookedRooms++;
      }
    }

    const result = {
      totalRooms: rooms.length,
      totalBeds,
      vacantRooms,
      semiVacantRooms,
      vacantBeds,
      overbookedRooms,
      overbookedBeds,
      occupiedRooms,
      occupiedBeds,
      newBookings: newBookingsCount,
      underNoticeTenants,
      unverifiedRooms,
      maleRooms,
      femaleRooms,
      underNoticeWithBooking,
      disabledForRent,
      disabledForRentBeds,
    };

    await this.setCached(cacheKey, result, 60);

    return result;
  }
}
