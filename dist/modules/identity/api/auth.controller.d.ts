import type { Request } from 'express';
import { AuthService, type AuthResult } from '../application/auth.service.js';
import { type RegisterDto, type LoginDto, type RefreshTokenDto } from './dto/auth.dto.js';
import type { AuthenticatedUser } from '../../../common/types/index.js';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, req: Request): Promise<AuthResult>;
    login(dto: LoginDto, req: Request): Promise<AuthResult>;
    refresh(dto: RefreshTokenDto, req: Request): Promise<{
        tokens: import("../application/token.service.js").TokenPair;
    }>;
    logout(dto: RefreshTokenDto, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getMe(user: AuthenticatedUser): Promise<{
        id: string;
        email: string;
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
