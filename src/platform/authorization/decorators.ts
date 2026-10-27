import { SetMetadata } from '@nestjs/common';
import type { OrgRole } from '@prisma/client';

/**
 * Metadata key for required organization roles.
 */
export const ORG_ROLES_KEY = 'orgRoles';

/**
 * Decorator: restrict access to users with specific organization roles.
 *
 * Usage:
 *   @RequireOrgRoles('OWNER', 'ADMIN')
 *   @UseGuards(JwtAuthGuard, OrgRolesGuard)
 */
export const RequireOrgRoles = (...roles: OrgRole[]) =>
  SetMetadata(ORG_ROLES_KEY, roles);

/**
 * Metadata key for public routes (skip authentication).
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator: mark a route as public (no auth required).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
