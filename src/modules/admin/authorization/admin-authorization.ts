import {
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  type CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../platform/database/index.js';
import type { AuthenticatedUser } from '../../../common/types/index.js';
import {
  resolvePermissions,
  type PlatformAdminContext,
  type PlatformPermission,
} from '../domain/admin-permissions.js';

const PLATFORM_PERMISSIONS_KEY = 'platformPermissions';

export const RequirePlatformPermissions = (
  ...permissions: PlatformPermission[]
) => SetMetadata(PLATFORM_PERMISSIONS_KEY, permissions);

export const CurrentPlatformAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PlatformAdminContext => {
    const request = context.switchToHttp().getRequest<{
      platformAdmin: PlatformAdminContext;
    }>();
    return request.platformAdmin;
  },
);

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma?: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      platformAdmin?: PlatformAdminContext;
    }>();
    if (!request.user) throw new ForbiddenException('Authentication required');

    // The shared JWT strategy caches its user projection. Privileged access
    // must reflect suspensions and role changes on the very next request.
    const admin = await this.prisma?.platformAdmin.findUnique({
      where: { userId: request.user.id, user: { isActive: true } },
      select: { id: true, role: true, status: true, permissionOverrides: true },
    });
    if (!admin || admin.status !== 'ACTIVE') {
      throw new ForbiddenException('Active platform administrator required');
    }

    const permissions = resolvePermissions(
      admin.role,
      admin.permissionOverrides,
    );
    const required =
      this.reflector.getAllAndOverride<PlatformPermission[]>(
        PLATFORM_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];
    if (required.some((permission) => !permissions.includes(permission))) {
      throw new ForbiddenException(
        `Missing platform permission: ${required.filter((permission) => !permissions.includes(permission)).join(', ')}`,
      );
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
}
