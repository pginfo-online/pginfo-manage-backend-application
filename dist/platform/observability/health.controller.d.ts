import { HealthCheckService, PrismaHealthIndicator, type HealthCheckResult } from '@nestjs/terminus';
import { PrismaService } from '../database/index.js';
export declare class HealthController {
    private readonly health;
    private readonly prismaHealth;
    private readonly prisma;
    constructor(health: HealthCheckService, prismaHealth: PrismaHealthIndicator, prisma: PrismaService);
    root(): {
        status: string;
        uptime: number;
        timestamp: string;
    };
    liveness(): {
        status: string;
    };
    readiness(): Promise<HealthCheckResult>;
}
