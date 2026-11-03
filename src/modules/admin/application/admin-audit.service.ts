import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/index.js';

export interface AdminRequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    options: {
      organizationId?: string | null;
      metadata?: Prisma.InputJsonValue;
      request?: AdminRequestMetadata;
      client?: Prisma.TransactionClient;
    } = {},
  ) {
    const client = options.client ?? this.prisma;
    return client.auditLog.create({
      data: {
        organizationId: options.organizationId ?? null,
        userId: actorUserId,
        action,
        entityType,
        entityId,
        metadata: options.metadata,
        ipAddress: options.request?.ipAddress,
        userAgent: options.request?.userAgent?.slice(0, 1000),
      },
    });
  }
}
