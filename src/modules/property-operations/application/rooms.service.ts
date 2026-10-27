import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import type {
  CreateRoomDto,
  UpdateRoomDto,
  CreateBedDto,
  UpdateBedDto,
} from '../api/dto/room.dto.js';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a room within a property. If initialBedCount is specified,
   * automatically creates the initial beds.
   */
  async create(
    propertyId: string,
    dto: CreateRoomDto,
    orgId: string,
    userId: string,
  ) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, organizationId: orgId },
    });

    if (!property) {
      throw new NotFoundError('Property', propertyId);
    }

    const existing = await this.prisma.room.findUnique({
      where: {
        propertyId_roomNumber: {
          propertyId,
          roomNumber: dto.roomNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `Room '${dto.roomNumber}' already exists in this property`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          propertyId,
          organizationId: orgId,
          roomNumber: dto.roomNumber,
          floor: dto.floor,
          sharingType: dto.sharingType,
          rentAmount: dto.rentAmount,
          amenities: dto.amenities,
          description: dto.description,
          availableFrom: dto.availableFrom,
        },
      });

      if (dto.initialBedCount && dto.initialBedCount > 0) {
        const bedLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        const bedsData = Array.from(
          { length: dto.initialBedCount },
          (_, i) => ({
            roomId: room.id,
            organizationId: orgId,
            bedNumber: bedLetters[i] ?? `${i + 1}`,
            status: 'AVAILABLE' as const,
          }),
        );

        await tx.bed.createMany({ data: bedsData });
      }

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'room.create',
          entityType: 'Room',
          entityId: room.id,
        },
      });

      return tx.room.findUnique({
        where: { id: room.id },
        include: { beds: true },
      });
    });
  }

  /**
   * Lists all rooms in a property with beds.
   */
  async findAll(propertyId: string, orgId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, organizationId: orgId },
    });

    if (!property) {
      throw new NotFoundError('Property', propertyId);
    }

    return this.prisma.room.findMany({
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
                status: true,
              },
            },
          },
          orderBy: { bedNumber: 'asc' },
        },
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
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
      include: { beds: true },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'room.update',
        entityType: 'Room',
        entityId: id,
      },
    });

    return updated;
  }

  /**
   * Archives a room (soft delete).
   */
  async archive(id: string, orgId: string, userId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!room) {
      throw new NotFoundError('Room', id);
    }

    const activeResidents = await this.prisma.resident.count({
      where: {
        roomId: id,
        status: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
      },
    });

    if (activeResidents > 0) {
      throw new ConflictError(
        `Cannot archive room with ${activeResidents} active residents. Reallocate them first.`,
      );
    }

    await this.prisma.room.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'room.archive',
        entityType: 'Room',
        entityId: id,
      },
    });

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
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'bed.create',
        entityType: 'Bed',
        entityId: bed.id,
      },
    });

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
      include: { room: true },
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

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'bed.update',
        entityType: 'Bed',
        entityId: bedId,
      },
    });

    return updated;
  }

  /**
   * Archives a bed.
   */
  async archiveBed(bedId: string, orgId: string, userId: string) {
    const bed = await this.prisma.bed.findFirst({
      where: { id: bedId, organizationId: orgId },
    });

    if (!bed) {
      throw new NotFoundError('Bed', bedId);
    }

    const activeResident = await this.prisma.resident.findFirst({
      where: {
        bedId,
        status: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
      },
    });

    if (activeResident) {
      throw new ConflictError(
        `Cannot archive occupied bed (Resident: ${activeResident.firstName}). Please reallocate first.`,
      );
    }

    await this.prisma.bed.update({
      where: { id: bedId },
      data: { status: 'ARCHIVED' },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'bed.archive',
        entityType: 'Bed',
        entityId: bedId,
      },
    });

    return { success: true, message: 'Bed archived successfully' };
  }
}
