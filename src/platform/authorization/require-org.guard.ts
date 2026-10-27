import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/types/index.js';

/**
 * Guard that ensures the authenticated user has selected an organization.
 * Many endpoints require an active org context — this guard enforces it.
 *
 * Must be used AFTER JwtAuthGuard.
 */
@Injectable()
export class RequireOrgGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user?.organizationId) {
      throw new ForbiddenException(
        'An active organization must be selected. Please switch to an organization first.',
      );
    }

    return true;
  }
}
