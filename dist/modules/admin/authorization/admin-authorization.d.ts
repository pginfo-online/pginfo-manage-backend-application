import { type ExecutionContext, type CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type PlatformPermission } from '../domain/admin-permissions.js';
export declare const RequirePlatformPermissions: (...permissions: PlatformPermission[]) => import("@nestjs/common").CustomDecorator<string>;
export declare const CurrentPlatformAdmin: (...dataOrPipes: unknown[]) => ParameterDecorator;
export declare class PlatformAdminGuard implements CanActivate {
    private readonly reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
