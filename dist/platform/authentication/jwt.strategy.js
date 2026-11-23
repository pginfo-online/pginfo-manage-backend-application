var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable, UnauthorizedException, Inject, Optional, } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/index.js';
import { REDIS_CLIENT } from '../cache/index.js';
let JwtStrategy = class JwtStrategy extends PassportStrategy(Strategy) {
    prisma;
    redis;
    constructor(config, prisma, redis) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get('JWT_SECRET'),
            issuer: 'pginfo',
        });
        this.prisma = prisma;
        this.redis = redis;
    }
    async validate(payload) {
        const cacheKey = `auth:user:${payload.sub}:${payload.orgId ?? 'none'}`;
        if (this.redis) {
            try {
                const cached = await this.redis.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            }
            catch {
            }
        }
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
        const authenticatedUser = {
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
        if (this.redis) {
            try {
                await this.redis.set(cacheKey, JSON.stringify(authenticatedUser), 'EX', 60);
            }
            catch {
            }
        }
        return authenticatedUser;
    }
};
JwtStrategy = __decorate([
    Injectable(),
    __param(2, Optional()),
    __param(2, Inject(REDIS_CLIENT)),
    __metadata("design:paramtypes", [ConfigService,
        PrismaService, Function])
], JwtStrategy);
export { JwtStrategy };
//# sourceMappingURL=jwt.strategy.js.map