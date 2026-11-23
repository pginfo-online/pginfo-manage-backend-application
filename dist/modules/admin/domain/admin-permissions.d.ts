import type { PlatformRole } from '@prisma/client';
export declare const PLATFORM_PERMISSIONS: readonly ["dashboard.read", "users.read", "users.write", "organizations.read", "organizations.write", "properties.read", "properties.write", "inventory.read", "inventory.write", "residents.read", "bookings.read", "finance.read", "finance.review", "banks.read", "banks.review", "reports.read", "audit.read", "support.read", "support.write", "settings.read", "settings.write", "admins.manage"];
export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];
export declare const ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]>;
export declare function resolvePermissions(role: PlatformRole, overrides: string[]): PlatformPermission[];
export interface PlatformAdminContext {
    id: string;
    userId: string;
    role: PlatformRole;
    permissions: PlatformPermission[];
    email: string;
}
