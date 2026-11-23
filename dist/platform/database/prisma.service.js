var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PrismaService_1;
import { Injectable, Logger, } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
let PrismaService = PrismaService_1 = class PrismaService extends PrismaClient {
    logger = new Logger(PrismaService_1.name);
    constructor() {
        let datasourceUrl = undefined;
        const rawUrl = process.env['DATABASE_URL']?.trim().replace(/^["']|["']$/g, '');
        if (rawUrl) {
            try {
                const parsed = new URL(rawUrl);
                const isWorker = process.env['IS_WORKER'] === 'true' ||
                    process.argv.some((arg) => arg.includes('worker'));
                const rawLimit = parsed.searchParams.get('connection_limit')?.replace(/[^0-9]/g, '');
                const existingLimit = rawLimit ? Number(rawLimit) : null;
                if (isWorker) {
                    parsed.searchParams.set('connection_limit', '2');
                }
                else if (!existingLimit || existingLimit > 5) {
                    parsed.searchParams.set('connection_limit', '4');
                }
                else {
                    parsed.searchParams.set('connection_limit', String(existingLimit));
                }
                datasourceUrl = parsed.toString();
            }
            catch {
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
    async onModuleInit() {
        if (process.env['NODE_ENV'] === 'test') {
            try {
                await this.$connect();
                this.logger.log('Database connected in test mode');
            }
            catch {
                this.logger.warn('Database connection skipped or unavailable in test mode; continuing for tests without DB dependency.');
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
            }
            catch (err) {
                const isLast = attempt === maxAttempts;
                this.logger.warn(`Database connect attempt ${attempt}/${maxAttempts} failed: ${err.message}.${!isLast ? ` Retrying in ${attempt * 2}s...` : ''}`);
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
    async onModuleDestroy() {
        this.logger.log('Disconnecting from database…');
        await this.$disconnect();
        this.logger.log('Database disconnected');
    }
    async isHealthy() {
        try {
            await this.$queryRaw `SELECT 1`;
            return true;
        }
        catch {
            return false;
        }
    }
};
PrismaService = PrismaService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [])
], PrismaService);
export { PrismaService };
//# sourceMappingURL=prisma.service.js.map