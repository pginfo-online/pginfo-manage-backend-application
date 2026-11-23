import { PrismaService } from '../../../platform/database/index.js';
import type { PlatformAdminContext } from '../domain/admin-permissions.js';
import type { AdminListQueryDto, CreatePlatformAdminDto, UpdatePlatformAdminDto, UpdateUserStatusDto } from '../api/dto/admin.dto.js';
import { AdminAuditService, type AdminRequestMetadata } from './admin-audit.service.js';
export declare class AdminAccessService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AdminAuditService);
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
    list(query: AdminListQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
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
    create(dto: CreatePlatformAdminDto, actor: PlatformAdminContext, request?: AdminRequestMetadata): Promise<{
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
    update(id: string, dto: UpdatePlatformAdminDto, actor: PlatformAdminContext, request?: AdminRequestMetadata): Promise<{
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
    updateUserStatus(id: string, dto: UpdateUserStatusDto, actor: PlatformAdminContext, request?: AdminRequestMetadata): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string | null;
        isActive: boolean;
        updatedAt: Date;
    }>;
}
