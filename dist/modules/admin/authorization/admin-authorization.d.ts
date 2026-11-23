import { type ExecutionContext, type CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../platform/database/index.js';
import { type PlatformPermission } from '../domain/admin-permissions.js';
export declare const RequirePlatformPermissions: (...permissions: PlatformPermission[]) => import("@nestjs/common").CustomDecorator<string>;
export declare const CurrentPlatformAdmin: (...dataOrPipes: unknown[]) => ParameterDecorator;
export declare class PlatformAdminGuard implements CanActivate {
    private readonly reflector;
    private readonly prisma?;
    constructor(reflector: Reflector, prisma?: PrismaService | undefined);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
