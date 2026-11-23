var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, ConflictException, Injectable, } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { AdminAuditService, } from './admin-audit.service.js';
let AdminGovernanceService = class AdminGovernanceService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async listCases(query) {
        const where = {
            ...(query.type ? { type: query.type } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.priority ? { priority: query.priority } : {}),
            ...(query.organizationId ? { organizationId: query.organizationId } : {}),
            ...(query.assignedToUserId
                ? { assignedToUserId: query.assignedToUserId }
                : {}),
            ...(query.search
                ? {
                    OR: [
                        { title: { contains: query.search, mode: 'insensitive' } },
                        { description: { contains: query.search, mode: 'insensitive' } },
                        { targetType: { contains: query.search, mode: 'insensitive' } },
                        { targetId: { contains: query.search } },
                    ],
                }
                : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.adminCase.findMany({
                where,
                skip: (query.page - 1) * query.limit,
                take: query.limit,
                orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
                include: {
                    createdBy: {
                        select: { id: true, email: true, firstName: true, lastName: true },
                    },
                    assignedTo: {
                        select: { id: true, email: true, firstName: true, lastName: true },
                    },
                },
            }),
            this.prisma.adminCase.count({ where }),
        ]);
        return buildOffsetResponse(items, total, query.page, query.limit);
    }
    async createCase(dto, actor, request) {
        if (dto.organizationId) {
            const organization = await this.prisma.organization.findUnique({
                where: { id: dto.organizationId },
                select: { id: true },
            });
            if (!organization)
                throw new NotFoundError('Organization', dto.organizationId);
        }
        if (dto.assignedToUserId)
            await this.assertActiveAdmin(dto.assignedToUserId);
        if (dto.idempotencyKey) {
            const existing = await this.prisma.adminCase.findUnique({
                where: { idempotencyKey: dto.idempotencyKey },
            });
            if (existing)
                return existing;
        }
        return this.prisma.$transaction(async (tx) => {
            const adminCase = await tx.adminCase.create({
                data: {
                    ...dto,
                    evidence: dto.evidence,
                    createdByUserId: actor.userId,
                },
            });
            await this.audit.record(actor.userId, 'platform_case.create', 'AdminCase', adminCase.id, {
                organizationId: dto.organizationId,
                metadata: {
                    type: dto.type,
                    priority: dto.priority,
                    targetType: dto.targetType,
                    targetId: dto.targetId,
                },
                request,
                client: tx,
            });
            return adminCase;
        });
    }
    async updateCase(id, dto, actor, request) {
        const adminCase = await this.prisma.adminCase.findUnique({ where: { id } });
        if (!adminCase)
            throw new NotFoundError('Admin case', id);
        if (dto.assignedToUserId)
            await this.assertActiveAdmin(dto.assignedToUserId);
        const nextStatus = dto.status ?? adminCase.status;
        const transitions = {
            OPEN: ['OPEN', 'IN_REVIEW', 'BLOCKED', 'RESOLVED', 'REJECTED'],
            IN_REVIEW: ['IN_REVIEW', 'BLOCKED', 'RESOLVED', 'REJECTED'],
            BLOCKED: ['BLOCKED', 'IN_REVIEW', 'RESOLVED', 'REJECTED'],
            RESOLVED: ['RESOLVED', 'IN_REVIEW'],
            REJECTED: ['REJECTED', 'IN_REVIEW'],
        };
        if (!transitions[adminCase.status]?.includes(nextStatus)) {
            throw new ConflictException(`Invalid case transition from ${adminCase.status} to ${nextStatus}`);
        }
        if (['RESOLVED', 'REJECTED'].includes(nextStatus) &&
            !(dto.resolution ?? adminCase.resolution)) {
            throw new BadRequestException('A resolution is required to close a case');
        }
        const closedAt = ['RESOLVED', 'REJECTED'].includes(nextStatus)
            ? new Date()
            : null;
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.adminCase.update({
                where: { id },
                data: {
                    status: dto.status,
                    priority: dto.priority,
                    assignedToUserId: dto.assignedToUserId,
                    resolution: dto.resolution,
                    evidence: dto.evidence,
                    dueAt: dto.dueAt,
                    closedAt,
                },
            });
            await this.audit.record(actor.userId, 'platform_case.update', 'AdminCase', id, {
                organizationId: adminCase.organizationId,
                metadata: {
                    reason: dto.reason,
                    before: {
                        status: adminCase.status,
                        priority: adminCase.priority,
                        assignedToUserId: adminCase.assignedToUserId,
                    },
                    after: {
                        status: updated.status,
                        priority: updated.priority,
                        assignedToUserId: updated.assignedToUserId,
                    },
                },
                request,
                client: tx,
            });
            return updated;
        });
    }
    async listSettings(query) {
        const where = query.search
            ? {
                OR: [
                    { key: { contains: query.search, mode: 'insensitive' } },
                    { description: { contains: query.search, mode: 'insensitive' } },
                ],
            }
            : {};
        const [items, total] = await this.prisma.$transaction([
            this.prisma.platformSetting.findMany({
                where,
                skip: (query.page - 1) * query.limit,
                take: query.limit,
                orderBy: { key: 'asc' },
                include: {
                    updatedBy: { select: { id: true, email: true, firstName: true } },
                },
            }),
            this.prisma.platformSetting.count({ where }),
        ]);
        return buildOffsetResponse(items, total, query.page, query.limit);
    }
    async upsertSetting(key, dto, actor, request) {
        if (!/^[a-z][a-z0-9_.-]{2,99}$/.test(key)) {
            throw new BadRequestException('Invalid platform setting key');
        }
        if (dto.value === undefined || JSON.stringify(dto.value).length > 50_000) {
            throw new BadRequestException('Setting value is required and limited to 50KB');
        }
        const existing = await this.prisma.platformSetting.findUnique({
            where: { key },
        });
        if (existing && dto.expectedVersion === undefined) {
            throw new ConflictException('expectedVersion is required when updating a setting');
        }
        if (existing && existing.version !== dto.expectedVersion) {
            throw new ConflictException(`Setting version changed; expected ${dto.expectedVersion}, current ${existing.version}`);
        }
        return this.prisma.$transaction(async (tx) => {
            const value = dto.value;
            const setting = existing
                ? await tx.platformSetting.update({
                    where: { id: existing.id },
                    data: {
                        value,
                        description: dto.description,
                        isPublic: dto.isPublic,
                        version: { increment: 1 },
                        updatedByUserId: actor.userId,
                    },
                })
                : await tx.platformSetting.create({
                    data: {
                        key,
                        value,
                        description: dto.description,
                        isPublic: dto.isPublic,
                        updatedByUserId: actor.userId,
                    },
                });
            await this.audit.record(actor.userId, existing ? 'platform_setting.update' : 'platform_setting.create', 'PlatformSetting', setting.id, {
                metadata: {
                    key,
                    reason: dto.reason,
                    beforeVersion: existing?.version,
                    afterVersion: setting.version,
                },
                request,
                client: tx,
            });
            return setting;
        });
    }
    async assertActiveAdmin(userId) {
        const admin = await this.prisma.platformAdmin.findUnique({
            where: { userId },
            include: { user: { select: { isActive: true } } },
        });
        if (!admin || admin.status !== 'ACTIVE' || !admin.user.isActive) {
            throw new BadRequestException('Assigned user is not an active platform admin');
        }
    }
};
AdminGovernanceService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        AdminAuditService])
], AdminGovernanceService);
export { AdminGovernanceService };
//# sourceMappingURL=admin-governance.service.js.map