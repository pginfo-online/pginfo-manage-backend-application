var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OrganizationsService_1;
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { TokenService } from '../../identity/application/token.service.js';
import { ConflictError, NotFoundError, ForbiddenError, } from '../../../common/errors/index.js';
import { createOrganizationWithOwner, generateOrganizationSlug, } from './organization-bootstrap.js';
let OrganizationsService = OrganizationsService_1 = class OrganizationsService {
    prisma;
    tokenService;
    logger = new Logger(OrganizationsService_1.name);
    constructor(prisma, tokenService) {
        this.prisma = prisma;
        this.tokenService = tokenService;
    }
    generateSlug(name) {
        return generateOrganizationSlug(name);
    }
    async create(dto, userId) {
        let slug = dto.slug || this.generateSlug(dto.name);
        const existing = await this.prisma.organization.findUnique({
            where: { slug },
        });
        if (existing) {
            if (dto.slug) {
                throw new ConflictError(`Slug '${slug}' is already taken`);
            }
            slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        return this.prisma.$transaction(async (tx) => {
            const org = await createOrganizationWithOwner(tx, {
                userId,
                name: dto.name,
                slug,
            });
            this.logger.log(`Created organization ${org.name} (${org.id}) by user ${userId}`);
            return org;
        }, {
            timeout: 30000,
            maxWait: 15000,
        });
    }
    async findAllForUser(userId) {
        const memberships = await this.prisma.organizationMember.findMany({
            where: {
                userId,
                isActive: true,
                organization: { isActive: true },
            },
            include: {
                organization: {
                    include: {
                        _count: {
                            select: {
                                properties: true,
                                members: true,
                            },
                        },
                    },
                },
            },
            orderBy: { joinedAt: 'asc' },
        });
        return memberships.map((m) => ({
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
            role: m.role,
            propertiesCount: m.organization._count.properties,
            membersCount: m.organization._count.members,
            joinedAt: m.joinedAt,
        }));
    }
    async findById(orgId, userId) {
        const membership = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: orgId,
                },
            },
            include: {
                organization: {
                    include: {
                        _count: {
                            select: {
                                properties: true,
                                members: true,
                            },
                        },
                    },
                },
            },
        });
        if (!membership || !membership.isActive) {
            throw new NotFoundError('Organization', orgId);
        }
        return {
            id: membership.organization.id,
            name: membership.organization.name,
            slug: membership.organization.slug,
            role: membership.role,
            propertiesCount: membership.organization._count.properties,
            membersCount: membership.organization._count.members,
            createdAt: membership.organization.createdAt,
        };
    }
    async switchOrganization(targetOrgId, userId) {
        const membership = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: targetOrgId,
                },
            },
            include: {
                user: true,
                organization: true,
            },
        });
        if (!membership ||
            !membership.isActive ||
            !membership.organization.isActive) {
            throw new ForbiddenError('You are not an active member of this organization');
        }
        const accessToken = await this.tokenService.generateAccessToken({
            id: userId,
            email: membership.user.email ?? '',
            orgId: targetOrgId,
            orgRole: membership.role,
        });
        return {
            accessToken,
            organization: {
                id: membership.organization.id,
                name: membership.organization.name,
                slug: membership.organization.slug,
            },
            role: membership.role,
        };
    }
    async getMembers(orgId, userId) {
        await this.verifyMembership(orgId, userId);
        return this.prisma.organizationMember.findMany({
            where: { organizationId: orgId, isActive: true },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        mobile: true,
                    },
                },
            },
            orderBy: { joinedAt: 'asc' },
        });
    }
    async addMember(orgId, dto, actorUserId) {
        await this.verifyRole(orgId, actorUserId, ['OWNER', 'ADMIN']);
        const targetUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!targetUser) {
            throw new NotFoundError(`User with email '${dto.email}' not found. They must register first.`);
        }
        const existingMembership = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId: targetUser.id,
                    organizationId: orgId,
                },
            },
        });
        if (existingMembership) {
            if (existingMembership.isActive) {
                throw new ConflictError('User is already a member of this organization');
            }
            return this.prisma.organizationMember.update({
                where: { id: existingMembership.id },
                data: { isActive: true, role: dto.role },
            });
        }
        const newMember = await this.prisma.organizationMember.create({
            data: {
                userId: targetUser.id,
                organizationId: orgId,
                role: dto.role,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        mobile: true,
                    },
                },
            },
        });
        await this.prisma.auditLog.create({
            data: {
                organizationId: orgId,
                userId: actorUserId,
                action: 'organization.member_added',
                entityType: 'OrganizationMember',
                entityId: newMember.id,
                metadata: { invitedUserId: targetUser.id, role: dto.role },
            },
        });
        return newMember;
    }
    async updateMemberRole(orgId, memberId, dto, actorUserId) {
        await this.verifyRole(orgId, actorUserId, ['OWNER', 'ADMIN']);
        const targetMember = await this.prisma.organizationMember.findUnique({
            where: { id: memberId },
        });
        if (!targetMember || targetMember.organizationId !== orgId) {
            throw new NotFoundError('Organization member', memberId);
        }
        if (targetMember.role === 'OWNER') {
            const ownerCount = await this.prisma.organizationMember.count({
                where: { organizationId: orgId, role: 'OWNER', isActive: true },
            });
            if (ownerCount <= 1) {
                throw new ForbiddenError('Cannot demote the only OWNER of an organization');
            }
        }
        return this.prisma.organizationMember.update({
            where: { id: memberId },
            data: { role: dto.role },
        });
    }
    async removeMember(orgId, memberId, actorUserId) {
        await this.verifyRole(orgId, actorUserId, ['OWNER', 'ADMIN']);
        const targetMember = await this.prisma.organizationMember.findUnique({
            where: { id: memberId },
        });
        if (!targetMember || targetMember.organizationId !== orgId) {
            throw new NotFoundError('Organization member', memberId);
        }
        if (targetMember.role === 'OWNER') {
            const ownerCount = await this.prisma.organizationMember.count({
                where: { organizationId: orgId, role: 'OWNER', isActive: true },
            });
            if (ownerCount <= 1) {
                throw new ForbiddenError('Cannot remove the only OWNER of an organization');
            }
        }
        await this.prisma.organizationMember.update({
            where: { id: memberId },
            data: { isActive: false },
        });
        return { success: true, message: 'Member removed successfully' };
    }
    async verifyMembership(orgId, userId) {
        const membership = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: orgId,
                },
            },
        });
        if (!membership || !membership.isActive) {
            throw new ForbiddenError('You do not belong to this organization');
        }
        return membership;
    }
    async verifyRole(orgId, userId, allowedRoles) {
        const membership = await this.verifyMembership(orgId, userId);
        if (!allowedRoles.includes(membership.role)) {
            throw new ForbiddenError(`Requires one of the following roles: ${allowedRoles.join(', ')}`);
        }
        return membership;
    }
};
OrganizationsService = OrganizationsService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        TokenService])
], OrganizationsService);
export { OrganizationsService };
//# sourceMappingURL=organizations.service.js.map