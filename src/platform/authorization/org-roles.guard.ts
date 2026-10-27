import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { OrgRole } from '@prisma/client';
import { ORG_ROLES_KEY } from './decorators.js';
import type { AuthenticatedUser } from '../../common/types/index.js';

/**
 * Guard that checks the authenticated user's organization role
 * against the roles specified by @RequireOrgRoles().
 *
 * Must be used AFTER JwtAuthGuard so that request.user is populated.
 */
@Injectable()
export class OrgRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<OrgRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No roles required — allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user?.organizationRole) {
      throw new ForbiddenException(
        'Organization membership required for this action',
      );
    }

    if (!requiredRoles.includes(user.organizationRole as OrgRole)) {
      throw new ForbiddenException(
        `Requires one of these roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
