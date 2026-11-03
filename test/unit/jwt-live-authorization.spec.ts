import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { JwtStrategy } from '../../src/platform/authentication/jwt.strategy.js';

const payload = {
  sub: '00000000-0000-4000-8000-000000000001',
  email: 'stale@example.com',
  orgId: '00000000-0000-4000-8000-000000000002',
  orgRole: 'OWNER',
  type: 'access' as const,
};

describe('JWT live authorization state', () => {
  const config = { get: vi.fn().mockReturnValue('a-secure-test-secret') };

  it('rejects a deactivated user even when the JWT is valid', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: payload.sub,
          email: payload.email,
          isActive: false,
          memberships: [],
          platformAdmin: null,
        }),
      },
    };
    const strategy = new JwtStrategy(config as any, prisma as any);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('uses current membership and platform role instead of stale JWT claims', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: payload.sub,
          email: 'current@example.com',
          isActive: true,
          memberships: [{ role: 'VIEWER' }],
          platformAdmin: {
            id: '00000000-0000-4000-8000-000000000003',
            role: 'AUDITOR',
            status: 'ACTIVE',
            permissionOverrides: [],
          },
        }),
      },
    };
    const strategy = new JwtStrategy(config as any, prisma as any);
    const user = await strategy.validate(payload);
    expect(user.email).toBe('current@example.com');
    expect(user.organizationRole).toBe('VIEWER');
    expect(user.organizationAccessActive).toBe(true);
    expect(user.platformAdmin?.role).toBe('AUDITOR');
  });
});
