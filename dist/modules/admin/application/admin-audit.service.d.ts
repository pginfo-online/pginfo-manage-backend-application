import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/index.js';
export interface AdminRequestMetadata {
    ipAddress?: string;
    userAgent?: string;
}
export declare class AdminAuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    record(actorUserId: string, action: string, entityType: string, entityId: string, options?: {
        organizationId?: string | null;
        metadata?: Prisma.InputJsonValue;
        request?: AdminRequestMetadata;
        client?: Prisma.TransactionClient;
    }): Prisma.Prisma__AuditLogClient<{
        id: string;
        createdAt: Date;
        userId: string | null;
        organizationId: string | null;
        metadata: Prisma.JsonValue | null;
        userAgent: string | null;
        ipAddress: string | null;
        action: string;
        entityType: string | null;
        entityId: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
}
