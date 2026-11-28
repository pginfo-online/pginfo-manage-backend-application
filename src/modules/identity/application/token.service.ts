import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../platform/database/index.js';
import { UnauthorizedError } from '../../../common/errors/index.js';
import type { JwtPayload } from '../../../common/types/index.js';
import type { EnvConfig } from '../../../config/index.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  /**
   * Hashes a raw refresh token using SHA-256 for secure DB persistence.
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a signed JWT access token.
   */
  async generateAccessToken(user: {
    id: string;
    email: string;
    orgId: string | null;
    orgRole: string | null;
  }): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
      orgRole: user.orgRole,
      type: 'access',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRATION'),
    });
  }

  /**
   * Issues a new refresh token and records it in the database.
   * If no family is provided, a new family is created.
   */
  async generateRefreshToken(
    userId: string,
    family = uuidv4(),
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ rawToken: string; recordId: string; family: string }> {
    const rawToken = randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    // Default 7 days expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const record = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        family,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return { rawToken, recordId: record.id, family };
  }

  /**
   * Rotates a refresh token with strict reuse detection.
   */
  async rotateRefreshToken(
    rawToken: string,
    userAgent?: string,
    ipAddress?: string,
    organizationId?: string,
  ): Promise<{ tokenPair: TokenPair; userId: string }> {
    const tokenHash = this.hashToken(rawToken);

    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              where: {
                isActive: true,
                ...(organizationId ? { organizationId } : {}),
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!existingToken) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Reuse detection: if token is already revoked, an attacker or compromised client
    // is attempting to replay a previously used token. Revoke the entire family immediately!
    if (existingToken.revokedAt) {
      this.logger.warn(
        `Token reuse detected for user ${existingToken.userId} in token family ${existingToken.family}! Revoking entire family.`,
      );
      await this.prisma.refreshToken.updateMany({
        where: { family: existingToken.family },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedError(
        'Token reuse detected. All sessions in this chain have been revoked.',
      );
    }

    // Check expiration
    if (new Date() > existingToken.expiresAt) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    // Check user active
    if (!existingToken.user.isActive) {
      throw new UnauthorizedError('User account is deactivated');
    }

    const primaryMembership = existingToken.user.memberships[0];
    if (organizationId && !primaryMembership) {
      throw new UnauthorizedError(
        'The selected organization is no longer available',
      );
    }

    // Create successor token in same family
    const nextToken = await this.generateRefreshToken(
      existingToken.userId,
      existingToken.family,
      userAgent,
      ipAddress,
    );

    // Mark current token as revoked and replaced
    await this.prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: {
        revokedAt: new Date(),
        replacedBy: nextToken.recordId,
      },
    });

    const accessToken = await this.generateAccessToken({
      id: existingToken.user.id,
      email: existingToken.user.email ?? '',
      orgId: primaryMembership ? primaryMembership.organizationId : null,
      orgRole: primaryMembership ? primaryMembership.role : null,
    });

    return {
      tokenPair: {
        accessToken,
        refreshToken: nextToken.rawToken,
        expiresIn: this.config.get('JWT_ACCESS_EXPIRATION'),
      },
      userId: existingToken.userId,
    };
  }

  /**
   * Revokes a specific refresh token.
   */
  async revokeToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revokes all refresh tokens for a user (e.g. password reset or global logout).
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
