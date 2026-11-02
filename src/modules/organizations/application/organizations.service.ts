import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { TokenService } from '../../identity/application/token.service.js';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../../../common/errors/index.js';
import type {
  CreateOrganizationDto,
  AddMemberDto,
  UpdateMemberRoleDto,
} from '../api/dto/organization.dto.js';
import type { OrgRole } from '@prisma/client';

const SYSTEM_EXPENSE_CATEGORIES = [
  'Groceries',
  'EMI',
  'Salaries',
  'Electrical Services',
  'Plumbing',
  'Cleaning Supplies',
  'Internet & WiFi',
  'Water',
  'Electricity Bill',
  'Gas',
  'Repairs & Maintenance',
  'Security',
  'Miscellaneous',
];

const SYSTEM_COMPLAINT_CATEGORIES = [
  'Agreements',
  'Application Issues',
  'Amenities',
  'Electrical Appliances',
  'Food',
  'Housekeeping',
  'Payments',
  'Staff',
  'Plumbing',
  'Internet & WiFi',
  'Other',
];

const SYSTEM_STAFF_DESIGNATIONS = [
  'Cook',
  'Cleaner',
  'Plumber',
  'Guard',
  'Manager',
  'Electrician',
  'Warden',
];

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Generates a unique slug from organization name.
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 45);
  }

  /**
   * Creates a new organization, binds creator as OWNER,
   * and seeds system categories in an atomic transaction.
   */
  async create(dto: CreateOrganizationDto, userId: string) {
    let slug = dto.slug || this.generateSlug(dto.name);

    // Ensure slug uniqueness
    const existing = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (existing) {
      if (dto.slug) {
        throw new ConflictError(`Slug '${slug}' is already taken`);
      }
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return this.prisma.$transaction(
      async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: dto.name,
            slug,
          },
        });

        // Bind creator as OWNER
        await tx.organizationMember.create({
          data: {
            userId,
            organizationId: org.id,
            role: "OWNER",
          },
        });

        // Seed system expense categories for this org
        await tx.expenseCategory.createMany({
          data: SYSTEM_EXPENSE_CATEGORIES.map((name) => ({
            organizationId: org.id,
            name,
            isSystem: true,
          })),
        });

        // Seed system complaint categories for this org
        await tx.complaintCategory.createMany({
          data: SYSTEM_COMPLAINT_CATEGORIES.map((name) => ({
            organizationId: org.id,
            name,
            isSystem: true,
          })),
        });

        // Seed system staff designations for this org
        await tx.staffDesignation.createMany({
          data: SYSTEM_STAFF_DESIGNATIONS.map((name) => ({
            organizationId: org.id,
            name,
            isSystem: true,
          })),
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            organizationId: org.id,
            userId,
            action: "organization.create",
            entityType: "Organization",
            entityId: org.id,
          },
        });

        this.logger.log(
          `Created organization ${org.name} (${org.id}) by user ${userId}`
        );
        return org;
      },
      {
        timeout: 30000,
        maxWait: 15000,
      }
    );
  }

  /**
   * Returns all organizations where user is an active member.
   */
  async findAllForUser(userId: string) {
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

  /**
   * Returns details of a specific organization after verifying membership.
   */
  async findById(orgId: string, userId: string) {
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

  /**
   * Switches the active organization context and returns a newly scoped JWT.
   */
  async switchOrganization(targetOrgId: string, userId: string) {
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

    if (
      !membership ||
      !membership.isActive ||
      !membership.organization.isActive
    ) {
      throw new ForbiddenError(
        'You are not an active member of this organization',
      );
    }

    const accessToken = await this.tokenService.generateAccessToken({
      id: userId,
      email: membership.user.email,
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

  /**
   * Lists all members in an organization (requires membership).
   */
  async getMembers(orgId: string, userId: string) {
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

  /**
   * Invites/adds a member to the organization (requires OWNER or ADMIN).
   */
  async addMember(orgId: string, dto: AddMemberDto, actorUserId: string) {
    await this.verifyRole(orgId, actorUserId, ['OWNER', 'ADMIN']);

    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!targetUser) {
      throw new NotFoundError(
        `User with email '${dto.email}' not found. They must register first.`,
      );
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
        throw new ConflictError(
          'User is already a member of this organization',
        );
      }
      // Re-activate member with new role
      return this.prisma.organizationMember.update({
        where: { id: existingMembership.id },
        data: { isActive: true, role: dto.role as OrgRole },
      });
    }

    const newMember = await this.prisma.organizationMember.create({
      data: {
        userId: targetUser.id,
        organizationId: orgId,
        role: dto.role as OrgRole,
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

    // Audit log
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

  /**
   * Updates a member's role (requires OWNER or ADMIN).
   */
  async updateMemberRole(
    orgId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
    actorUserId: string,
  ) {
    await this.verifyRole(orgId, actorUserId, ['OWNER', 'ADMIN']);

    const targetMember = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      throw new NotFoundError('Organization member', memberId);
    }

    // Protect last OWNER
    if (targetMember.role === 'OWNER') {
      const ownerCount = await this.prisma.organizationMember.count({
        where: { organizationId: orgId, role: 'OWNER', isActive: true },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenError(
          'Cannot demote the only OWNER of an organization',
        );
      }
    }

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: dto.role as OrgRole },
    });
  }

  /**
   * Removes a member from an organization.
   */
  async removeMember(orgId: string, memberId: string, actorUserId: string) {
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
        throw new ForbiddenError(
          'Cannot remove the only OWNER of an organization',
        );
      }
    }

    await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { isActive: false },
    });

    return { success: true, message: 'Member removed successfully' };
  }

  /**
   * Helper: verify user has an active membership in the organization.
   */
  async verifyMembership(orgId: string, userId: string) {
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

  /**
   * Helper: verify user has one of the allowed roles.
   */
  async verifyRole(orgId: string, userId: string, allowedRoles: OrgRole[]) {
    const membership = await this.verifyMembership(orgId, userId);
    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenError(
        `Requires one of the following roles: ${allowedRoles.join(', ')}`,
      );
    }
    return membership;
  }
}
