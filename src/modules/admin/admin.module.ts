import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module.js';
import { AdminCollectionsService } from './application/admin-collections.service.js';
import { AdminAccessController } from './api/admin-access.controller.js';
import { AdminDashboardController } from './api/admin-dashboard.controller.js';
import { AdminPlatformController } from './api/admin-platform.controller.js';
import { AdminFinanceController } from './api/admin-finance.controller.js';
import { AdminGovernanceController } from './api/admin-governance.controller.js';
import { PlatformAdminGuard } from './authorization/admin-authorization.js';
import { AdminAuditService } from './application/admin-audit.service.js';
import { AdminAccessService } from './application/admin-access.service.js';
import { AdminQueryService } from './application/admin-query.service.js';
import { AdminCommandService } from './application/admin-command.service.js';
import { AdminGovernanceService } from './application/admin-governance.service.js';

@Module({
  imports: [FinanceModule],
  controllers: [
    AdminAccessController,
    AdminDashboardController,
    AdminPlatformController,
    AdminFinanceController,
    AdminGovernanceController,
  ],
  providers: [
    AdminCollectionsService,
    PlatformAdminGuard,
    AdminAuditService,
    AdminAccessService,
    AdminQueryService,
    AdminCommandService,
    AdminGovernanceService,
  ],
})
export class AdminModule {}
