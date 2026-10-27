import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/index.js';

/**
 * Queue module providing BullMQ integration backed by Redis.
 *
 * Individual queues are registered in their respective business modules
 * using BullModule.registerQueue({ name: 'queue-name' }).
 *
 * This module sets up the shared Redis connection for all queues.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD') || undefined,
          tls: config.get('REDIS_TLS_ENABLED') ? {} : undefined,
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          removeOnComplete: {
            count: 1000, // Keep last 1000 completed jobs
            age: 86400, // Remove after 24 hours
          },
          removeOnFail: {
            count: 5000, // Keep more failed jobs for debugging
            age: 604800, // Remove after 7 days
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
export class QueueModule {}
