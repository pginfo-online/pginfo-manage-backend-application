import { randomUUID } from 'node:crypto';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import type {
  CreateResidentDto,
  BulkMoveOutDto,
  NoticeDto,
  UpdateResidentDto,
  ReallocateResidentDto,
  SwapBedsDto,
  MoveOutDto,
  QueryResidentsDto,
} from '../api/dto/resident.dto.js';
import { Prisma, ResidentStatus } from '@prisma/client';
import {
  dateKeyInTimeZone,
  dateOnlyKey,
} from '../../../common/time/property-date.js';

@Injectable()
export class ResidentsService {
  private readonly logger = new Logger(ResidentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Onboards a new resident and allocates room/bed in an atomic transaction.
   */
  async create(dto: CreateResidentDto, orgId: string, userId: string) {
    try {
      return await this.createResident(dto, orgId, userId);
    } catch (error) {
      if (dto.onboardingKey) {
        const previous = await this.prisma.resident.findFirst({
          where: { id: dto.onboardingKey, organizationId: orgId },
        });
        if (previous) return previous;
      }
      throw error;
    }
  }

  private async createResident(
    dto: CreateResidentDto,
    orgId: string,
    userId: string,
  ) {
    const [property, room, bed] = await Promise.all([
      this.prisma.property.findFirst({
        where: { id: dto.propertyId, organizationId: orgId },
        select: { id: true, timezone: true, rentDueDay: true },
      }),
      dto.roomId
        ? this.prisma.room.findFirst({
            where: {
              id: dto.roomId,
              propertyId: dto.propertyId,
              organizationId: orgId,
              status: { not: 'ARCHIVED' },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      dto.bedId
        ? this.prisma.bed.findFirst({
            where: {
              id: dto.bedId,
              organizationId: orgId,
              room: { propertyId: dto.propertyId },
            },
            select: {
              id: true,
              roomId: true,
              bedNumber: true,
              residents: {
                where: {
                  status: {
                    in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'],
                  },
                },
                select: { firstName: true },
              },
            },
          })
        : Promise.resolve(null),
    ]);

    if (!property) {
      throw new NotFoundError('Property', dto.propertyId);
    }

    if (dto.roomId && !room) throw new NotFoundError('Room', dto.roomId);
    if (dto.bedId && !bed) throw new NotFoundError('Bed', dto.bedId);
    if (bed && bed.roomId !== dto.roomId) {
      throw new ConflictError(
        'Selected bed does not belong to the selected room',
      );
    }
    if (bed && bed.residents.length > 0) {
      throw new ConflictError(
        `Bed ${bed.bedNumber} is already occupied by ${bed.residents[0]?.firstName}`,
      );
    }

    const initialStatus: ResidentStatus =
      dateOnlyKey(dto.joiningDate) >
      dateKeyInTimeZone(new Date(), property.timezone)
        ? 'PENDING_MOVE_IN'
        : 'ACTIVE';

    return this.prisma.$transaction(async (tx) => {
      if (dto.bedId) {
        const claimed = await tx.bed.updateMany({
          where: {
            id: dto.bedId,
            organizationId: orgId,
            status: 'AVAILABLE',
          },
          data: {
            status: initialStatus === 'ACTIVE' ? 'OCCUPIED' : 'RESERVED',
          },
        });
        if (claimed.count !== 1) {
          throw new ConflictError('The selected bed is no longer available');
        }
      }

      const resident = await tx.resident.create({
        data: {
          id: dto.onboardingKey,
          organizationId: orgId,
          propertyId: dto.propertyId,
          roomId: dto.roomId,
          bedId: dto.bedId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          mobile: dto.mobile,
          whatsappNumber: dto.whatsappNumber,
          alternatePhone: dto.alternatePhone,
          sendWhatsappReminder: dto.sendWhatsappReminder,
          emergencyContact: dto.emergencyContact,
          permanentAddress: dto.permanentAddress,
          parentName: dto.parentName,
          parentPhone: dto.parentPhone,
          idProofUrl: dto.idProofUrl,
          agreementUrl: dto.agreementUrl,
          profession: dto.profession,
          stayType: dto.stayType,
          tenantType: dto.tenantType,
          noticePeriodDays: dto.noticePeriodDays,
          agreementPeriodMonths: dto.agreementPeriodMonths,
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

      const openings = (dto.openingBalances ?? []).map((entry) => ({
        ...entry,
        id: randomUUID(),
      }));
      const charges = openings.filter((entry) => entry.amount > 0);
      if (charges.length) {
        await tx.billingRecord.createMany({
          data: charges.map((entry) => ({
            id: entry.id,
            organizationId: orgId,
            residentId: resident.id,
            propertyId: dto.propertyId,
            type: entry.type,
            amount: entry.amount,
            paidAmount: entry.collectedAmount,
            status:
              entry.collectedAmount === entry.amount
                ? 'PAID'
                : entry.collectedAmount > 0
                  ? 'PARTIALLY_PAID'
                  : 'ISSUED',
            dueDate: entry.dueDate,
            periodEnd: entry.dueEndDate,
            attachmentUrls: entry.attachmentUrls,
            description: entry.description,
          })),
        });
      }
      const collections = openings.filter((entry) => entry.collectedAmount > 0);
      if (collections.length) {
        await tx.payment.createMany({
          data: collections.map((entry) => ({
            organizationId: orgId,
            residentId: resident.id,
            billingRecordId: entry.amount > 0 ? entry.id : null,
            amount: entry.collectedAmount,
            status: 'CONFIRMED',
            mode: entry.collectionMode,
            collectionDate: entry.collectionDate ?? dto.joiningDate,
            recordedBy: userId,
            notes: entry.description ?? 'Opening balance collection',
          })),
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
      AND: query.search?.split(/\s+/).map((term) => ({
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { mobile: { contains: term } },
          { alternatePhone: { contains: term } },
        ],
      })),
    };

    const [total, residents] = await Promise.all([
      this.prisma.resident.count({ where }),
      this.prisma.resident.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          mandates: {
            where: {
              organizationId: orgId,
              status: 'ACTIVE',
              collectionMode: 'AUTOPAY',
            },
            select: { id: true },
            take: 1,
          },
          property: { select: { id: true, name: true, type: true } },
          room: { select: { id: true, roomNumber: true, floor: true } },
          bed: { select: { id: true, bedNumber: true } },
        },
      }),
    ]);

    const residentIds = residents.map((r) => r.id);

    // Group-by billing records for authoritatively computing outstanding dues & overdue status
    const [unpaidRecords, overdueRecords] = await Promise.all([
      residentIds.length > 0
        ? this.prisma.billingRecord.groupBy({
            by: ['residentId'],
            where: {
              residentId: { in: residentIds },
              organizationId: orgId,
              status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
            },
            _sum: {
              amount: true,
              paidAmount: true,
            },
          })
        : [],
      residentIds.length > 0
        ? this.prisma.billingRecord.groupBy({
            by: ['residentId'],
            where: {
              residentId: { in: residentIds },
              organizationId: orgId,
              status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
              dueDate: { lt: new Date() },
            },
          })
        : [],
    ]);

    const overdueSet = new Set(overdueRecords.map((o) => o.residentId));
    const duesMap = new Map<string, number>();
    for (const rec of unpaidRecords) {
      const amount = rec._sum.amount ?? 0;
      const paid = rec._sum.paidAmount ?? 0;
      duesMap.set(rec.residentId, Math.max(0, amount - paid));
    }

    const formatted = residents.map(({ mandates, ...r }) => {
      const dues = duesMap.get(r.id) ?? 0;
      return {
        ...r,
        autopayActive: mandates.length > 0,
        dues,
        isOverdue: overdueSet.has(r.id),
      };
    });

    return buildOffsetResponse(formatted, total, query.page, query.limit);
  }

  /**
   * Retrieves single resident with financial summary and occupancy history.
   */
  async findById(id: string, orgId: string) {
    const resident = await this.prisma.resident.findFirst({
      where: { id, organizationId: orgId },
      include: {
        mandates: {
          where: {
            organizationId: orgId,
            status: 'ACTIVE',
            collectionMode: 'AUTOPAY',
          },
          select: { id: true },
          take: 1,
        },

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

    const { mandates, ...profile } = resident;
    return {
      ...profile,
      autopayActive: mandates.length > 0,
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

    const propertyId = dto.propertyId ?? resident.propertyId;
    const oldRoomId = resident.roomId;
    const oldBedId = resident.bedId;
    const newRent = dto.newRentAmount ?? resident.monthlyRent;

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.room.findFirst({
        where: {
          id: dto.roomId,
          organizationId: orgId,
          propertyId,
          status: { not: 'ARCHIVED' },
        },
        select: { id: true },
      });
      if (!room) throw new NotFoundError('Target room', dto.roomId);

      if (propertyId !== resident.propertyId) {
        await this.requireAutopayCancelled(
          tx,
          orgId,
          residentId,
          'changing property',
        );
      }

      const updated = await tx.resident.updateMany({
        where: {
          id: residentId,
          organizationId: orgId,
          version: resident.version,
        },
        data: {
          propertyId,
          roomId: room.id,
          monthlyRent: newRent,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1)
        throw new ConflictError('Tenant allocation has changed');

      if (oldBedId && oldBedId !== dto.bedId) {
        await tx.bed.update({
          where: { id: oldBedId },
          data: { status: 'AVAILABLE' },
        });
      }

      if (dto.bedId && dto.bedId !== oldBedId) {
        const claimed = await tx.bed.updateMany({
          where: {
            id: dto.bedId,
            roomId: room.id,
            organizationId: orgId,
            status: 'AVAILABLE',
          },
          data: { status: 'OCCUPIED' },
        });
        if (claimed.count !== 1)
          throw new ConflictError('The selected bed is no longer available');
      }
      if (dto.bedId && dto.bedId === oldBedId && oldRoomId !== room.id) {
        throw new ConflictError(
          'Selected bed does not belong to the selected room',
        );
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
          propertyId,
          roomId: dto.roomId,
          bedId: dto.bedId,
          monthlyRent: newRent,
          startDate: new Date(),
          reason: dto.reason,
        },
      });

      const updatedResident = await tx.resident.update({
        where: { id: residentId },
        data: { bedId: dto.bedId ?? null },
      });

      const roomIds =
        oldRoomId && oldRoomId !== dto.roomId
          ? [oldRoomId, dto.roomId]
          : [dto.roomId];
      for (const roomId of roomIds.sort()) {
        await this.recalculateRoomStatus(tx, roomId);
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'resident.reallocate',
          entityType: 'Resident',
          entityId: residentId,
          metadata: {
            fromPropertyId: resident.propertyId,
            toPropertyId: propertyId,
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
  async giveNotice(id: string, dto: NoticeDto, orgId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.resident.updateMany({
        where: {
          id,
          organizationId: orgId,
          status: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
        },
        data: {
          status: 'NOTICE_PERIOD',
          expectedVacatingDate: dto.date,
          version: { increment: 1 },
        },
      });
      if (!updated.count)
        throw new ConflictError('Notice requires an active tenant');
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'resident.notice',
          entityType: 'Resident',
          entityId: id,
          metadata: { reason: dto.reason, expectedVacatingDate: dto.date },
        },
      });
      return { updated: true };
    });
  }

  async bulkMoveOut(dto: BulkMoveOutDto, orgId: string, userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        for (const id of dto.residentIds) {
          await this.moveOutInTransaction(
            tx,
            id,
            dto,
            orgId,
            userId,
            dto.archive,
          );
        }
        return { updated: dto.residentIds.length };
      },
      { timeout: 15000 },
    );
  }

  async moveOut(id: string, dto: MoveOutDto, orgId: string, userId: string) {
    return this.prisma.$transaction((tx) =>
      this.moveOutInTransaction(tx, id, dto, orgId, userId, false),
    );
  }

  private async moveOutInTransaction(
    tx: Prisma.TransactionClient,
    id: string,
    dto: MoveOutDto,
    orgId: string,
    userId: string,
    archive: boolean,
  ) {
    const resident = await tx.resident.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!resident) {
      throw new NotFoundError('Resident', id);
    }

    if (
      (!archive && resident.status === 'MOVED_OUT') ||
      resident.status === 'ARCHIVED'
    ) {
      throw new BadRequestException('Resident has already moved out');
    }

    if (resident.status !== 'MOVED_OUT') {
      await this.requireAutopayCancelled(
        tx,
        orgId,
        id,
        'moving the tenant out',
      );
    }
    // Update resident status
    const updated = await tx.resident.update({
      where: { id, version: resident.version },
      data: {
        status: archive ? 'ARCHIVED' : 'MOVED_OUT',
        moveOutDate: resident.moveOutDate ?? dto.moveOutDate,
        bedId: null, // Clear active bed reference
        notes: dto.notes
          ? `${resident.notes ?? ''}\nMove-out note: ${dto.notes}`
          : resident.notes,
        version: { increment: 1 },
      },
    });

    // Free up bed
    if (resident.bedId) {
      await tx.bed.update({
        where: { id: resident.bedId },
        data: { status: 'AVAILABLE' },
      });
    }

    // Close any active occupancy records in one write.
    await tx.occupancyRecord.updateMany({
      where: { residentId: id, endDate: null },
      data: {
        endDate: dto.moveOutDate,
        reason: 'move_out',
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
        action: archive ? 'resident.archive' : 'resident.move_out',
        entityType: 'Resident',
        entityId: id,
        metadata: { moveOutDate: dto.moveOutDate },
      },
    });

    return updated;
  }

  private async requireAutopayCancelled(
    tx: Prisma.TransactionClient,
    orgId: string,
    residentId: string,
    action: string,
  ) {
    const mandate = await tx.tenantMandate.findFirst({
      where: {
        organizationId: orgId,
        tenantId: residentId,
        collectionMode: 'AUTOPAY',
        status: {
          in: ['CREATED', 'AUTHENTICATED', 'ACTIVE', 'PENDING', 'PAUSED'],
        },
      },
      select: { id: true },
    });
    if (mandate)
      throw new ConflictError(
        'Cancel the existing Autopay mandate before ' + action,
      );
  }

  /**
   * Helper: recalculates and sets room status based on remaining occupied beds.
   */
  private async recalculateRoomStatus(
    tx: Prisma.TransactionClient,
    roomId: string,
  ) {
    await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${roomId}::uuid FOR NO KEY UPDATE`;
    const bedCounts = await tx.bed.groupBy({
      by: ['status'],
      where: { roomId, status: { not: 'ARCHIVED' } },
      _count: true,
    });

    let totalBeds = 0;
    let occupiedBeds = 0;
    for (const bedCount of bedCounts) {
      totalBeds += bedCount._count;
      if (bedCount.status === 'OCCUPIED') {
        occupiedBeds = bedCount._count;
      }
    }
    if (totalBeds === 0) return;

    let newStatus: 'AVAILABLE' | 'PARTIALLY_OCCUPIED' | 'OCCUPIED' =
      'AVAILABLE';
    if (occupiedBeds === totalBeds) {
      newStatus = 'OCCUPIED';
    } else if (occupiedBeds > 0) {
      newStatus = 'PARTIALLY_OCCUPIED';
    }

    await tx.room.update({
      where: { id: roomId },
      data: { status: newStatus },
    });
  }
}
