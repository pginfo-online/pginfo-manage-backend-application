var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
let QueueModule = class QueueModule {
};
QueueModule = __decorate([
    Module({
        imports: [
            BullModule.forRootAsync({
                useFactory: (config) => ({
                    connection: {
                        host: config.get('REDIS_HOST'),
                        port: config.get('REDIS_PORT'),
                        password: config.get('REDIS_PASSWORD') || undefined,
                        tls: config.get('REDIS_TLS_ENABLED') ? {} : undefined,
                        maxRetriesPerRequest: null,
                    },
                    defaultJobOptions: {
                        removeOnComplete: {
                            count: 1000,
                            age: 86400,
                        },
                        removeOnFail: {
                            count: 5000,
                            age: 604800,
                        },
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 2000,
                        },
                    },
                }),
                inject: [ConfigService],
            }),
        ],
    })
], QueueModule);
export { QueueModule };
//# sourceMappingURL=queue.module.js.map