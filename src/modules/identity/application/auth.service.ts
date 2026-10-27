import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { PasswordHasher } from '../domain/password-hasher.js';
import { TokenService, type TokenPair } from './token.service.js';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../../common/errors/index.js';
import type { RegisterDto, LoginDto } from '../api/dto/auth.dto.js';

export interface AuthResult {
  tokens: TokenPair;
  user: {
    id: string;
    email: string;
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

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        mobile: dto.mobile,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'user.registered',
        entityType: 'User',
        entityId: user.id,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      undefined,
      meta?.userAgent,
      meta?.ipAddress,
    );

    const accessToken = await this.tokenService.generateAccessToken({
      id: user.id,
      email: user.email,
      orgId: null,
      orgRole: null,
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
        activeOrganizationId: null,
        activeOrganizationRole: null,
      },
    };
  }

  /**
   * Authenticates a user with email and password.
   */
  async login(
    dto: LoginDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        memberships: {
          where: { isActive: true },
          include: { organization: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError(
        'Account is disabled. Please contact support.',
      );
    }

    const isPasswordValid = await PasswordHasher.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for user: ${dto.email}`);
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'user.login',
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
      email: user.email,
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
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ tokens: TokenPair }> {
    const { tokenPair } = await this.tokenService.rotateRefreshToken(
      rawToken,
      meta?.userAgent,
      meta?.ipAddress,
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
