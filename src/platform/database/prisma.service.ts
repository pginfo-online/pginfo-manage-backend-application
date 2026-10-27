import {
  Injectable,
  type OnModuleInit,
  type OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService wraps the Prisma Client and manages its lifecycle.
 * It connects on module init and disconnects gracefully on shutdown.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    if (process.env['NODE_ENV'] === 'test') {
      try {
        await this.$connect();
        this.logger.log('Database connected in test mode');
      } catch {
        this.logger.warn(
          'Database connection skipped or unavailable in test mode; continuing for tests without DB dependency.',
        );
      }
      return;
    }

    this.logger.log('Connecting to database…');
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from database…');
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Health check: attempt a lightweight query.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
