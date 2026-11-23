var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LeadsService_1;
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
let LeadsService = LeadsService_1 = class LeadsService {
    prisma;
    logger = new Logger(LeadsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, orgId) {
        const property = await this.prisma.property.findFirst({
            where: { id: dto.propertyId, organizationId: orgId },
        });
        if (!property) {
            throw new NotFoundError('Property', dto.propertyId);
        }
        const lead = await this.prisma.lead.create({
            data: {
                organizationId: orgId,
                propertyId: dto.propertyId,
                name: dto.name,
                mobile: dto.mobile,
                email: dto.email,
                budget: dto.budget,
                sharingPreference: dto.sharingPreference,
                source: dto.source || 'walk_in',
                notes: dto.notes,
                visitScheduledAt: dto.visitScheduledAt,
            },
        });
        this.logger.log(`Created lead ${lead.id} (${lead.name})`);
        return lead;
    }
    async findAll(orgId, query) {
        const { propertyId, status, search, page, limit } = query;
        const skip = (page - 1) * limit;
        const where = {
            organizationId: orgId,
            ...(propertyId ? { propertyId } : {}),
            ...(status ? { status } : {}),
            ...(search
                ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { mobile: { contains: search } },
                        { email: { contains: search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [items, total] = await Promise.all([
            this.prisma.lead.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.lead.count({ where }),
        ]);
        return buildOffsetResponse(items, total, page, limit);
    }
    async findById(id, orgId) {
        const lead = await this.prisma.lead.findFirst({
            where: { id, organizationId: orgId },
            include: { property: { select: { id: true, name: true, city: true } } },
        });
        if (!lead) {
            throw new NotFoundError('Lead', id);
        }
        return lead;
    }
    async stats(orgId, propertyId) {
        const groups = await this.prisma.lead.groupBy({
            by: ['status'],
            where: { organizationId: orgId, ...(propertyId ? { propertyId } : {}) },
            _count: true,
        });
        const byStatus = Object.fromEntries(groups.map((group) => [group.status, group._count]));
        return {
            total: groups.reduce((sum, group) => sum + group._count, 0),
            byStatus,
            conversionRate: groups.length === 0
                ? 0
                : Math.round(((byStatus['CONVERTED'] ?? 0) /
                    groups.reduce((sum, group) => sum + group._count, 0)) *
                    100),
        };
    }
    async update(id, dto, orgId) {
        await this.findById(id, orgId);
        return this.prisma.lead.update({
            where: { id },
            data: {
                ...(dto.name ? { name: dto.name } : {}),
                ...(dto.mobile ? { mobile: dto.mobile } : {}),
                ...(dto.email !== undefined ? { email: dto.email } : {}),
                ...(dto.budget !== undefined ? { budget: dto.budget } : {}),
                ...(dto.sharingPreference !== undefined
                    ? { sharingPreference: dto.sharingPreference }
                    : {}),
                ...(dto.status ? { status: dto.status } : {}),
                ...(dto.source !== undefined ? { source: dto.source } : {}),
                ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
                ...(dto.visitScheduledAt !== undefined
                    ? { visitScheduledAt: dto.visitScheduledAt }
                    : {}),
            },
        });
    }
    async delete(id, orgId) {
        await this.findById(id, orgId);
        await this.prisma.lead.delete({ where: { id } });
        return { success: true, message: 'Lead deleted successfully' };
    }
};
LeadsService = LeadsService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], LeadsService);
export { LeadsService };
//# sourceMappingURL=leads.service.js.map