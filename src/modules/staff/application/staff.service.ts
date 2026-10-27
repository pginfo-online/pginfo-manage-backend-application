import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { Monetary } from '../../finance/domain/monetary.js';
import type {
  CreateStaffDto,
  UpdateStaffDto,
  CreateStaffDesignationDto,
  QueryStaffDto,
} from '../api/dto/staff.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Adds a new staff member to a property.
   */
  async create(dto: CreateStaffDto, orgId: string, userId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, organizationId: orgId },
    });

    if (!property) {
      throw new NotFoundError('Property', dto.propertyId);
    }

    const designation = await this.prisma.staffDesignation.findFirst({
      where: { id: dto.designationId, organizationId: orgId, isActive: true },
    });

    if (!designation) {
      throw new NotFoundError('Staff Designation', dto.designationId);
    }

    const staff = await this.prisma.staff.create({
      data: {
        organizationId: orgId,
        propertyId: dto.propertyId,
        designationId: dto.designationId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        mobile: dto.mobile,
        email: dto.email,
        salary: dto.salary,
        joiningDate: dto.joiningDate,
        notes: dto.notes,
      },
      include: {
        designation: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'staff.create',
        entityType: 'Staff',
        entityId: staff.id,
        metadata: { designation: designation.name },
      },
    });

    return {
      ...staff,
      salaryFormatted: staff.salary ? Monetary.formatINR(staff.salary) : null,
    };
  }

  /**
   * Lists staff members with filters and pagination.
   */
  async findAll(orgId: string, query: QueryStaffDto) {
    const where: Prisma.StaffWhereInput = {
      organizationId: orgId,
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.designationId ? { designationId: query.designationId } : {}),
      ...(query.status ? { status: query.status } : {}),
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

    const [total, staffList] = await Promise.all([
      this.prisma.staff.count({ where }),
      this.prisma.staff.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          designation: { select: { id: true, name: true } },
          property: { select: { id: true, name: true } },
        },
      }),
    ]);

    const formatted = staffList.map((s) => ({
      ...s,
      salaryFormatted: s.salary ? Monetary.formatINR(s.salary) : null,
    }));

    return buildOffsetResponse(formatted, total, query.page, query.limit);
  }

  /**
   * Retrieves single staff member details.
   */
  async findById(id: string, orgId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, organizationId: orgId },
      include: {
        designation: { select: { id: true, name: true } },
        property: {
          select: { id: true, name: true, addressLine1: true, city: true },
        },
      },
    });

    if (!staff) {
      throw new NotFoundError('Staff Member', id);
    }

    return {
      ...staff,
      salaryFormatted: staff.salary ? Monetary.formatINR(staff.salary) : null,
    };
  }

  /**
   * Updates an existing staff record.
   */
  async update(id: string, dto: UpdateStaffDto, orgId: string, userId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!staff) {
      throw new NotFoundError('Staff Member', id);
    }

    if (dto.designationId) {
      const designation = await this.prisma.staffDesignation.findFirst({
        where: { id: dto.designationId, organizationId: orgId, isActive: true },
      });
      if (!designation) {
        throw new NotFoundError('Staff Designation', dto.designationId);
      }
    }

    const updated = await this.prisma.staff.update({
      where: { id },
      data: dto,
      include: {
        designation: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'staff.update',
        entityType: 'Staff',
        entityId: id,
      },
    });

    return {
      ...updated,
      salaryFormatted: updated.salary
        ? Monetary.formatINR(updated.salary)
        : null,
    };
  }

  /**
   * Deactivates or terminates a staff member.
   */
  async deactivate(id: string, orgId: string, userId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!staff) {
      throw new NotFoundError('Staff Member', id);
    }

    const updated = await this.prisma.staff.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        exitDate: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'staff.deactivate',
        entityType: 'Staff',
        entityId: id,
      },
    });

    return updated;
  }

  /**
   * Lists active designations for the organization.
   */
  async getDesignations(orgId: string) {
    return this.prisma.staffDesignation.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Creates a custom staff designation for the organization.
   */
  async createDesignation(dto: CreateStaffDesignationDto, orgId: string) {
    const existing = await this.prisma.staffDesignation.findUnique({
      where: {
        organizationId_name: {
          organizationId: orgId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      if (!existing.isActive) {
        return this.prisma.staffDesignation.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }
      throw new ConflictError(`Staff designation '${dto.name}' already exists`);
    }

    return this.prisma.staffDesignation.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        isSystem: false,
      },
    });
  }
}
