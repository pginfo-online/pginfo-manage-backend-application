var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
let AdminAuditService = class AdminAuditService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    record(actorUserId, action, entityType, entityId, options = {}) {
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
};
AdminAuditService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], AdminAuditService);
export { AdminAuditService };
//# sourceMappingURL=admin-audit.service.js.map