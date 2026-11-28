import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../src/modules/identity/application/auth.service.js';
import {
  ConflictError,
  UnauthorizedError,
} from '../../src/common/errors/index.js';
import { PasswordHasher } from '../../src/modules/identity/domain/password-hasher.js';
import { loginSchema } from '../../src/modules/identity/api/dto/auth.dto.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockTokenService: any;
  let mockOtpService: any;
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

    mockOtpService = {
      verifyAndConsumeOtp: vi.fn().mockResolvedValue('9876543210'),
    };

    authService = new AuthService(
      mockPrisma as any,
      mockTokenService as any,
      mockOtpService as any,
    );
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

  it('signs in with a formatted mobile number and the account password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'owner-id',
      email: 'owner@example.test',
      mobile: '9876543210',
      firstName: 'Owner',
      lastName: null,
      passwordHash: 'owner-password-hash',
      isActive: true,
      memberships: [{ organizationId: 'owner-org', role: 'OWNER' }],
    });
    const verify = vi.spyOn(PasswordHasher, 'verify').mockResolvedValue(true);
    try {
      const dto = loginSchema.parse({
        mobile: '+91 98765-43210',
        password: 'OwnerPassword1',
      });
      const result = await authService.login(dto);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { mobile: '9876543210' } }),
      );
      expect(verify).toHaveBeenCalledWith('owner-password-hash', 'OwnerPassword1');
      expect(result.user.activeOrganizationId).toBe('owner-org');
      expect(result.user.activeOrganizationRole).toBe('OWNER');
      expect(loginSchema.safeParse({ mobile: 'abc9876543210', password: 'pass' }).success).toBe(false);
    } finally {
      verify.mockRestore();
    }
  });

  it('authenticates user via 4-digit mobile OTP', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'otp-user-1',
      email: null,
      mobile: '9876543210',
      firstName: 'Aarav',
      lastName: null,
      isActive: true,
      mobileVerified: false,
      memberships: [{ organizationId: 'org-1', role: 'OWNER' }],
    });

    const result = await authService.loginWithOtp({
      mobile: '9876543210',
      otp: '4321',
    });

    expect(mockOtpService.verifyAndConsumeOtp).toHaveBeenCalledWith(
      '9876543210',
      '4321',
      'LOGIN',
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'otp-user-1' },
        data: { mobileVerified: true },
      }),
    );
    expect(result.tokens.accessToken).toBe('jwt-access-token');
    expect(result.user.activeOrganizationId).toBe('org-1');
  });

  it('registers user and workspace via 4-digit mobile OTP without mandatory email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockTransaction.user.create.mockResolvedValue({
      id: 'otp-reg-1',
      email: null,
      mobile: '9876543210',
      firstName: 'Priya',
      lastName: null,
    });

    const result = await authService.registerWithOtp({
      mobile: '9876543210',
      otp: '7890',
      firstName: 'Priya',
      organizationName: 'Priya Hostels',
    });

    expect(mockOtpService.verifyAndConsumeOtp).toHaveBeenCalledWith(
      '9876543210',
      '7890',
      'REGISTER',
    );
    expect(mockTransaction.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: null,
        passwordHash: null,
        mobile: '9876543210',
        mobileVerified: true,
        firstName: 'Priya',
      }),
    });
    expect(result.user.activeOrganizationId).toBe('new-org-id');
    expect(result.user.activeOrganizationRole).toBe('OWNER');
  });
});
