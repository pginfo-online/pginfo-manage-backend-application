import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  type HealthCheckResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../database/index.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Root health probe — basic process liveness & uptime.
   */
  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  root(): { status: string; uptime: number; timestamp: string } {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Liveness probe — is the process running?
   * Used by container orchestrators (Docker, K8s) to restart crashed instances.
   */
  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * Readiness probe — can this instance serve traffic?
   * Checks database connectivity and other critical dependencies.
   */
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check' })
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      // Hosted PostgreSQL can incur TLS/pool cold-start latency. Keep the
      // readiness budget bounded without ejecting a healthy instance on the
      // indicator's overly aggressive one-second default.
      () =>
        this.prismaHealth.pingCheck('database', this.prisma, {
          timeout: 5_000,
        }),
    ]);
  }
}
