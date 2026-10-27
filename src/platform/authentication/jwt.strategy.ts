import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type {
  JwtPayload,
  AuthenticatedUser,
} from '../../common/types/index.js';
import type { EnvConfig } from '../../config/index.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<EnvConfig, true>) {
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
  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      organizationId: payload.orgId,
      organizationRole: payload.orgRole,
    };
  }
}
