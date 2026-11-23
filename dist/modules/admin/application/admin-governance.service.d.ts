import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/index.js';
import type { PlatformAdminContext } from '../domain/admin-permissions.js';
import type { AdminCasesQueryDto, AdminListQueryDto, CreateAdminCaseDto, UpdateAdminCaseDto, UpsertPlatformSettingDto } from '../api/dto/admin.dto.js';
import { AdminAuditService, type AdminRequestMetadata } from './admin-audit.service.js';
export declare class AdminGovernanceService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AdminAuditService);
    listCases(query: AdminCasesQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        createdBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string | null;
        };
        assignedTo: {
            id: string;
            email: string;
            firstName: string;
            lastName: string | null;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.AdminCaseStatus;
        type: import("@prisma/client").$Enums.AdminCaseType;
        createdAt: Date;
        updatedAt: Date;
        createdByUserId: string;
        organizationId: string | null;
        description: string | null;
        idempotencyKey: string | null;
        title: string;
        resolution: string | null;
        priority: import("@prisma/client").$Enums.AdminCasePriority;
        assignedToUserId: string | null;
        targetType: string | null;
        targetId: string | null;
        evidence: Prisma.JsonValue | null;
        dueAt: Date | null;
        closedAt: Date | null;
    }>>;
    createCase(dto: CreateAdminCaseDto, actor: PlatformAdminContext, request?: AdminRequestMetadata): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.AdminCaseStatus;
        type: import("@prisma/client").$Enums.AdminCaseType;
        createdAt: Date;
        updatedAt: Date;
        createdByUserId: string;
        organizationId: string | null;
        description: string | null;
        idempotencyKey: string | null;
        title: string;
        resolution: string | null;
        priority: import("@prisma/client").$Enums.AdminCasePriority;
        assignedToUserId: string | null;
        targetType: string | null;
        targetId: string | null;
        evidence: Prisma.JsonValue | null;
        dueAt: Date | null;
        closedAt: Date | null;
    }>;
    updateCase(id: string, dto: UpdateAdminCaseDto, actor: PlatformAdminContext, request?: AdminRequestMetadata): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.AdminCaseStatus;
        type: import("@prisma/client").$Enums.AdminCaseType;
        createdAt: Date;
        updatedAt: Date;
        createdByUserId: string;
        organizationId: string | null;
        description: string | null;
        idempotencyKey: string | null;
        title: string;
        resolution: string | null;
        priority: import("@prisma/client").$Enums.AdminCasePriority;
        assignedToUserId: string | null;
        targetType: string | null;
        targetId: string | null;
        evidence: Prisma.JsonValue | null;
        dueAt: Date | null;
        closedAt: Date | null;
    }>;
    listSettings(query: AdminListQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        updatedBy: {
            id: string;
            email: string;
            firstName: string;
        };
    } & {
        id: string;
        value: Prisma.JsonValue;
        createdAt: Date;
        updatedAt: Date;
        isPublic: boolean;
        description: string | null;
        version: number;
        key: string;
        updatedByUserId: string;
    }>>;
    upsertSetting(key: string, dto: UpsertPlatformSettingDto, actor: PlatformAdminContext, request?: AdminRequestMetadata): Promise<{
        id: string;
        value: Prisma.JsonValue;
        createdAt: Date;
        updatedAt: Date;
        isPublic: boolean;
        description: string | null;
        version: number;
        key: string;
        updatedByUserId: string;
    }>;
    private assertActiveAdmin;
}
