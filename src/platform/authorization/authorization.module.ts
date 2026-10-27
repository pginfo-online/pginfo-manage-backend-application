import { Module } from '@nestjs/common';
import { OrgRolesGuard } from './org-roles.guard.js';
import { RequireOrgGuard } from './require-org.guard.js';

@Module({
  providers: [OrgRolesGuard, RequireOrgGuard],
  exports: [OrgRolesGuard, RequireOrgGuard],
})
export class AuthorizationModule {}
