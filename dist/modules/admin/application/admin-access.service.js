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
import { resolvePermissions } from '../domain/admin-permissions.js';
import { AdminAuditService, } from './admin-audit.service.js';
let AdminAccessService = class AdminAccessService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async me(actor) {
        const admin = await this.prisma.platformAdmin.findUnique({
            where: { id: actor.id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        mobile: true,
                        firstName: true,
                        lastName: true,
                        lastLoginAt: true,
                    },
                },
            },
        });
        if (!admin)
            throw new NotFoundError('Platform administrator', actor.id);
        return {
            ...admin,
            permissions: resolvePermissions(admin.role, admin.permissionOverrides),
        };
    }
    async list(query) {
        const where = query.search
            ? {
                user: {
                    OR: [
                        { email: { contains: query.search, mode: 'insensitive' } },
                        { firstName: { contains: query.search, mode: 'insensitive' } },
                        { lastName: { contains: query.search, mode: 'insensitive' } },
                    ],
                },
            }
            : {};
        const [items, total] = await this.prisma.$transaction([
            this.prisma.platformAdmin.findMany({
                where,
                skip: (query.page - 1) * query.limit,
                take: query.limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            isActive: true,
                            lastLoginAt: true,
                        },
                    },
                },
            }),
            this.prisma.platformAdmin.count({ where }),
        ]);
        return buildOffsetResponse(items, total, query.page, query.limit);
    }
    async create(dto, actor, request) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            select: { id: true, email: true, isActive: true },
        });
        if (!user)
            throw new NotFoundError('User', dto.email);
        if (!user.isActive) {
            throw new BadRequestException('Cannot grant admin access to inactive user');
        }
        const existing = await this.prisma.platformAdmin.findUnique({
            where: { userId: user.id },
        });
        if (existing) {
            throw new ConflictException('User already has a platform administrator');
        }
        return this.prisma.$transaction(async (tx) => {
            const admin = await tx.platformAdmin.create({
                data: {
                    userId: user.id,
                    role: dto.role,
                    permissionOverrides: dto.permissionOverrides,
                    createdByUserId: actor.userId,
                },
                include: {
                    user: {
                        select: { id: true, email: true, firstName: true, lastName: true },
                    },
                },
            });
            await this.audit.record(actor.userId, 'platform_admin.create', 'PlatformAdmin', admin.id, {
                metadata: { userId: user.id, role: dto.role },
                request,
                client: tx,
            });
            return admin;
        });
    }
    async update(id, dto, actor, request) {
        const target = await this.prisma.platformAdmin.findUnique({
            where: { id },
        });
        if (!target)
            throw new NotFoundError('Platform administrator', id);
        if (target.userId === actor.userId &&
            dto.status &&
            dto.status !== 'ACTIVE') {
            throw new BadRequestException('Administrators cannot suspend themselves');
        }
        const removesActiveSuperAdmin = target.role === 'SUPER_ADMIN' &&
            target.status === 'ACTIVE' &&
            ((dto.role !== undefined && dto.role !== 'SUPER_ADMIN') ||
                (dto.status !== undefined && dto.status !== 'ACTIVE'));
        if (removesActiveSuperAdmin) {
            const activeSuperAdmins = await this.prisma.platformAdmin.count({
                where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
            });
            if (activeSuperAdmins <= 1) {
                throw new ConflictException('At least one active super admin is required');
            }
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.platformAdmin.update({
                where: { id },
                data: {
                    role: dto.role,
                    status: dto.status,
                    permissionOverrides: dto.permissionOverrides,
                },
                include: {
                    user: { select: { id: true, email: true, firstName: true } },
                },
            });
            await this.audit.record(actor.userId, 'platform_admin.update', 'PlatformAdmin', id, {
                metadata: {
                    reason: dto.reason,
                    before: {
                        role: target.role,
                        status: target.status,
                        permissionOverrides: target.permissionOverrides,
                    },
                    after: {
                        role: updated.role,
                        status: updated.status,
                        permissionOverrides: updated.permissionOverrides,
                    },
                },
                request,
                client: tx,
            });
            return updated;
        });
    }
    async updateUserStatus(id, dto, actor, request) {
        if (id === actor.userId && !dto.isActive) {
            throw new BadRequestException('Administrators cannot deactivate themselves');
        }
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { platformAdmin: true },
        });
        if (!user)
            throw new NotFoundError('User', id);
        if (!dto.isActive && user.platformAdmin?.status === 'ACTIVE') {
            throw new ConflictException('Revoke platform administrator access before deactivating this user');
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.user.update({
                where: { id },
                data: { isActive: dto.isActive },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    isActive: true,
                    updatedAt: true,
                },
            });
            if (!dto.isActive) {
                await tx.refreshToken.updateMany({
                    where: { userId: id, revokedAt: null },
                    data: { revokedAt: new Date() },
                });
            }
            await this.audit.record(actor.userId, 'platform_user.status_update', 'User', id, {
                metadata: {
                    reason: dto.reason,
                    before: { isActive: user.isActive },
                    after: { isActive: dto.isActive },
                },
                request,
                client: tx,
            });
            return updated;
        });
    }
};
AdminAccessService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        AdminAuditService])
], AdminAccessService);
export { AdminAccessService };
//# sourceMappingURL=admin-access.service.js.map