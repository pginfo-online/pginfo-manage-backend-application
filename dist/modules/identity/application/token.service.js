var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TokenService_1;
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../platform/database/index.js';
import { UnauthorizedError } from '../../../common/errors/index.js';
let TokenService = TokenService_1 = class TokenService {
    jwtService;
    prisma;
    config;
    logger = new Logger(TokenService_1.name);
    constructor(jwtService, prisma, config) {
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.config = config;
    }
    hashToken(token) {
        return createHash('sha256').update(token).digest('hex');
    }
    async generateAccessToken(user) {
        const payload = {
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
    async generateRefreshToken(userId, family = uuidv4(), userAgent, ipAddress) {
        const rawToken = randomBytes(40).toString('hex');
        const tokenHash = this.hashToken(rawToken);
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
    async rotateRefreshToken(rawToken, userAgent, ipAddress, organizationId) {
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
        if (existingToken.revokedAt) {
            this.logger.warn(`Token reuse detected for user ${existingToken.userId} in token family ${existingToken.family}! Revoking entire family.`);
            await this.prisma.refreshToken.updateMany({
                where: { family: existingToken.family },
                data: { revokedAt: new Date() },
            });
            throw new UnauthorizedError('Token reuse detected. All sessions in this chain have been revoked.');
        }
        if (new Date() > existingToken.expiresAt) {
            throw new UnauthorizedError('Refresh token has expired');
        }
        if (!existingToken.user.isActive) {
            throw new UnauthorizedError('User account is deactivated');
        }
        const primaryMembership = existingToken.user.memberships[0];
        if (organizationId && !primaryMembership) {
            throw new UnauthorizedError('The selected organization is no longer available');
        }
        const nextToken = await this.generateRefreshToken(existingToken.userId, existingToken.family, userAgent, ipAddress);
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
    async revokeToken(rawToken) {
        const tokenHash = this.hashToken(rawToken);
        await this.prisma.refreshToken.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async revokeAllUserTokens(userId) {
        await this.prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
};
TokenService = TokenService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [JwtService,
        PrismaService,
        ConfigService])
], TokenService);
export { TokenService };
//# sourceMappingURL=token.service.js.map