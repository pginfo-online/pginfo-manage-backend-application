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
    let datasourceUrl: string | undefined = undefined;
    const rawUrl = process.env['DATABASE_URL']?.trim().replace(/^["']|["']$/g, '');
    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        const isWorker =
          process.env['IS_WORKER'] === 'true' ||
          process.argv.some((arg) => arg.includes('worker'));

        // Clean any stray quote or non-digit chars from connection_limit
        const rawLimit = parsed.searchParams.get('connection_limit')?.replace(/[^0-9]/g, '');
        const existingLimit = rawLimit ? Number(rawLimit) : null;

        // Bound connection limits safely to prevent exceeding Supabase Supavisor pool limits (15 in session mode)
        if (isWorker) {
          parsed.searchParams.set('connection_limit', '2');
        } else if (!existingLimit || existingLimit > 5) {
          parsed.searchParams.set('connection_limit', '4');
        } else {
          parsed.searchParams.set('connection_limit', String(existingLimit));
        }

        datasourceUrl = parsed.toString();
      } catch {
        // Fall back to Prisma schema default if URL parsing fails
      }
    }

    super({
      ...(datasourceUrl ? { datasourceUrl } : {}),
      transactionOptions: {
        maxWait: 10_000,
        timeout: 30_000,
      },
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
    let connected = false;
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        connected = true;
        break;
      } catch (err: any) {
        const isLast = attempt === maxAttempts;
        this.logger.warn(
          `Database connect attempt ${attempt}/${maxAttempts} failed: ${err.message}.${
            !isLast ? ` Retrying in ${attempt * 2}s...` : ''
          }`,
        );
        if (!isLast) {
          await new Promise((res) => setTimeout(res, attempt * 2000));
        }
      }
    }
    if (!connected) {
      await this.$connect();
    }
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
