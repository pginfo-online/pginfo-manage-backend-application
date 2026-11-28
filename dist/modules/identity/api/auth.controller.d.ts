import type { Request } from 'express';
import { AuthService, type AuthResult } from '../application/auth.service.js';
import { OtpService, type SendOtpResult } from '../application/otp.service.js';
import { type RegisterDto, type LoginDto, type RefreshTokenDto, type SendOtpDto, type ResendOtpDto, type OtpLoginDto, type OtpRegisterDto } from './dto/auth.dto.js';
import type { AuthenticatedUser } from '../../../common/types/index.js';
export declare class AuthController {
    private readonly authService;
    private readonly otpService;
    constructor(authService: AuthService, otpService: OtpService);
    register(dto: RegisterDto, req: Request): Promise<AuthResult>;
    login(dto: LoginDto, req: Request): Promise<AuthResult>;
    sendOtp(dto: SendOtpDto, req: Request): Promise<SendOtpResult>;
    resendOtp(dto: ResendOtpDto, req: Request): Promise<SendOtpResult>;
    otpLogin(dto: OtpLoginDto, req: Request): Promise<AuthResult>;
    otpRegister(dto: OtpRegisterDto, req: Request): Promise<AuthResult>;
    refresh(dto: RefreshTokenDto, req: Request): Promise<{
        tokens: import("../application/token.service.js").TokenPair;
    }>;
    logout(dto: RefreshTokenDto, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getMe(user: AuthenticatedUser): Promise<{
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
