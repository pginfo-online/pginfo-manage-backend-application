import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import type {
  CreatePropertyDto,
  UpdatePropertyDto,
  QueryPropertiesDto,
} from '../api/dto/property.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'property.create',
        entityType: 'Property',
        entityId: property.id,
      },
    });

    this.logger.log(
      `Created property '${property.name}' (${property.id}) in org ${orgId}`,
    );
    return property;
  }

  /**
   * Lists all properties in an organization with filters and pagination.
   */
  async findAll(orgId: string, query: QueryPropertiesDto) {
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
        include: {
          _count: {
            select: {
              rooms: { where: { status: { not: 'ARCHIVED' } } },
              residents: {
                where: { status: { in: ['ACTIVE', 'NOTICE_PERIOD'] } },
              },
            },
          },
        },
      }),
    ]);

    const formatted = properties.map((p) => ({
      ...p,
      roomCount: p._count.rooms,
      activeResidentCount: p._count.residents,
      _count: undefined,
    }));

    return buildOffsetResponse(formatted, total, query.page, query.limit);
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
              where: { status: { in: ['ACTIVE', 'NOTICE_PERIOD'] } },
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
      if (stat.status === 'OCCUPIED') occupiedBeds += stat._count;
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

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'property.update',
        entityType: 'Property',
        entityId: id,
      },
    });

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

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'property.archive',
        entityType: 'Property',
        entityId: id,
      },
    });

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
              where: { status: { in: ['ACTIVE', 'NOTICE_PERIOD'] } },
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
        if (bed.residents.length > 0) {
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
            status: b.residents.length > 0 ? 'OCCUPIED' : b.status,
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
