import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type {
  JwtPayload,
  AuthenticatedUser,
} from '../../common/types/index.js';
import type { EnvConfig } from '../../config/index.js';
import { PrismaService } from '../database/index.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<EnvConfig, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
      issuer: 'pginfo',
    });
  }

  /**
   * Called after JWT signature verification succeeds.
   * Maps the token payload to the AuthenticatedUser shape
   * that will be injected into request.user.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
        platformAdmin: {
          select: {
            id: true,
            role: true,
            status: true,
            permissionOverrides: true,
          },
        },
        memberships: {
          where: payload.orgId
            ? {
                organizationId: payload.orgId,
                isActive: true,
                organization: { isActive: true },
              }
            : { id: '00000000-0000-0000-0000-000000000000' },
          select: { role: true },
          take: 1,
        },
      },
    });
    if (!user?.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }
    return {
      id: user.id,
      email: user.email,
      organizationId: payload.orgId,
      organizationRole: user.memberships[0]?.role ?? null,
      organizationAccessActive: user.memberships.length === 1,
      platformAdmin: user.platformAdmin
        ? {
            ...user.platformAdmin,
            role: user.platformAdmin.role,
            status: user.platformAdmin.status,
          }
        : undefined,
    };
  }
}
