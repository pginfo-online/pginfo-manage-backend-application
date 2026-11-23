var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator, } from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../database/index.js';
let HealthController = class HealthController {
    health;
    prismaHealth;
    prisma;
    constructor(health, prismaHealth, prisma) {
        this.health = health;
        this.prismaHealth = prismaHealth;
        this.prisma = prisma;
    }
    root() {
        return {
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        };
    }
    liveness() {
        return { status: 'ok' };
    }
    readiness() {
        return this.health.check([
            () => this.prismaHealth.pingCheck('database', this.prisma, {
                timeout: 5_000,
            }),
        ]);
    }
};
__decorate([
    Get(),
    ApiOperation({ summary: 'Basic health check' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], HealthController.prototype, "root", null);
__decorate([
    Get('live'),
    ApiOperation({ summary: 'Liveness check' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], HealthController.prototype, "liveness", null);
__decorate([
    Get('ready'),
    HealthCheck(),
    ApiOperation({ summary: 'Readiness check' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "readiness", null);
HealthController = __decorate([
    ApiTags('Health'),
    Controller('health'),
    __metadata("design:paramtypes", [HealthCheckService,
        PrismaHealthIndicator,
        PrismaService])
], HealthController);
export { HealthController };
//# sourceMappingURL=health.controller.js.map