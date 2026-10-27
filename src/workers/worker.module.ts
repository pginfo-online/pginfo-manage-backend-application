import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

// Platform
import { DatabaseModule } from '../platform/database/index.js';
import { LoggingModule } from '../platform/logging/index.js';
import { CacheModule } from '../platform/cache/index.js';
import { QueueModule } from '../platform/queue/index.js';

// Business Modules
import { FinanceModule } from '../modules/finance/finance.module.js';
import { CommunicationsModule } from '../modules/communications/communications.module.js';

// Worker Processors
import { BillingProcessor, BILLING_QUEUE } from './billing.processor.js';
import {
  CommunicationsProcessor,
  COMMUNICATIONS_QUEUE,
} from './communications.processor.js';

// Config
import { validate } from '../config/index.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath:
        process.env['NODE_ENV'] === 'test'
          ? ['.env.test', '.env']
          : ['.env', '.env.local'],
    }),
    LoggingModule,
    DatabaseModule,
    CacheModule,
    QueueModule,
    BullModule.registerQueue(
      { name: BILLING_QUEUE },
      { name: COMMUNICATIONS_QUEUE },
    ),
    FinanceModule,
    CommunicationsModule,
  ],
  providers: [BillingProcessor, CommunicationsProcessor],
})
export class WorkerModule {}
