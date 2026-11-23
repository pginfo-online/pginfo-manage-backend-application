import type { OrgRole } from '@prisma/client';
export declare const ORG_ROLES_KEY = "orgRoles";
export declare const RequireOrgRoles: (...roles: OrgRole[]) => import("@nestjs/common").CustomDecorator<string>;
export declare const IS_PUBLIC_KEY = "isPublic";
export declare const Public: () => import("@nestjs/common").CustomDecorator<string>;
