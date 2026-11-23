import { SetMetadata } from '@nestjs/common';
export const ORG_ROLES_KEY = 'orgRoles';
export const RequireOrgRoles = (...roles) => SetMetadata(ORG_ROLES_KEY, roles);
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
//# sourceMappingURL=decorators.js.map