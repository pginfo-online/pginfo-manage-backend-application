import type { Request } from 'express';
import type { PlatformAdminContext } from '../domain/admin-permissions.js';
import { AdminAccessService } from '../application/admin-access.service.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import { type AdminListQueryDto, type AdminUsersQueryDto, type CreatePlatformAdminDto, type UpdatePlatformAdminDto, type UpdateUserStatusDto } from './dto/admin.dto.js';
export declare class AdminAccessController {
    private readonly access;
    private readonly queryService;
    constructor(access: AdminAccessService, queryService: AdminQueryService);
    me(actor: PlatformAdminContext): Promise<{
        permissions: ("dashboard.read" | "users.read" | "users.write" | "organizations.read" | "organizations.write" | "properties.read" | "properties.write" | "inventory.read" | "inventory.write" | "residents.read" | "bookings.read" | "finance.read" | "finance.review" | "banks.read" | "banks.review" | "reports.read" | "audit.read" | "support.read" | "support.write" | "settings.read" | "settings.write" | "admins.manage")[];
        user: {
            id: string;
            email: string;
            mobile: string | null;
            firstName: string;
            lastName: string | null;
            lastLoginAt: Date | null;
        };
        id: string;
        status: import("@prisma/client").$Enums.PlatformAdminStatus;
        role: import("@prisma/client").$Enums.PlatformRole;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        permissionOverrides: string[];
        createdByUserId: string | null;
    }>;
    listAdmins(query: AdminListQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string | null;
            isActive: boolean;
            lastLoginAt: Date | null;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.PlatformAdminStatus;
        role: import("@prisma/client").$Enums.PlatformRole;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        permissionOverrides: string[];
        createdByUserId: string | null;
    }>>;
    createAdmin(dto: CreatePlatformAdminDto, actor: PlatformAdminContext, request: Request): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string | null;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.PlatformAdminStatus;
        role: import("@prisma/client").$Enums.PlatformRole;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        permissionOverrides: string[];
        createdByUserId: string | null;
    }>;
    updateAdmin(id: string, dto: UpdatePlatformAdminDto, actor: PlatformAdminContext, request: Request): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.PlatformAdminStatus;
        role: import("@prisma/client").$Enums.PlatformRole;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        permissionOverrides: string[];
        createdByUserId: string | null;
    }>;
    users(query: AdminUsersQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        platformAdmin: {
            status: import("@prisma/client").$Enums.PlatformAdminStatus;
            role: import("@prisma/client").$Enums.PlatformRole;
        } | null;
        id: string;
        email: string;
        mobile: string | null;
        firstName: string;
        lastName: string | null;
        emailVerified: boolean;
        mobileVerified: boolean;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        memberships: {
            organization: {
                id: string;
                name: string;
                isActive: boolean;
            };
            id: string;
            role: import("@prisma/client").$Enums.OrgRole;
            isActive: boolean;
        }[];
    }>>;
    user(id: string): Promise<{
        platformAdmin: {
            id: string;
            status: import("@prisma/client").$Enums.PlatformAdminStatus;
            role: import("@prisma/client").$Enums.PlatformRole;
            permissionOverrides: string[];
        } | null;
        id: string;
        email: string;
        mobile: string | null;
        firstName: string;
        lastName: string | null;
        emailVerified: boolean;
        mobileVerified: boolean;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        memberships: ({
            organization: {
                id: string;
                name: string;
                isActive: boolean;
                slug: string;
            };
        } & {
            id: string;
            role: import("@prisma/client").$Enums.OrgRole;
            isActive: boolean;
            updatedAt: Date;
            userId: string;
            organizationId: string;
            joinedAt: Date;
        })[];
        payoutAccounts: {
            id: string;
            status: import("@prisma/client").$Enums.PayoutAccountStatus;
            businessName: string;
            kycStatus: import("@prisma/client").$Enums.KycStatus;
            accountNumberMasked: string;
        }[];
    }>;
    updateUserStatus(id: string, dto: UpdateUserStatusDto, actor: PlatformAdminContext, request: Request): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string | null;
        isActive: boolean;
        updatedAt: Date;
    }>;
}
