import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/index.js';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

/**
 * Authentication platform module.
 * Provides JWT token verification and the JwtAuthGuard.
 *
 * Business logic (registration, login, token issuance) lives
 * in src/modules/identity/.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRATION'),
          issuer: 'pginfo',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard, JwtStrategy],
})
export class AuthenticationModule {}
