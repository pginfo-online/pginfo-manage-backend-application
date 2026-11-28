import { PrismaService } from '../../../platform/database/index.js';
import { TokenService, type TokenPair } from './token.service.js';
import { OtpService } from './otp.service.js';
import type { RegisterDto, LoginDto, OtpLoginDto, OtpRegisterDto } from '../api/dto/auth.dto.js';
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
export declare class AuthService {
    private readonly prisma;
    private readonly tokenService;
    private readonly otpService?;
    private readonly logger;
    constructor(prisma: PrismaService, tokenService: TokenService, otpService?: OtpService | undefined);
    register(dto: RegisterDto, meta?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<AuthResult>;
    login(dto: LoginDto, meta?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<AuthResult>;
    loginWithOtp(dto: OtpLoginDto, meta?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<AuthResult>;
    registerWithOtp(dto: OtpRegisterDto, meta?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<AuthResult>;
    private issueUserSession;
    refresh(rawToken: string, meta?: {
        ipAddress?: string;
        userAgent?: string;
        organizationId?: string;
    }): Promise<{
        tokens: TokenPair;
    }>;
    logout(rawToken: string, userId: string): Promise<void>;
    getMe(userId: string): Promise<{
        id: string;
        email: string | null;
        mobile: string | null;
        firstName: string;
        lastName: string | null;
        emailVerified: boolean;
        mobileVerified: boolean;
        createdAt: Date;
        memberships: {
            organization: {
                id: string;
                name: string;
                isActive: boolean;
                slug: string;
            };
            id: string;
            role: import("@prisma/client").$Enums.OrgRole;
            joinedAt: Date;
        }[];
    }>;
}
