import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PlatformAdminGuard } from '../../src/modules/admin/authorization/admin-authorization.js';
import {
  resolvePermissions,
  ROLE_PERMISSIONS,
} from '../../src/modules/admin/domain/admin-permissions.js';

function context(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => 'handler',
    getClass: () => 'class',
  } as any;
}

describe('platform admin authorization', () => {
  it('keeps platform privileges separate from organization roles', () => {
    expect(ROLE_PERMISSIONS.OPERATIONS_ADMIN).not.toContain('admins.manage');
    expect(ROLE_PERMISSIONS.ANALYST).not.toContain('users.write');
    expect(resolvePermissions('SUPER_ADMIN', [])).toContain('admins.manage');
  });

  it('rejects an inactive platform administrator', async () => {
    const request = {
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        platformAdmin: {
          id: 'admin-1',
          role: 'SUPER_ADMIN',
          status: 'SUSPENDED',
          permissionOverrides: [],
        },
      },
    };
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue([]) };
    const guard = new PlatformAdminGuard(reflector as any);
    await expect(guard.canActivate(context(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('loads authoritative permissions and denies missing permission', async () => {
    const request = {
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        platformAdmin: {
          id: 'admin-1',
          role: 'ANALYST',
          status: 'ACTIVE',
          permissionOverrides: [],
        },
      },
    };
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['users.write']),
    };
    const guard = new PlatformAdminGuard(reflector as any);
    await expect(guard.canActivate(context(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(request).not.toHaveProperty('platformAdmin');
  });
});
