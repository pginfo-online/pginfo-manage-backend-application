var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CacheModule_1;
import { Global, Module, Logger, Inject, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
export const REDIS_CLIENT = 'REDIS_CLIENT';
let CacheModule = CacheModule_1 = class CacheModule {
    client;
    logger = new Logger(CacheModule_1.name);
    constructor(client) {
        this.client = client;
    }
    async onApplicationShutdown() {
        try {
            if (this.client &&
                (this.client.status === 'ready' || this.client.status === 'connecting')) {
                this.logger.log('Disconnecting Redis client gracefully...');
                await this.client.quit();
            }
        }
        catch {
            this.client?.disconnect();
        }
    }
};
CacheModule = CacheModule_1 = __decorate([
    Global(),
    Module({
        providers: [
            {
                provide: REDIS_CLIENT,
                useFactory: (config) => {
                    const logger = new Logger('RedisModule');
                    const client = new Redis({
                        host: config.get('REDIS_HOST'),
                        port: config.get('REDIS_PORT'),
                        password: config.get('REDIS_PASSWORD') || undefined,
                        tls: config.get('REDIS_TLS_ENABLED') ? {} : undefined,
                        maxRetriesPerRequest: null,
                        retryStrategy: (times) => {
                            if (times > 10) {
                                logger.error('Redis connection failed after 10 retries');
                                return null;
                            }
                            return Math.min(times * 200, 5000);
                        },
                        lazyConnect: true,
                    });
                    client.on('connect', () => logger.log('Redis connected'));
                    client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
                    client.on('close', () => logger.warn('Redis connection closed'));
                    return client;
                },
                inject: [ConfigService],
            },
        ],
        exports: [REDIS_CLIENT],
    }),
    __param(0, Inject(REDIS_CLIENT)),
    __metadata("design:paramtypes", [Redis])
], CacheModule);
export { CacheModule };
//# sourceMappingURL=cache.module.js.map