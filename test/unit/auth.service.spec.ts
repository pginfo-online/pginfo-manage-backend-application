import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../src/modules/identity/application/auth.service.js';
import {
  ConflictError,
  UnauthorizedError,
} from '../../src/common/errors/index.js';
import { PasswordHasher } from '../../src/modules/identity/domain/password-hasher.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockTokenService: any;
  let mockTransaction: any;

  beforeEach(() => {
    mockTransaction = {
      user: {
        create: vi.fn().mockResolvedValue({
          id: 'new-user-id',
          email: 'new@example.com',
          firstName: 'New',
          lastName: null,
          mobile: null,
        }),
      },
      organization: {
        create: vi.fn().mockResolvedValue({
          id: 'new-org-id',
          name: 'New Properties',
          slug: 'new-properties-new-user',
        }),
      },
      organizationMember: {
        create: vi.fn(),
      },
      expenseCategory: {
        createMany: vi.fn(),
      },
      complaintCategory: {
        createMany: vi.fn(),
      },
      staffDesignation: {
        createMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) =>
        callback(mockTransaction),
      ),
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

  it('creates a fully initialized owner workspace during registration', async () => {
    vi.spyOn(PasswordHasher, 'hash').mockResolvedValue('hashed-password');

    const result = await authService.register({
      email: 'new@example.com',
      password: 'Password123!',
      firstName: 'New',
      organizationName: 'New Properties',
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(mockTransaction.organization.create).toHaveBeenCalledWith({
      data: {
        name: 'New Properties',
        slug: expect.stringMatching(/^new-properties-new-user/),
      },
    });
    expect(mockTransaction.organizationMember.create).toHaveBeenCalledWith({
      data: {
        userId: 'new-user-id',
        organizationId: 'new-org-id',
        role: 'OWNER',
      },
    });
    expect(mockTransaction.expenseCategory.createMany).toHaveBeenCalledOnce();
    expect(mockTransaction.complaintCategory.createMany).toHaveBeenCalledOnce();
    expect(mockTransaction.staffDesignation.createMany).toHaveBeenCalledOnce();
    expect(mockTransaction.auditLog.create).toHaveBeenCalledTimes(2);
    expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith({
      id: 'new-user-id',
      email: 'new@example.com',
      orgId: 'new-org-id',
      orgRole: 'OWNER',
    });
    expect(result.user.activeOrganizationId).toBe('new-org-id');
    expect(result.user.activeOrganizationRole).toBe('OWNER');
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
