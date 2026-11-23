var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StaffService_1;
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { Monetary } from '../../finance/domain/monetary.js';
let StaffService = StaffService_1 = class StaffService {
    prisma;
    logger = new Logger(StaffService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, orgId, userId) {
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
    async findAll(orgId, query) {
        const where = {
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
    async findById(id, orgId) {
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
    async update(id, dto, orgId, userId) {
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
    async deactivate(id, orgId, userId) {
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
    async getDesignations(orgId) {
        return this.prisma.staffDesignation.findMany({
            where: { organizationId: orgId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    async createDesignation(dto, orgId) {
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
};
StaffService = StaffService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], StaffService);
export { StaffService };
//# sourceMappingURL=staff.service.js.map