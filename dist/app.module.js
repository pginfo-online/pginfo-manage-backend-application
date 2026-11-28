var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './platform/database/index.js';
import { LoggingModule } from './platform/logging/index.js';
import { CacheModule } from './platform/cache/index.js';
import { QueueModule } from './platform/queue/index.js';
import { AuthenticationModule } from './platform/authentication/index.js';
import { AuthorizationModule } from './platform/authorization/index.js';
import { HealthModule } from './platform/observability/index.js';
import { StorageModule } from './platform/storage/index.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { OrganizationsModule } from './modules/organizations/organizations.module.js';
import { PropertyOperationsModule } from './modules/property-operations/property-operations.module.js';
import { OccupancyModule } from './modules/occupancy/occupancy.module.js';
import { FinanceModule } from './modules/finance/finance.module.js';
import { ExpensesModule } from './modules/expenses/expenses.module.js';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { StaffModule } from './modules/staff/staff.module.js';
import { CommunicationsModule } from './modules/communications/communications.module.js';
import { ReportingModule } from './modules/reporting/reporting.module.js';
import { LeadsModule } from './modules/leads/leads.module.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { MetersModule } from './modules/meters/meters.module.js';
import { TemplatesModule } from './modules/templates/templates.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { validate } from './config/index.js';
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        imports: [
            ConfigModule.forRoot({
                isGlobal: true,
                validate,
                envFilePath: process.env['NODE_ENV'] === 'test'
                    ? ['.env.test']
                    : ['.env', '.env.local'],
            }),
            ThrottlerModule.forRoot({
                throttlers: [
                    {
                        ttl: parseInt(process.env['THROTTLE_TTL'] ?? '60000', 10),
                        limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '100', 10),
                    },
                ],
            }),
            LoggingModule,
            DatabaseModule,
            CacheModule,
            QueueModule,
            AuthenticationModule,
            AuthorizationModule,
            StorageModule,
            HealthModule,
            IdentityModule,
            OrganizationsModule,
            PropertyOperationsModule,
            OccupancyModule,
            FinanceModule,
            ExpensesModule,
            MaintenanceModule,
            StaffModule,
            CommunicationsModule,
            ReportingModule,
            LeadsModule,
            BookingsModule,
            MetersModule,
            TemplatesModule,
            ReviewsModule,
            AdminModule,
        ],
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map