export interface JwtPayload {
    sub: string;
    email: string;
    orgId: string | null;
    orgRole: string | null;
    type: 'access';
}
export interface JwtRefreshPayload {
    sub: string;
    family: string;
    type: 'refresh';
}
export interface AuthenticatedUser {
    id: string;
    email: string;
    organizationId: string | null;
    organizationRole: string | null;
    organizationAccessActive: boolean;
    platformAdmin?: {
        id: string;
        role: string;
        status: string;
        permissionOverrides: string[];
    };
}
export interface RequestContext {
    traceId: string;
    user?: AuthenticatedUser;
    ipAddress: string;
    userAgent: string;
}
