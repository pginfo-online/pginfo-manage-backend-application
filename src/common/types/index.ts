/**
 * JWT access token payload — included in every authenticated request.
 */
export interface JwtPayload {
  /** User ID */
  sub: string;
  /** User email */
  email: string;
  /** Currently active organization ID (may be null if not selected) */
  orgId: string | null;
  /** Role within the current organization */
  orgRole: string | null;
  /** Token type */
  type: 'access';
}

/**
 * JWT refresh token payload.
 */
export interface JwtRefreshPayload {
  /** User ID */
  sub: string;
  /** Token family for rotation tracking */
  family: string;
  /** Token type */
  type: 'refresh';
}

/**
 * Authenticated request user — injected by the JWT auth guard.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string | null;
  organizationRole: string | null;
  /** True only when the current DB membership and organization are active. */
  organizationAccessActive: boolean;
  /** Live platform-admin state loaded during JWT validation, never from JWT claims. */
  platformAdmin?: {
    id: string;
    role: string;
    status: string;
    permissionOverrides: string[];
  };
}

/**
 * Request context extracted from headers and auth.
 */
export interface RequestContext {
  traceId: string;
  user?: AuthenticatedUser;
  ipAddress: string;
  userAgent: string;
}
