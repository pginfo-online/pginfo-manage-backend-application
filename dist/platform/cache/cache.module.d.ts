import { type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
export declare const REDIS_CLIENT = "REDIS_CLIENT";
export declare class CacheModule implements OnApplicationShutdown {
    private readonly client;
    private readonly logger;
    constructor(client: Redis);
    onApplicationShutdown(): Promise<void>;
}
