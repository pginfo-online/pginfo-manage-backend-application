var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
let AdminModule = class AdminModule {
};
AdminModule = __decorate([
    Module({
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
], AdminModule);
export { AdminModule };
//# sourceMappingURL=admin.module.js.map