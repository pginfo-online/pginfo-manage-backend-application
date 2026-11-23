import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { detectAdminWriteConflict } from './admin-write-conflict.js';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError } from '../../../common/errors/index.js';
import type { PlatformAdminContext } from '../domain/admin-permissions.js';
import type {
  ReviewPayoutDto,
  UpdateBedStatusDto,
  UpdateOrganizationStatusDto,
  UpdatePropertyStatusDto,
  UpdateRoomStatusDto,
} from '../api/dto/admin.dto.js';
import {
  AdminAuditService,
  type AdminRequestMetadata,
} from './admin-audit.service.js';

@Injectable()
export class AdminCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async updateOrganizationStatus(
    id: string,
    dto: UpdateOrganizationStatusDto,
    actor: PlatformAdminContext,
    request?: AdminRequestMetadata,
  ) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!organization) throw new NotFoundError('Organization', id);
    return detectAdminWriteConflict(
      this.prisma.$transaction(async (tx) => {
        const updated = await tx.organization.update({
          where: { id, updatedAt: organization.updatedAt },
          data: { isActive: dto.isActive },
        });
        await this.audit.record(
          actor.userId,
          'platform_organization.status_update',
          'Organization',
          id,
          {
            organizationId: id,
            metadata: {
              reason: dto.reason,
              before: { isActive: organization.isActive },
              after: { isActive: dto.isActive },
            },
            request,
            client: tx,
          },
        );
        return updated;
      }),
    );
  }

  async updatePropertyStatus(
    id: string,
    dto: UpdatePropertyStatusDto,
    actor: PlatformAdminContext,
    request?: AdminRequestMetadata,
  ) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundError('Property', id);
    if (dto.status === 'ARCHIVED') {
      const occupied = await this.prisma.resident.count({
        where: {
          propertyId: id,
          status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
        },
      });
      if (occupied > 0) {
        throw new ConflictException(
          'Move out or transfer active residents before archiving the property',
        );
      }
    }
    return detectAdminWriteConflict(
      this.prisma.$transaction(async (tx) => {
        const updated = await tx.property.update({
          where: {
            id,
            updatedAt: property.updatedAt,
            ...(dto.status === 'ARCHIVED'
              ? {
                  residents: {
                    none: {
                      status: {
                        in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'],
                      },
                    },
                  },
                }
              : {}),
          },
          data: { status: dto.status },
        });
        await this.audit.record(
          actor.userId,
          'platform_property.status_update',
          'Property',
          id,
          {
            organizationId: property.organizationId,
            metadata: {
              reason: dto.reason,
              before: { status: property.status },
              after: { status: dto.status },
            },
            request,
            client: tx,
          },
        );
        return updated;
      }),
    );
  }

  async updateRoomStatus(
    id: string,
    dto: UpdateRoomStatusDto,
    actor: PlatformAdminContext,
    request?: AdminRequestMetadata,
  ) {
    if (['OCCUPIED', 'PARTIALLY_OCCUPIED'].includes(dto.status)) {
      throw new BadRequestException(
        'Occupancy statuses are derived from bed allocations and cannot be forced',
      );
    }
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundError('Room', id);
    const activeOccupants = await this.prisma.resident.count({
      where: {
        roomId: id,
        status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
      },
    });
    if (activeOccupants > 0 && dto.status !== room.status) {
      throw new ConflictException(
        'Transfer active residents before changing this room status',
      );
    }
    return detectAdminWriteConflict(
      this.prisma.$transaction(async (tx) => {
        const updated = await tx.room.update({
          where: {
            id,
            updatedAt: room.updatedAt,
            ...(dto.status !== room.status
              ? {
                  residents: {
                    none: {
                      status: {
                        in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'],
                      },
                    },
                  },
                  beds: {
                    none: {
                      bookings: {
                        some: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
                      },
                    },
                  },
                }
              : {}),
          },
          data: { status: dto.status },
        });
        await this.audit.record(
          actor.userId,
          'platform_room.status_update',
          'Room',
          id,
          {
            organizationId: room.organizationId,
            metadata: {
              reason: dto.reason,
              before: { status: room.status },
              after: { status: dto.status },
            },
            request,
            client: tx,
          },
        );
        return updated;
      }),
    );
  }

  async updateBedStatus(
    id: string,
    dto: UpdateBedStatusDto,
    actor: PlatformAdminContext,
    request?: AdminRequestMetadata,
  ) {
    if (['OCCUPIED', 'RESERVED'].includes(dto.status)) {
      throw new BadRequestException(
        'Occupied and reserved states are derived from tenancy and booking workflows',
      );
    }
    const bed = await this.prisma.bed.findUnique({ where: { id } });
    if (!bed) throw new NotFoundError('Bed', id);
    const [activeResidents, activeBookings] = await this.prisma.$transaction([
      this.prisma.resident.count({
        where: {
          bedId: id,
          status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
        },
      }),
      this.prisma.booking.count({
        where: { bedId: id, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
      }),
    ]);
    if (
      (activeResidents > 0 || activeBookings > 0) &&
      dto.status !== bed.status
    ) {
      throw new ConflictException(
        'Resolve active residents and bookings before changing this bed status',
      );
    }
    return detectAdminWriteConflict(
      this.prisma.$transaction(async (tx) => {
        const updated = await tx.bed.update({
          where: {
            id,
            updatedAt: bed.updatedAt,
            ...(dto.status !== bed.status
              ? {
                  residents: {
                    none: {
                      status: {
                        in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'],
                      },
                    },
                  },
                  bookings: {
                    none: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
                  },
                }
              : {}),
          },
          data: { status: dto.status },
        });
        await this.audit.record(
          actor.userId,
          'platform_bed.status_update',
          'Bed',
          id,
          {
            organizationId: bed.organizationId,
            metadata: {
              reason: dto.reason,
              before: { status: bed.status },
              after: { status: dto.status },
            },
            request,
            client: tx,
          },
        );
        return updated;
      }),
    );
  }

  async reviewPayout(
    id: string,
    dto: ReviewPayoutDto,
    actor: PlatformAdminContext,
    request?: AdminRequestMetadata,
  ) {
    const account = await this.prisma.landlordPayoutAccount.findUnique({
      where: { id },
    });
    if (!account) throw new NotFoundError('Payout account', id);
    const validKycTransitions: Record<string, string[]> = {
      PENDING: ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED'],
      SUBMITTED: ['SUBMITTED', 'VERIFIED', 'REJECTED'],
      VERIFIED: ['VERIFIED', 'REJECTED'],
      REJECTED: ['REJECTED', 'SUBMITTED'],
    };
    if (!validKycTransitions[account.kycStatus]?.includes(dto.kycStatus)) {
      throw new ConflictException(
        `Invalid KYC transition from ${account.kycStatus} to ${dto.kycStatus}`,
      );
    }
    const status =
      dto.status ??
      (dto.kycStatus === 'VERIFIED'
        ? 'ACTIVE'
        : dto.kycStatus === 'REJECTED'
          ? 'REJECTED'
          : account.status);
    if (status === 'ACTIVE' && dto.kycStatus !== 'VERIFIED') {
      throw new BadRequestException(
        'Only verified payout accounts can be active',
      );
    }
    return detectAdminWriteConflict(
      this.prisma.$transaction(async (tx) => {
        const updated = await tx.landlordPayoutAccount.update({
          where: { id, updatedAt: account.updatedAt },
          data: { kycStatus: dto.kycStatus, status },
          select: {
            id: true,
            organizationId: true,
            businessName: true,
            accountNumberMasked: true,
            status: true,
            kycStatus: true,
            updatedAt: true,
          },
        });
        await this.audit.record(
          actor.userId,
          'platform_payout.review',
          'LandlordPayoutAccount',
          id,
          {
            organizationId: account.organizationId,
            metadata: {
              reason: dto.reason,
              before: { status: account.status, kycStatus: account.kycStatus },
              after: { status, kycStatus: dto.kycStatus },
            },
            request,
            client: tx,
          },
        );
        return updated;
      }),
    );
  }
}
