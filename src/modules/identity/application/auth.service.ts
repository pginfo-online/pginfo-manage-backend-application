import { Injectable, Logger, Optional } from '@nestjs/common';
import { Prisma, type Organization, type User } from '@prisma/client';
import { PrismaService } from '../../../platform/database/index.js';
import { PasswordHasher } from '../domain/password-hasher.js';
import { TokenService, type TokenPair } from './token.service.js';
import { OtpService } from './otp.service.js';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../../common/errors/index.js';
import type {
  RegisterDto,
  LoginDto,
  OtpLoginDto,
  OtpRegisterDto,
} from '../api/dto/auth.dto.js';
import {
  createOrganizationWithOwner,
  generateOrganizationSlug,
} from '../../organizations/application/organization-bootstrap.js';

export interface AuthResult {
  tokens: TokenPair;
  user: {
    id: string;
    email: string | null;
    firstName: string;
    lastName: string | null;
    mobile: string | null;
    activeOrganizationId: string | null;
    activeOrganizationRole: string | null;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    @Optional() private readonly otpService?: OtpService,
  ) {}

  /**
   * Registers a new user.
   */
  async register(
    dto: RegisterDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResult> {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictError('A user with this email address already exists');
    }

    if (dto.mobile) {
      const existingMobile = await this.prisma.user.findUnique({
        where: { mobile: dto.mobile },
      });
      if (existingMobile) {
        throw new ConflictError(
          'A user with this mobile number already exists',
        );
      }
    }

    const passwordHash = await PasswordHasher.hash(dto.password);

    const organizationName =
      dto.organizationName ?? `${dto.firstName}'s Properties`;
    let registration: { user: User; organization: Organization };
    try {
      registration = await this.prisma.$transaction(
        async (tx) => {
          const user = await tx.user.create({
            data: {
              email: dto.email,
              passwordHash,
              firstName: dto.firstName,
              lastName: dto.lastName,
              mobile: dto.mobile,
            },
          });

          const baseSlug = generateOrganizationSlug(organizationName);
          const slug = `${baseSlug.slice(0, 36)}-${user.id.slice(0, 8)}`;
          const organization = await createOrganizationWithOwner(tx, {
            userId: user.id,
            name: organizationName,
            slug,
          });

          await tx.auditLog.create({
            data: {
              userId: user.id,
              action: 'user.registered',
              entityType: 'User',
              entityId: user.id,
              ipAddress: meta?.ipAddress,
              userAgent: meta?.userAgent,
            },
          });

          return { user, organization };
        },
        { timeout: 30000, maxWait: 15000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.target;
        const fields = Array.isArray(target)
          ? target
          : typeof target === 'string'
            ? [target]
            : [];
        if (
          fields.some(
            (field) => typeof field === 'string' && field.includes('email'),
          )
        ) {
          throw new ConflictError(
            'A user with this email address already exists',
          );
        }
        if (
          fields.some(
            (field) => typeof field === 'string' && field.includes('mobile'),
          )
        ) {
          throw new ConflictError(
            'A user with this mobile number already exists',
          );
        }
      }
      throw error;
    }

    const { user, organization } = registration;

    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      undefined,
      meta?.userAgent,
      meta?.ipAddress,
    );

    const accessToken = await this.tokenService.generateAccessToken({
      id: user.id,
      email: user.email ?? '',
      orgId: organization.id,
      orgRole: 'OWNER',
    });

    return {
      tokens: {
        accessToken,
        refreshToken: refreshToken.rawToken,
        expiresIn: '15m',
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile,
        activeOrganizationId: organization.id,
        activeOrganizationRole: 'OWNER',
      },
    };
  }

  /**
   * Authenticates a user with their email or mobile number and password.
   */
  async login(
    dto: LoginDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResult> {
    const account = 'email' in dto ? { email: dto.email } : { mobile: dto.mobile };
    const user = await this.prisma.user.findUnique({
      where: account,
      include: {
        memberships: {
          where: { isActive: true },
          select: { organizationId: true, role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid sign-in credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError(
        'Account is disabled. Please contact support.',
      );
    }

    if (!user.passwordHash) {
      throw new UnauthorizedError(
        'This account uses mobile OTP sign-in. Please sign in with OTP.',
      );
    }

    const isPasswordValid = await PasswordHasher.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for user ID: ${user.id}`);
      throw new UnauthorizedError('Invalid sign-in credentials');
    }

    return this.issueUserSession(user, 'user.login', meta);
  }

  /**
   * Authenticates an existing user using a 4-digit mobile OTP.
   */
  async loginWithOtp(
    dto: OtpLoginDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResult> {
    if (!this.otpService) {
      throw new Error('OtpService is not initialized');
    }

    const mobile = await this.otpService.verifyAndConsumeOtp(
      dto.mobile,
      dto.otp,
      'LOGIN',
    );

    const user = await this.prisma.user.findUnique({
      where: { mobile },
      include: {
        memberships: {
          where: { isActive: true },
          select: { organizationId: true, role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError(
        'No account found with this mobile number. Please sign up first.',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedError(
        'Account is disabled. Please contact support.',
      );
    }

    if (!user.mobileVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { mobileVerified: true },
      });
    }

    return this.issueUserSession(user, 'user.login_otp', meta);
  }

  /**
   * Registers a new user after verifying a 4-digit mobile OTP.
   */
  async registerWithOtp(
    dto: OtpRegisterDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResult> {
    if (!this.otpService) {
      throw new Error('OtpService is not initialized');
    }

    const mobile = await this.otpService.verifyAndConsumeOtp(
      dto.mobile,
      dto.otp,
      'REGISTER',
    );

    const existingMobile = await this.prisma.user.findUnique({
      where: { mobile },
      select: { id: true },
    });
    if (existingMobile) {
      throw new ConflictError('A user with this mobile number already exists');
    }

    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true },
      });
      if (existingEmail) {
        throw new ConflictError('A user with this email address already exists');
      }
    }

    const organizationName =
      dto.organizationName ?? `${dto.firstName}'s Properties`;
    let registration: { user: User; organization: Organization };
    try {
      registration = await this.prisma.$transaction(
        async (tx) => {
          const user = await tx.user.create({
            data: {
              email: dto.email ?? null,
              passwordHash: null,
              firstName: dto.firstName,
              lastName: dto.lastName,
              mobile,
              mobileVerified: true,
            },
          });

          const baseSlug = generateOrganizationSlug(organizationName);
          const slug = `${baseSlug.slice(0, 36)}-${user.id.slice(0, 8)}`;
          const organization = await createOrganizationWithOwner(tx, {
            userId: user.id,
            name: organizationName,
            slug,
          });

          await tx.auditLog.create({
            data: {
              userId: user.id,
              action: 'user.registered_otp',
              entityType: 'User',
              entityId: user.id,
              ipAddress: meta?.ipAddress,
              userAgent: meta?.userAgent,
            },
          });

          return { user, organization };
        },
        { timeout: 30000, maxWait: 15000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.target;
        const fields = Array.isArray(target)
          ? target
          : typeof target === 'string'
            ? [target]
            : [];
        if (
          fields.some(
            (field) => typeof field === 'string' && field.includes('email'),
          )
        ) {
          throw new ConflictError(
            'A user with this email address already exists',
          );
        }
        if (
          fields.some(
            (field) => typeof field === 'string' && field.includes('mobile'),
          )
        ) {
          throw new ConflictError(
            'A user with this mobile number already exists',
          );
        }
      }
      throw error;
    }

    const { user, organization } = registration;
    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      undefined,
      meta?.userAgent,
      meta?.ipAddress,
    );

    const accessToken = await this.tokenService.generateAccessToken({
      id: user.id,
      email: user.email ?? '',
      orgId: organization.id,
      orgRole: 'OWNER',
    });

    return {
      tokens: {
        accessToken,
        refreshToken: refreshToken.rawToken,
        expiresIn: '15m',
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile,
        activeOrganizationId: organization.id,
        activeOrganizationRole: 'OWNER',
      },
    };
  }

  private async issueUserSession(
    user: User & {
      memberships: Array<{ organizationId: string; role: string }>;
    },
    auditAction: 'user.login' | 'user.login_otp',
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResult> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: auditAction,
        entityType: 'User',
        entityId: user.id,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    const activeMembership = user.memberships[0];
    const orgId = activeMembership ? activeMembership.organizationId : null;
    const orgRole = activeMembership ? activeMembership.role : null;

    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      undefined,
      meta?.userAgent,
      meta?.ipAddress,
    );

    const accessToken = await this.tokenService.generateAccessToken({
      id: user.id,
      email: user.email ?? '',
      orgId,
      orgRole,
    });

    return {
      tokens: {
        accessToken,
        refreshToken: refreshToken.rawToken,
        expiresIn: '15m',
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile,
        activeOrganizationId: orgId,
        activeOrganizationRole: orgRole,
      },
    };
  }

  /**
   * Rotates an existing refresh token and returns new tokens.
   */
  async refresh(
    rawToken: string,
    meta?: { ipAddress?: string; userAgent?: string; organizationId?: string },
  ): Promise<{ tokens: TokenPair }> {
    const { tokenPair } = await this.tokenService.rotateRefreshToken(
      rawToken,
      meta?.userAgent,
      meta?.ipAddress,
      meta?.organizationId,
    );
    return { tokens: tokenPair };
  }

  /**
   * Logs out the user by revoking the refresh token.
   */
  async logout(rawToken: string, userId: string): Promise<void> {
    await this.tokenService.revokeToken(rawToken);

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'user.logout',
        entityType: 'User',
        entityId: userId,
      },
    });
  }

  /**
   * Retrieves profile and organization memberships for the current user.
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        mobile: true,
        emailVerified: true,
        mobileVerified: true,
        createdAt: true,
        memberships: {
          where: { isActive: true },
          select: {
            id: true,
            role: true,
            joinedAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return user;
  }
}
