import { PrismaService } from '../../../platform/database/index.js';
import { TokenService } from '../../identity/application/token.service.js';
import type { CreateOrganizationDto, AddMemberDto, UpdateMemberRoleDto } from '../api/dto/organization.dto.js';
import type { OrgRole } from '@prisma/client';
export declare class OrganizationsService {
    private readonly prisma;
    private readonly tokenService;
    private readonly logger;
    constructor(prisma: PrismaService, tokenService: TokenService);
    private generateSlug;
    create(dto: CreateOrganizationDto, userId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
    }>;
    findAllForUser(userId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        role: import("@prisma/client").$Enums.OrgRole;
        propertiesCount: number;
        membersCount: number;
        joinedAt: Date;
    }[]>;
    findById(orgId: string, userId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        role: import("@prisma/client").$Enums.OrgRole;
        propertiesCount: number;
        membersCount: number;
        createdAt: Date;
    }>;
    switchOrganization(targetOrgId: string, userId: string): Promise<{
        accessToken: string;
        organization: {
            id: string;
            name: string;
            slug: string;
        };
        role: import("@prisma/client").$Enums.OrgRole;
    }>;
    getMembers(orgId: string, userId: string): Promise<({
        user: {
            id: string;
            email: string | null;
            mobile: string | null;
            firstName: string;
            lastName: string | null;
        };
    } & {
        id: string;
        role: import("@prisma/client").$Enums.OrgRole;
        isActive: boolean;
        updatedAt: Date;
        userId: string;
        organizationId: string;
        joinedAt: Date;
    })[]>;
    addMember(orgId: string, dto: AddMemberDto, actorUserId: string): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.OrgRole;
        isActive: boolean;
        updatedAt: Date;
        userId: string;
        organizationId: string;
        joinedAt: Date;
    }>;
    updateMemberRole(orgId: string, memberId: string, dto: UpdateMemberRoleDto, actorUserId: string): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.OrgRole;
        isActive: boolean;
        updatedAt: Date;
        userId: string;
        organizationId: string;
        joinedAt: Date;
    }>;
    removeMember(orgId: string, memberId: string, actorUserId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyMembership(orgId: string, userId: string): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.OrgRole;
        isActive: boolean;
        updatedAt: Date;
        userId: string;
        organizationId: string;
        joinedAt: Date;
    }>;
    verifyRole(orgId: string, userId: string, allowedRoles: OrgRole[]): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.OrgRole;
        isActive: boolean;
        updatedAt: Date;
        userId: string;
        organizationId: string;
        joinedAt: Date;
    }>;
}
