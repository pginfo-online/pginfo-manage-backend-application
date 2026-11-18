import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { Monetary } from '../../finance/domain/monetary.js';
import { REDIS_CLIENT } from '../../../platform/cache/index.js';
import type { Redis } from 'ioredis';
import type {
  CreatePropertyDto,
  UpdatePropertyDto,
  QueryPropertiesDto,
} from '../api/dto/property.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

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

  private async setCached(
    key: string,
    data: any,
    ttlSeconds = 60,
  ): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    } catch (err: any) {
      this.logger.warn(`Redis set error for ${key}: ${err.message}`);
    }
  }

  async invalidatePropertyCache(orgId: string): Promise<void> {
    if (!this.redis) return;
    try {
      const keys = await this.redis.keys(`org:properties:${orgId}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
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
      void Promise.resolve(this.prisma.auditLog.create({ data })).catch(
        (err: any) =>
          this.logger.warn(`Failed to write audit log: ${err?.message ?? err}`),
      );
    }
  }

  /**
   * Creates a new property scoped to the organization.
   */
  async create(dto: CreatePropertyDto, orgId: string, userId: string) {
    const existing = await this.prisma.property.findUnique({
      where: {
        organizationId_name: {
          organizationId: orgId,
          name: dto.name,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError(
        `A property named '${dto.name}' already exists in this organization`,
      );
    }

    const property = await this.prisma.property.create({
      data: {
        ...dto,
        organizationId: orgId,
      },
    });

    this.logAudit({
      organizationId: orgId,
      userId,
      action: 'property.create',
      entityType: 'Property',
      entityId: property.id,
    });

    await this.invalidatePropertyCache(orgId);

    this.logger.log(
      `Created property '${property.name}' (${property.id}) in org ${orgId}`,
    );
    return property;
  }

  /**
   * Lists all properties in an organization with filters and pagination.
   */
  async findAll(orgId: string, query: QueryPropertiesDto) {
    const cacheKey = `org:properties:${orgId}:${JSON.stringify(query || {})}`;
    const cached = await this.getCached<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: Prisma.PropertyWhereInput = {
      organizationId: orgId,
      ...(query.status
        ? { status: query.status }
        : { status: { not: 'ARCHIVED' } }),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
              { addressLine1: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, properties] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const propertyIds = properties.map((p) => p.id);
    const [
      roomsByProperty,
      bedsByPropertyStatus,
      residentsByProperty,
      bookingsByProperty,
      unpaidDuesByProperty,
    ] =
      propertyIds.length > 0
        ? await Promise.all([
            this.prisma.room.groupBy({
              by: ['propertyId'],
              where: {
                organizationId: orgId,
                propertyId: { in: propertyIds },
                status: { not: 'ARCHIVED' },
              },
              _count: true,
            }),
            this.prisma.$queryRaw<
              Array<{ propertyId: string; status: string; count: number }>
            >`
              SELECT r.property_id AS "propertyId", b.status::text AS status, COUNT(*)::integer AS count
              FROM beds b JOIN rooms r ON r.id = b.room_id
              WHERE r.organization_id = ${orgId}::uuid
                AND b.organization_id = ${orgId}::uuid
                AND r.property_id IN (${Prisma.join(propertyIds.map((id) => Prisma.sql`${id}::uuid`))})
                AND r.status <> 'ARCHIVED'
                AND b.status <> 'ARCHIVED'
              GROUP BY r.property_id, b.status
            `,
            this.prisma.resident.groupBy({
              by: ['propertyId'],
              where: {
                organizationId: orgId,
                propertyId: { in: propertyIds },
                status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
              },
              _count: true,
            }),
            this.prisma.booking.groupBy({
              by: ['propertyId'],
              where: {
                organizationId: orgId,
                propertyId: { in: propertyIds },
                status: 'CONFIRMED',
              },
              _count: true,
            }),
            this.prisma.billingRecord.groupBy({
              by: ['propertyId'],
              where: {
                propertyId: { in: propertyIds },
                organizationId: orgId,
                status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
              },
              _sum: {
                amount: true,
                paidAmount: true,
              },
            }),
          ])
        : ([[], [], [], [], []] as const);

    const roomCount = new Map(
      roomsByProperty.map((item) => [item.propertyId, item._count]),
    );
    const bedsByProperty = new Map<
      string,
      { total: number; occupied: number }
    >();
    for (const stat of bedsByPropertyStatus) {
      const counts = bedsByProperty.get(stat.propertyId) ?? {
        total: 0,
        occupied: 0,
      };
      counts.total += stat.count;
      if (stat.status === 'OCCUPIED' || stat.status === 'RESERVED')
        counts.occupied += stat.count;
      bedsByProperty.set(stat.propertyId, counts);
    }

    const propertyDuesMap = new Map<string, number>();
    for (const rec of unpaidDuesByProperty) {
      const amount = rec._sum.amount ?? 0;
      const paid = rec._sum.paidAmount ?? 0;
      propertyDuesMap.set(rec.propertyId, Math.max(0, amount - paid));
    }

    const formatted = properties.map((p) => {
      const roomsCount = roomCount.get(p.id) ?? 0;
      const totalBeds = bedsByProperty.get(p.id)?.total ?? 0;
      const occupiedBeds = bedsByProperty.get(p.id)?.occupied ?? 0;
      const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
      const activeTenants =
        residentsByProperty.find((r) => r.propertyId === p.id)?._count ?? 0;
      const bookingsCount =
        bookingsByProperty.find((r) => r.propertyId === p.id)?._count ?? 0;
      const pendingDuesPaise = propertyDuesMap.get(p.id) ?? 0;

      return {
        ...p,
        roomCount: roomsCount,
        roomsCount,
        totalRooms: roomsCount,
        totalBeds,
        occupiedBeds,
        vacantBeds,
        activeTenants,
        activeResidentCount: activeTenants,
        currentResidents: activeTenants,
        bookingsCount,
        pendingDuesPaise,
        pendingDuesFormatted: Monetary.formatINR(pendingDuesPaise),
      };
    });

    const result = buildOffsetResponse(
      formatted,
      total,
      query.page,
      query.limit,
    );
    await this.setCached(cacheKey, result, 60);
    return result;
  }

  /**
   * Retrieves single property by ID scoped to current organization.
   */
  async findById(id: string, orgId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, organizationId: orgId },
      include: {
        _count: {
          select: {
            rooms: { where: { status: { not: 'ARCHIVED' } } },
            residents: {
              where: {
                status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
              },
            },
            staff: { where: { status: 'ACTIVE' } },
            complaints: { where: { status: { not: 'RESOLVED' } } },
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundError('Property', id);
    }

    // Compute bed counts
    const bedStats = await this.prisma.bed.groupBy({
      by: ['status'],
      where: {
        room: {
          propertyId: id,
          status: { not: 'ARCHIVED' },
        },
      },
      _count: true,
    });

    let totalBeds = 0;
    let occupiedBeds = 0;
    let availableBeds = 0;

    for (const stat of bedStats) {
      totalBeds += stat._count;
      if (stat.status === 'OCCUPIED' || stat.status === 'RESERVED')
        occupiedBeds += stat._count;
      if (stat.status === 'AVAILABLE') availableBeds += stat._count;
    }

    const occupancyRate =
      totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      ...property,
      stats: {
        totalRooms: property._count.rooms,
        totalBeds,
        occupiedBeds,
        availableBeds,
        occupancyRate,
        activeResidents: property._count.residents,
        activeStaff: property._count.staff,
        pendingComplaints: property._count.complaints,
      },
      _count: undefined,
    };
  }

  /**
   * Updates an existing property.
   */
  async update(
    id: string,
    dto: UpdatePropertyDto,
    orgId: string,
    userId: string,
  ) {
    const property = await this.prisma.property.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!property) {
      throw new NotFoundError('Property', id);
    }

    if (dto.name && dto.name !== property.name) {
      const existing = await this.prisma.property.findUnique({
        where: {
          organizationId_name: {
            organizationId: orgId,
            name: dto.name,
          },
        },
      });
      if (existing) {
        throw new ConflictError(
          `A property named '${dto.name}' already exists in this organization`,
        );
      }
    }

    const updated = await this.prisma.property.update({
      where: { id },
      data: dto,
    });

    this.logAudit({
      organizationId: orgId,
      userId,
      action: 'property.update',
      entityType: 'Property',
      entityId: id,
    });

    await this.invalidatePropertyCache(orgId);

    return updated;
  }

  /**
   * Soft deletes (archives) a property.
   */
  async archive(id: string, orgId: string, userId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!property) {
      throw new NotFoundError('Property', id);
    }

    // Check active residents
    const activeResidents = await this.prisma.resident.count({
      where: {
        propertyId: id,
        status: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
      },
    });

    if (activeResidents > 0) {
      throw new ConflictError(
        `Cannot archive property with ${activeResidents} active residents. Please move them out first.`,
      );
    }

    await this.prisma.property.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    this.logAudit({
      organizationId: orgId,
      userId,
      action: 'property.archive',
      entityType: 'Property',
      entityId: id,
    });

    await this.invalidatePropertyCache(orgId);

    return { success: true, message: 'Property archived successfully' };
  }

  /**
   * Generates a complete room & bed occupancy map for a property.
   */
  async getOccupancyMap(propertyId: string, orgId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, organizationId: orgId },
    });

    if (!property) {
      throw new NotFoundError('Property', propertyId);
    }

    const rooms = await this.prisma.room.findMany({
      where: { propertyId, status: { not: 'ARCHIVED' } },
      include: {
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
          },
          orderBy: { bedNumber: 'asc' },
        },
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });

    // Group by floor
    const floorsMap = new Map<string, typeof rooms>();
    let totalBeds = 0;
    let occupiedBeds = 0;

    for (const room of rooms) {
      const floor = room.floor;
      if (!floorsMap.has(floor)) {
        floorsMap.set(floor, []);
      }
      floorsMap.get(floor)!.push(room);

      for (const bed of room.beds) {
        totalBeds++;
        const isBedOccupied =
          bed.residents.length > 0 ||
          bed.status === 'OCCUPIED' ||
          bed.status === 'RESERVED';
        if (isBedOccupied) {
          occupiedBeds++;
        }
      }
    }

    const floors = Array.from(floorsMap.entries()).map(
      ([floor, floorRooms]) => ({
        floor,
        rooms: floorRooms.map((r) => ({
          id: r.id,
          roomNumber: r.roomNumber,
          sharingType: r.sharingType,
          rentAmount: r.rentAmount,
          status: r.status,
          amenities: r.amenities,
          beds: r.beds.map((b) => ({
            id: b.id,
            bedNumber: b.bedNumber,
            status:
              b.residents.length > 0 || b.status === 'RESERVED'
                ? 'OCCUPIED'
                : b.status,
            rentAmount: b.rentAmount ?? r.rentAmount,
            resident: b.residents[0] ?? null,
          })),
        })),
      }),
    );

    return {
      property: {
        id: property.id,
        name: property.name,
        type: property.type,
      },
      summary: {
        totalRooms: rooms.length,
        totalBeds,
        occupiedBeds,
        availableBeds: totalBeds - occupiedBeds,
        occupancyRate:
          totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      },
      floors,
    };
  }
}
