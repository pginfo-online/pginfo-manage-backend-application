import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../src/modules/identity/application/auth.service.js';
import {
  ConflictError,
  UnauthorizedError,
} from '../../src/common/errors/index.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockTokenService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    mockTokenService = {
      generateRefreshToken: vi.fn().mockResolvedValue({
        rawToken: 'raw-refresh',
        recordId: 'rec-1',
        family: 'fam-1',
      }),
      generateAccessToken: vi.fn().mockResolvedValue('jwt-access-token'),
      revokeToken: vi.fn(),
    };

    authService = new AuthService(mockPrisma as any, mockTokenService as any);
  });

  it('should throw ConflictError if email is already registered', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-id',
      email: 'test@example.com',
    });

    await expect(
      authService.register({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('should throw UnauthorizedError if user not found on login', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'nonexistent@example.com',
        password: 'Password123!',
      }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError if user is inactive', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'inactive-id',
      email: 'inactive@example.com',
      isActive: false,
      memberships: [],
    });

    await expect(
      authService.login({
        email: 'inactive@example.com',
        password: 'Password123!',
      }),
    ).rejects.toThrow(UnauthorizedError);
  });
});
