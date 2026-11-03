import type { PlatformRole } from '@prisma/client';

export const PLATFORM_PERMISSIONS = [
  'dashboard.read',
  'users.read',
  'users.write',
  'organizations.read',
  'organizations.write',
  'properties.read',
  'properties.write',
  'inventory.read',
  'inventory.write',
  'residents.read',
  'bookings.read',
  'finance.read',
  'finance.review',
  'banks.read',
  'banks.review',
  'reports.read',
  'audit.read',
  'support.read',
  'support.write',
  'settings.read',
  'settings.write',
  'admins.manage',
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

const all = [...PLATFORM_PERMISSIONS];

export const ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  SUPER_ADMIN: all,
  OPERATIONS_ADMIN: [
    'dashboard.read',
    'users.read',
    'users.write',
    'organizations.read',
    'organizations.write',
    'properties.read',
    'properties.write',
    'inventory.read',
    'inventory.write',
    'residents.read',
    'bookings.read',
    'reports.read',
    'audit.read',
    'support.read',
    'support.write',
  ],
  FINANCE_ADMIN: [
    'dashboard.read',
    'organizations.read',
    'properties.read',
    'residents.read',
    'finance.read',
    'finance.review',
    'banks.read',
    'banks.review',
    'reports.read',
    'audit.read',
    'support.read',
    'support.write',
  ],
  SUPPORT_ADMIN: [
    'dashboard.read',
    'users.read',
    'organizations.read',
    'properties.read',
    'inventory.read',
    'residents.read',
    'bookings.read',
    'finance.read',
    'banks.read',
    'support.read',
    'support.write',
  ],
  ANALYST: [
    'dashboard.read',
    'organizations.read',
    'properties.read',
    'inventory.read',
    'residents.read',
    'bookings.read',
    'finance.read',
    'banks.read',
    'reports.read',
    'support.read',
  ],
  AUDITOR: [
    'dashboard.read',
    'organizations.read',
    'properties.read',
    'inventory.read',
    'residents.read',
    'finance.read',
    'banks.read',
    'reports.read',
    'audit.read',
    'support.read',
    'settings.read',
  ],
};

export function resolvePermissions(
  role: PlatformRole,
  overrides: string[],
): PlatformPermission[] {
  const knownOverrides = overrides.filter((permission) =>
    PLATFORM_PERMISSIONS.includes(permission as PlatformPermission),
  ) as PlatformPermission[];
  return [...new Set([...ROLE_PERMISSIONS[role], ...knownOverrides])];
}

export interface PlatformAdminContext {
  id: string;
  userId: string;
  role: PlatformRole;
  permissions: PlatformPermission[];
  email: string;
}
