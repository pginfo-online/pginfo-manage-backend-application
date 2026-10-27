import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { EnvConfig } from '../../config/index.js';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService<EnvConfig, true>) => {
        const logger = new Logger('RedisModule');

        const client = new Redis({
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD') || undefined,
          tls: config.get('REDIS_TLS_ENABLED') ? {} : undefined,
          maxRetriesPerRequest: null, // Required for BullMQ
          retryStrategy: (times: number) => {
            if (times > 10) {
              logger.error('Redis connection failed after 10 retries');
              return null; // Stop retrying
            }
            return Math.min(times * 200, 5000);
          },
          lazyConnect: true,
        });

        client.on('connect', () => logger.log('Redis connected'));
        client.on('error', (err: Error) =>
          logger.error(`Redis error: ${err.message}`),
        );
        client.on('close', () => logger.warn('Redis connection closed'));

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class CacheModule {}
