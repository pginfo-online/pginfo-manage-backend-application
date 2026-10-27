import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { ComplaintStateMachine } from '../domain/complaint-state-machine.js';
import type {
  CreateComplaintDto,
  UpdateComplaintStatusDto,
  AssignComplaintDto,
  AddCommentDto,
  CreateComplaintCategoryDto,
  QueryComplaintsDto,
} from '../api/dto/complaint.dto.js';
import { Prisma, ComplaintStatus } from '@prisma/client';

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new complaint and logs initial history.
   */
  async create(dto: CreateComplaintDto, orgId: string, userId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, organizationId: orgId },
    });

    if (!property) {
      throw new NotFoundError('Property', dto.propertyId);
    }

    const category = await this.prisma.complaintCategory.findFirst({
      where: { id: dto.categoryId, organizationId: orgId, isActive: true },
    });

    if (!category) {
      throw new NotFoundError('Complaint Category', dto.categoryId);
    }

    if (dto.roomId) {
      const room = await this.prisma.room.findFirst({
        where: { id: dto.roomId, propertyId: dto.propertyId },
      });
      if (!room) {
        throw new NotFoundError('Room', dto.roomId);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const initialStatus: ComplaintStatus = dto.assignedTo
        ? 'VERIFIED'
        : 'RECEIVED';

      const complaint = await tx.complaint.create({
        data: {
          organizationId: orgId,
          propertyId: dto.propertyId,
          categoryId: dto.categoryId,
          roomId: dto.roomId,
          location: dto.location,
          description: dto.description,
          urgency: dto.urgency,
          status: initialStatus,
          assignedTo: dto.assignedTo,
          createdBy: userId,
        },
        include: {
          category: { select: { name: true } },
          property: { select: { name: true } },
          room: { select: { roomNumber: true } },
        },
      });

      // Initial history record
      await tx.complaintHistory.create({
        data: {
          complaintId: complaint.id,
          fromStatus: 'RECEIVED',
          toStatus: initialStatus,
          changedBy: userId,
          notes: 'Complaint logged',
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'complaint.create',
          entityType: 'Complaint',
          entityId: complaint.id,
          metadata: { urgency: dto.urgency, category: category.name },
        },
      });

      return complaint;
    });
  }

  /**
   * Lists complaints with filters, urgency ordering, and pagination.
   */
  async findAll(orgId: string, query: QueryComplaintsDto) {
    const where: Prisma.ComplaintWhereInput = {
      organizationId: orgId,
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.urgency ? { urgency: query.urgency } : {}),
      ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}),
      ...(query.search
        ? {
            description: { contains: query.search, mode: 'insensitive' },
          }
        : {}),
    };

    const [total, complaints] = await Promise.all([
      this.prisma.complaint.count({ where }),
      this.prisma.complaint.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
        include: {
          category: { select: { id: true, name: true } },
          property: { select: { id: true, name: true } },
          room: { select: { id: true, roomNumber: true } },
          _count: { select: { comments: true } },
        },
      }),
    ]);

    const formatted = complaints.map((c) => ({
      ...c,
      commentCount: c._count.comments,
      _count: undefined,
    }));

    return buildOffsetResponse(formatted, total, query.page, query.limit);
  }

  /**
   * Retrieves single complaint with comments and audit history.
   */
  async findById(id: string, orgId: string) {
    const complaint = await this.prisma.complaint.findFirst({
      where: { id, organizationId: orgId },
      include: {
        category: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true, floor: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
        },
        history: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundError('Complaint', id);
    }

    return complaint;
  }

  /**
   * Updates complaint status with state machine enforcement and history logging.
   */
  async updateStatus(
    id: string,
    dto: UpdateComplaintStatusDto,
    orgId: string,
    userId: string,
  ) {
    const complaint = await this.prisma.complaint.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!complaint) {
      throw new NotFoundError('Complaint', id);
    }

    // Enforce business state machine
    ComplaintStateMachine.validateTransition(complaint.status, dto.status);

    return this.prisma.$transaction(async (tx) => {
      const isResolved = dto.status === 'RESOLVED';

      const updated = await tx.complaint.update({
        where: { id },
        data: {
          status: dto.status,
          resolution: dto.resolution ?? complaint.resolution,
          resolvedAt: isResolved ? new Date() : null,
        },
      });

      // Record history
      await tx.complaintHistory.create({
        data: {
          complaintId: id,
          fromStatus: complaint.status,
          toStatus: dto.status,
          changedBy: userId,
          notes: dto.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'complaint.status_change',
          entityType: 'Complaint',
          entityId: id,
          metadata: {
            from: complaint.status,
            to: dto.status,
          },
        },
      });

      return updated;
    });
  }

  /**
   * Assigns a staff member to handle the complaint.
   */
  async assign(
    id: string,
    dto: AssignComplaintDto,
    orgId: string,
    userId: string,
  ) {
    const complaint = await this.prisma.complaint.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!complaint) {
      throw new NotFoundError('Complaint', id);
    }

    const staff = await this.prisma.staff.findFirst({
      where: { id: dto.assignedTo, organizationId: orgId, status: 'ACTIVE' },
    });

    if (!staff) {
      throw new NotFoundError('Staff Member', dto.assignedTo);
    }

    return this.prisma.$transaction(async (tx) => {
      const nextStatus: ComplaintStatus =
        complaint.status === 'RECEIVED' ? 'TEAM_WORKING' : complaint.status;

      const updated = await tx.complaint.update({
        where: { id },
        data: {
          assignedTo: dto.assignedTo,
          status: nextStatus,
        },
      });

      if (nextStatus !== complaint.status) {
        await tx.complaintHistory.create({
          data: {
            complaintId: id,
            fromStatus: complaint.status,
            toStatus: nextStatus,
            changedBy: userId,
            notes: dto.notes ?? `Assigned to ${staff.firstName}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId,
          action: 'complaint.assign',
          entityType: 'Complaint',
          entityId: id,
          metadata: { assignedToStaffId: dto.assignedTo },
        },
      });

      return updated;
    });
  }

  /**
   * Adds a discussion comment to a complaint.
   */
  async addComment(
    id: string,
    dto: AddCommentDto,
    orgId: string,
    userId: string,
  ) {
    const complaint = await this.prisma.complaint.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!complaint) {
      throw new NotFoundError('Complaint', id);
    }

    return this.prisma.complaintComment.create({
      data: {
        complaintId: id,
        authorId: userId,
        content: dto.content,
      },
    });
  }

  /**
   * Lists active complaint categories for the organization.
   */
  async getCategories(orgId: string) {
    return this.prisma.complaintCategory.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Adds a custom complaint category for the organization.
   */
  async createCategory(dto: CreateComplaintCategoryDto, orgId: string) {
    const existing = await this.prisma.complaintCategory.findUnique({
      where: {
        organizationId_name: {
          organizationId: orgId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      if (!existing.isActive) {
        return this.prisma.complaintCategory.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }
      throw new ConflictError(
        `Complaint category '${dto.name}' already exists`,
      );
    }

    return this.prisma.complaintCategory.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        isSystem: false,
      },
    });
  }
}
