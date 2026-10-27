import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import type {
  CreateResidentDto,
  UpdateResidentDto,
  ReallocateResidentDto,
  SwapBedsDto,
  MoveOutDto,
  QueryResidentsDto,
} from '../api/dto/resident.dto.js';
import { Prisma, ResidentStatus } from '@prisma/client';

@Injectable()
export class ResidentsService {
  private readonly logger = new Logger(ResidentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Onboards a new resident and allocates room/bed in an atomic transaction.
   */
  async create(dto: CreateResidentDto, orgId: string, userId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, organizationId: orgId },
    });

    if (!property) {
      throw new NotFoundError('Property', dto.propertyId);
    }

    if (dto.bedId) {
      const bed = await this.prisma.bed.findFirst({
        where: { id: dto.bedId, organizationId: orgId },
        include: {
          residents: {
            where: { status: { in: ['ACTIVE', 'NOTICE_PERIOD'] } },
          },
        },
      });

      if (!bed) {
        throw new NotFoundError('Bed', dto.bedId);
      }

      if (bed.residents.length > 0) {
        throw new ConflictError(
          `Bed ${bed.bedNumber} is already occupied by ${bed.residents[0]?.firstName}`,
        );
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const initialStatus: ResidentStatus =
      dto.joiningDate > today ? 'PENDING_MOVE_IN' : 'ACTIVE';

    return this.prisma.$transaction(async (tx) => {
      const resident = await tx.resident.create({
        data: {
          organizationId: orgId,
          propertyId: dto.propertyId,
          roomId: dto.roomId,
          bedId: dto.bedId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          mobile: dto.mobile,
          whatsappNumber: dto.whatsappNumber,
          emergencyContact: dto.emergencyContact,
          profession: dto.profession,
          status: initialStatus,
          monthlyRent: dto.monthlyRent,
          securityDeposit: dto.securityDeposit,
          joiningDate: dto.joiningDate,
          moveInDate:
            dto.moveInDate ??
            (initialStatus === 'ACTIVE' ? dto.joiningDate : undefined),
          expectedVacatingDate: dto.expectedVacatingDate,
          lockInEndDate: dto.lockInEndDate,
          rentDueDay: dto.rentDueDay ?? property.rentDueDay,
          notes: dto.notes,
        },
      });

      // Update bed status if assigned
      if (dto.bedId) {
        await tx.bed.update({
          where: { id: dto.bedId },
          data: {
            status: initialStatus === 'ACTIVE' ? 'OCCUPIED' : 'RESERVED',
          },
        });
      }

      // Record occupancy history
      if (dto.roomId) {
        await tx.occupancyRecord.create({
          data: {
            organizationId: orgId,
            residentId: resident.id,
            propertyId: dto.propertyId,
            roomId: dto.roomId,
            bedId: dto.bedId,
            monthlyRent: dto.monthlyRent,
            startDate: dto.joiningDate,
            reason: 'initial',
          },
        });
      }

      // If security deposit configured, generate initial deposit billing record
      if (dto.securityDeposit > 0) {
        await tx.billingRecord.create({
          data: {
            organizationId: orgId,
            residentId: resident.id,
            propertyId: dto.propertyId,
            type: 'SECURITY_DEPOSIT',
            status: 'ISSUED',
            amount: dto.securityDeposit,
            dueDate: dto.joiningDate,
            description: 'Security Deposit',
            idempotencyKey: `dep_${resident.id}`,
          },
        });
      }

      // Update room status
      if (dto.roomId) {
        await this.recalculateRoomStatus(tx, dto.roomId);
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'resident.create',
          entityType: 'Resident',
          entityId: resident.id,
        },
      });

      return resident;
    });
  }

  /**
   * Lists residents with filters and pagination.
   */
  async findAll(orgId: string, query: QueryResidentsDto) {
    const where: Prisma.ResidentWhereInput = {
      organizationId: orgId,
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.status
        ? { status: query.status }
        : { status: { not: 'ARCHIVED' } }),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { mobile: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [total, residents] = await Promise.all([
      this.prisma.resident.count({ where }),
      this.prisma.resident.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          property: { select: { id: true, name: true } },
          room: { select: { id: true, roomNumber: true, floor: true } },
          bed: { select: { id: true, bedNumber: true } },
        },
      }),
    ]);

    return buildOffsetResponse(residents, total, query.page, query.limit);
  }

  /**
   * Retrieves single resident with financial summary and occupancy history.
   */
  async findById(id: string, orgId: string) {
    const resident = await this.prisma.resident.findFirst({
      where: { id, organizationId: orgId },
      include: {
        property: {
          select: { id: true, name: true, type: true, rentDueDay: true },
        },
        room: {
          select: {
            id: true,
            roomNumber: true,
            floor: true,
            sharingType: true,
          },
        },
        bed: { select: { id: true, bedNumber: true } },
        occupancyHistory: {
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!resident) {
      throw new NotFoundError('Resident', id);
    }

    // Authoritative financial totals
    const billingSummary = await this.prisma.billingRecord.aggregate({
      where: {
        residentId: id,
        organizationId: orgId,
        status: { not: 'CANCELLED' },
      },
      _sum: {
        amount: true,
        paidAmount: true,
      },
    });

    const totalBilled = billingSummary._sum.amount ?? 0;
    const totalPaid = billingSummary._sum.paidAmount ?? 0;
    const outstandingBalance = totalBilled - totalPaid;

    return {
      ...resident,
      financialSummary: {
        totalBilled,
        totalPaid,
        outstandingBalance,
      },
    };
  }

  /**
   * Updates an existing resident's personal or lease details.
   */
  async update(
    id: string,
    dto: UpdateResidentDto,
    orgId: string,
    userId: string,
  ) {
    const resident = await this.prisma.resident.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!resident) {
      throw new NotFoundError('Resident', id);
    }

    const updated = await this.prisma.resident.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'resident.update',
        entityType: 'Resident',
        entityId: id,
      },
    });

    return updated;
  }

  /**
   * Safely changes a resident's room or bed allocation.
   */
  async reallocate(
    residentId: string,
    dto: ReallocateResidentDto,
    orgId: string,
    userId: string,
  ) {
    const resident = await this.prisma.resident.findFirst({
      where: { id: residentId, organizationId: orgId },
    });

    if (!resident) {
      throw new NotFoundError('Resident', residentId);
    }

    if (resident.status !== 'ACTIVE' && resident.status !== 'NOTICE_PERIOD') {
      throw new BadRequestException('Only active residents can be reallocated');
    }

    if (dto.bedId) {
      const targetBed = await this.prisma.bed.findFirst({
        where: { id: dto.bedId, organizationId: orgId },
        include: {
          residents: {
            where: {
              status: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
              id: { not: residentId },
            },
          },
        },
      });

      if (!targetBed) {
        throw new NotFoundError('Target Bed', dto.bedId);
      }

      if (targetBed.residents.length > 0) {
        throw new ConflictError(
          `Target bed ${targetBed.bedNumber} is already occupied by ${targetBed.residents[0]?.firstName}`,
        );
      }
    }

    const oldRoomId = resident.roomId;
    const oldBedId = resident.bedId;
    const newRent = dto.newRentAmount ?? resident.monthlyRent;

    return this.prisma.$transaction(async (tx) => {
      // Free old bed
      if (oldBedId) {
        await tx.bed.update({
          where: { id: oldBedId },
          data: { status: 'AVAILABLE' },
        });
      }

      // Occupy new bed
      if (dto.bedId) {
        await tx.bed.update({
          where: { id: dto.bedId },
          data: { status: 'OCCUPIED' },
        });
      }

      // Close previous occupancy record
      const activeRecord = await tx.occupancyRecord.findFirst({
        where: { residentId, endDate: null },
      });
      if (activeRecord) {
        await tx.occupancyRecord.update({
          where: { id: activeRecord.id },
          data: {
            endDate: new Date(),
            reason: dto.reason,
          },
        });
      }

      // Create new occupancy record
      await tx.occupancyRecord.create({
        data: {
          organizationId: orgId,
          residentId,
          propertyId: resident.propertyId,
          roomId: dto.roomId,
          bedId: dto.bedId,
          monthlyRent: newRent,
          startDate: new Date(),
          reason: dto.reason,
        },
      });

      // Update resident record
      const updatedResident = await tx.resident.update({
        where: { id: residentId },
        data: {
          roomId: dto.roomId,
          bedId: dto.bedId,
          monthlyRent: newRent,
          version: { increment: 1 },
        },
      });

      // Recalculate room statuses
      if (oldRoomId) await this.recalculateRoomStatus(tx, oldRoomId);
      await this.recalculateRoomStatus(tx, dto.roomId);

      // Audit log
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'resident.reallocate',
          entityType: 'Resident',
          entityId: residentId,
          metadata: {
            fromRoomId: oldRoomId,
            fromBedId: oldBedId,
            toRoomId: dto.roomId,
            toBedId: dto.bedId,
          },
        },
      });

      return updatedResident;
    });
  }

  /**
   * Safely swaps bed allocations between two residents atomically.
   */
  async swapBeds(dto: SwapBedsDto, orgId: string, userId: string) {
    if (dto.residentOneId === dto.residentTwoId) {
      throw new BadRequestException('Cannot swap bed with the same resident');
    }

    const [r1, r2] = await Promise.all([
      this.prisma.resident.findFirst({
        where: { id: dto.residentOneId, organizationId: orgId },
      }),
      this.prisma.resident.findFirst({
        where: { id: dto.residentTwoId, organizationId: orgId },
      }),
    ]);

    if (!r1) throw new NotFoundError('Resident 1', dto.residentOneId);
    if (!r2) throw new NotFoundError('Resident 2', dto.residentTwoId);

    if (
      !['ACTIVE', 'NOTICE_PERIOD'].includes(r1.status) ||
      !['ACTIVE', 'NOTICE_PERIOD'].includes(r2.status)
    ) {
      throw new BadRequestException(
        'Both residents must be currently active to swap beds',
      );
    }

    if (!r1.roomId || !r1.bedId || !r2.roomId || !r2.bedId) {
      throw new BadRequestException(
        'Both residents must have an assigned room and bed',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // Close previous records
      await tx.occupancyRecord.updateMany({
        where: {
          residentId: { in: [r1.id, r2.id] },
          endDate: null,
        },
        data: { endDate: now, reason: dto.reason },
      });

      // Create new occupancy records
      await tx.occupancyRecord.createMany({
        data: [
          {
            organizationId: orgId,
            residentId: r1.id,
            propertyId: r1.propertyId,
            roomId: r2.roomId!,
            bedId: r2.bedId!,
            monthlyRent: r1.monthlyRent,
            startDate: now,
            reason: dto.reason,
          },
          {
            organizationId: orgId,
            residentId: r2.id,
            propertyId: r2.propertyId,
            roomId: r1.roomId!,
            bedId: r1.bedId!,
            monthlyRent: r2.monthlyRent,
            startDate: now,
            reason: dto.reason,
          },
        ],
      });

      // Swap bed assignments on residents
      await tx.resident.update({
        where: { id: r1.id },
        data: {
          roomId: r2.roomId,
          bedId: r2.bedId,
          version: { increment: 1 },
        },
      });

      await tx.resident.update({
        where: { id: r2.id },
        data: {
          roomId: r1.roomId,
          bedId: r1.bedId,
          version: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'resident.swap_beds',
          entityType: 'Resident',
          entityId: r1.id,
          metadata: {
            residentOneId: r1.id,
            residentTwoId: r2.id,
            r1Bed: r1.bedId,
            r2Bed: r2.bedId,
          },
        },
      });

      return {
        success: true,
        message: `Successfully swapped beds between ${r1.firstName} and ${r2.firstName}`,
      };
    });
  }

  /**
   * Records a resident move-out and releases their bed.
   */
  async moveOut(id: string, dto: MoveOutDto, orgId: string, userId: string) {
    const resident = await this.prisma.resident.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!resident) {
      throw new NotFoundError('Resident', id);
    }

    if (resident.status === 'MOVED_OUT' || resident.status === 'ARCHIVED') {
      throw new BadRequestException('Resident has already moved out');
    }

    return this.prisma.$transaction(async (tx) => {
      // Free up bed
      if (resident.bedId) {
        await tx.bed.update({
          where: { id: resident.bedId },
          data: { status: 'AVAILABLE' },
        });
      }

      // Close occupancy record
      const activeRecord = await tx.occupancyRecord.findFirst({
        where: { residentId: id, endDate: null },
      });
      if (activeRecord) {
        await tx.occupancyRecord.update({
          where: { id: activeRecord.id },
          data: {
            endDate: dto.moveOutDate,
            reason: 'move_out',
          },
        });
      }

      // Update resident status
      const updated = await tx.resident.update({
        where: { id },
        data: {
          status: 'MOVED_OUT',
          moveOutDate: dto.moveOutDate,
          bedId: null, // Clear active bed reference
          notes: dto.notes
            ? `${resident.notes ?? ''}\nMove-out note: ${dto.notes}`
            : resident.notes,
          version: { increment: 1 },
        },
      });

      // Recalculate room status
      if (resident.roomId) {
        await this.recalculateRoomStatus(tx, resident.roomId);
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'resident.move_out',
          entityType: 'Resident',
          entityId: id,
          metadata: { moveOutDate: dto.moveOutDate },
        },
      });

      return updated;
    });
  }

  /**
   * Helper: recalculates and sets room status based on remaining occupied beds.
   */
  private async recalculateRoomStatus(
    tx: Prisma.TransactionClient,
    roomId: string,
  ) {
    const beds = await tx.bed.findMany({
      where: { roomId, status: { not: 'ARCHIVED' } },
    });

    if (beds.length === 0) return;

    const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED');

    let newStatus: 'AVAILABLE' | 'PARTIALLY_OCCUPIED' | 'OCCUPIED' =
      'AVAILABLE';
    if (occupiedBeds.length === beds.length) {
      newStatus = 'OCCUPIED';
    } else if (occupiedBeds.length > 0) {
      newStatus = 'PARTIALLY_OCCUPIED';
    }

    await tx.room.update({
      where: { id: roomId },
      data: { status: newStatus },
    });
  }
}
