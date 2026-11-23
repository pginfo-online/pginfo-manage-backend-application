import type { Request } from 'express';
import type { PlatformAdminContext } from '../domain/admin-permissions.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import { AdminGovernanceService } from '../application/admin-governance.service.js';
import { type AdminAuditQueryDto, type AdminCasesQueryDto, type AdminListQueryDto, type CreateAdminCaseDto, type UpdateAdminCaseDto, type UpsertPlatformSettingDto } from './dto/admin.dto.js';
export declare class AdminGovernanceController {
    private readonly queryService;
    private readonly governance;
    constructor(queryService: AdminQueryService, governance: AdminGovernanceService);
    auditLogs(query: AdminAuditQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string | null;
        } | null;
        organization: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        organizationId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        userAgent: string | null;
        ipAddress: string | null;
        action: string;
        entityType: string | null;
        entityId: string | null;
    }>>;
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
        evidence: import("@prisma/client/runtime/library").JsonValue | null;
        dueAt: Date | null;
        closedAt: Date | null;
    }>>;
    createCase(dto: CreateAdminCaseDto, actor: PlatformAdminContext, request: Request): Promise<{
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
        evidence: import("@prisma/client/runtime/library").JsonValue | null;
        dueAt: Date | null;
        closedAt: Date | null;
    }>;
    updateCase(id: string, dto: UpdateAdminCaseDto, actor: PlatformAdminContext, request: Request): Promise<{
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
        evidence: import("@prisma/client/runtime/library").JsonValue | null;
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
        value: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
        isPublic: boolean;
        description: string | null;
        version: number;
        key: string;
        updatedByUserId: string;
    }>>;
    upsertSetting(key: string, dto: UpsertPlatformSettingDto, actor: PlatformAdminContext, request: Request): Promise<{
        id: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        createdAt: Date;
        updatedAt: Date;
        isPublic: boolean;
        description: string | null;
        version: number;
        key: string;
        updatedByUserId: string;
    }>;
}
