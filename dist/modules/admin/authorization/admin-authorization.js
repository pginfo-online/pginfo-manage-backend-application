var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { createParamDecorator, ForbiddenException, Injectable, SetMetadata, } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../platform/database/index.js';
import { resolvePermissions, } from '../domain/admin-permissions.js';
const PLATFORM_PERMISSIONS_KEY = 'platformPermissions';
export const RequirePlatformPermissions = (...permissions) => SetMetadata(PLATFORM_PERMISSIONS_KEY, permissions);
export const CurrentPlatformAdmin = createParamDecorator((_data, context) => {
    const request = context.switchToHttp().getRequest();
    return request.platformAdmin;
});
let PlatformAdminGuard = class PlatformAdminGuard {
    reflector;
    prisma;
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        if (!request.user)
            throw new ForbiddenException('Authentication required');
        const admin = await this.prisma?.platformAdmin.findUnique({
            where: { userId: request.user.id, user: { isActive: true } },
            select: { id: true, role: true, status: true, permissionOverrides: true },
        });
        if (!admin || admin.status !== 'ACTIVE') {
            throw new ForbiddenException('Active platform administrator required');
        }
        const permissions = resolvePermissions(admin.role, admin.permissionOverrides);
        const required = this.reflector.getAllAndOverride(PLATFORM_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
        if (required.some((permission) => !permissions.includes(permission))) {
            throw new ForbiddenException(`Missing platform permission: ${required.filter((permission) => !permissions.includes(permission)).join(', ')}`);
        }
        request.platformAdmin = {
            id: admin.id,
            userId: request.user.id,
            role: admin.role,
            permissions,
            email: request.user.email,
        };
        return true;
    }
};
PlatformAdminGuard = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Reflector,
        PrismaService])
], PlatformAdminGuard);
export { PlatformAdminGuard };
//# sourceMappingURL=admin-authorization.js.map