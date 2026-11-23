var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../platform/database/index.js';
import { LoggingModule } from '../platform/logging/index.js';
import { CacheModule } from '../platform/cache/index.js';
import { QueueModule } from '../platform/queue/index.js';
import { FinanceModule } from '../modules/finance/finance.module.js';
import { CommunicationsModule } from '../modules/communications/communications.module.js';
import { BillingProcessor, BILLING_QUEUE } from './billing.processor.js';
import { CommunicationsProcessor, COMMUNICATIONS_QUEUE, } from './communications.processor.js';
import { validate } from '../config/index.js';
let WorkerModule = class WorkerModule {
};
WorkerModule = __decorate([
    Module({
        imports: [
            ConfigModule.forRoot({
                isGlobal: true,
                validate,
                envFilePath: process.env['NODE_ENV'] === 'test'
                    ? ['.env.test', '.env']
                    : ['.env', '.env.local'],
            }),
            LoggingModule,
            DatabaseModule,
            CacheModule,
            QueueModule,
            BullModule.registerQueue({ name: BILLING_QUEUE }, { name: COMMUNICATIONS_QUEUE }),
            FinanceModule,
            CommunicationsModule,
        ],
        providers: [BillingProcessor, CommunicationsProcessor],
    })
], WorkerModule);
export { WorkerModule };
//# sourceMappingURL=worker.module.js.map