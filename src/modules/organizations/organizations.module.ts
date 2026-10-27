import { Module } from '@nestjs/common';
import { OrganizationsController } from './api/organizations.controller.js';
import { OrganizationsService } from './application/organizations.service.js';
import { IdentityModule } from '../identity/identity.module.js';

@Module({
  imports: [IdentityModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
