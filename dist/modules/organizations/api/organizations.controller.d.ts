import { OrganizationsService } from '../application/organizations.service.js';
import { type CreateOrganizationDto, type AddMemberDto, type UpdateMemberRoleDto } from './dto/organization.dto.js';
export declare class OrganizationsController {
    private readonly orgService;
    constructor(orgService: OrganizationsService);
    create(dto: CreateOrganizationDto, userId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
    }>;
    findAll(userId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        role: import("@prisma/client").$Enums.OrgRole;
        propertiesCount: number;
        membersCount: number;
        joinedAt: Date;
    }[]>;
    findOne(id: string, userId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        role: import("@prisma/client").$Enums.OrgRole;
        propertiesCount: number;
        membersCount: number;
        createdAt: Date;
    }>;
    switchOrg(id: string, userId: string): Promise<{
        accessToken: string;
        organization: {
            id: string;
            name: string;
            slug: string;
        };
        role: import("@prisma/client").$Enums.OrgRole;
    }>;
    getMembers(id: string, userId: string): Promise<({
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
    addMember(id: string, dto: AddMemberDto, userId: string): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.OrgRole;
        isActive: boolean;
        updatedAt: Date;
        userId: string;
        organizationId: string;
        joinedAt: Date;
    }>;
    updateMemberRole(id: string, memberId: string, dto: UpdateMemberRoleDto, userId: string): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.OrgRole;
        isActive: boolean;
        updatedAt: Date;
        userId: string;
        organizationId: string;
        joinedAt: Date;
    }>;
    removeMember(id: string, memberId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
