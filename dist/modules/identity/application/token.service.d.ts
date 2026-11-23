import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../platform/database/index.js';
import type { EnvConfig } from '../../../config/index.js';
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
}
export declare class TokenService {
    private readonly jwtService;
    private readonly prisma;
    private readonly config;
    private readonly logger;
    constructor(jwtService: JwtService, prisma: PrismaService, config: ConfigService<EnvConfig, true>);
    hashToken(token: string): string;
    generateAccessToken(user: {
        id: string;
        email: string;
        orgId: string | null;
        orgRole: string | null;
    }): Promise<string>;
    generateRefreshToken(userId: string, family?: string, userAgent?: string, ipAddress?: string): Promise<{
        rawToken: string;
        recordId: string;
        family: string;
    }>;
    rotateRefreshToken(rawToken: string, userAgent?: string, ipAddress?: string, organizationId?: string): Promise<{
        tokenPair: TokenPair;
        userId: string;
    }>;
    revokeToken(rawToken: string): Promise<void>;
    revokeAllUserTokens(userId: string): Promise<void>;
}
