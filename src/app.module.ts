import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

// Platform
import { DatabaseModule } from './platform/database/index.js';
import { LoggingModule } from './platform/logging/index.js';
import { CacheModule } from './platform/cache/index.js';
import { QueueModule } from './platform/queue/index.js';
import { AuthenticationModule } from './platform/authentication/index.js';
import { AuthorizationModule } from './platform/authorization/index.js';
import { HealthModule } from './platform/observability/index.js';
import { StorageModule } from './platform/storage/index.js';

// Business Modules
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

// Config
import { validate } from './config/index.js';

@Module({
  imports: [
    // ── Configuration ────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath:
        process.env['NODE_ENV'] === 'test'
          ? ['.env.test', '.env']
          : ['.env', '.env.local'],
    }),

    // ── Rate Limiting ────────────────────────────────────────
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: parseInt(process.env['THROTTLE_TTL'] ?? '60000', 10),
          limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '100', 10),
        },
      ],
    }),

    // ── Platform Infrastructure ──────────────────────────────
    LoggingModule,
    DatabaseModule,
    CacheModule,
    QueueModule,
    AuthenticationModule,
    AuthorizationModule,
    StorageModule,

    // ── Health Checks ────────────────────────────────────────
    HealthModule,

    // ── Business Modules ─────────────────────────────────────
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
  ],
})
export class AppModule {}
