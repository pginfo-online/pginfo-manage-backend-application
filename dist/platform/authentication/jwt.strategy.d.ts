import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload, AuthenticatedUser } from '../../common/types/index.js';
import type { EnvConfig } from '../../config/index.js';
import { PrismaService } from '../database/index.js';
import type { Redis } from 'ioredis';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly prisma;
    private readonly redis?;
    constructor(config: ConfigService<EnvConfig, true>, prisma: PrismaService, redis?: Redis | undefined);
    validate(payload: JwtPayload): Promise<AuthenticatedUser>;
}
export {};
