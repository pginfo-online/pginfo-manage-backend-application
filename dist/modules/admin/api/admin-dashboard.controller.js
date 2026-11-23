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
import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../platform/authentication/index.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { CurrentPlatformAdmin, PlatformAdminGuard, RequirePlatformPermissions, } from '../authorization/admin-authorization.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import { AdminAuditService } from '../application/admin-audit.service.js';
import { adminDashboardQuerySchema, } from './dto/admin.dto.js';
import { adminRequestMetadata } from './admin-request.js';
let AdminDashboardController = class AdminDashboardController {
    queryService;
    audit;
    constructor(queryService, audit) {
        this.queryService = queryService;
        this.audit = audit;
    }
    dashboard(query) {
        return this.queryService.dashboardSnapshot(query);
    }
    portfolioReport(query) {
        return this.queryService.platformReport(query);
    }
    async portfolioReportCsv(query, response, actor, request) {
        response.type('text/csv; charset=utf-8');
        response.setHeader('Content-Disposition', 'attachment; filename="pginfo-platform-portfolio.csv"');
        const csv = await this.queryService.platformReportCsv(query);
        await this.audit.record(actor.userId, 'platform_report.export', 'PlatformReport', 'portfolio', {
            organizationId: query.organizationId,
            metadata: {
                format: 'csv',
                from: query.from?.toISOString(),
                to: query.to?.toISOString(),
            },
            request: adminRequestMetadata(request),
        });
        return csv;
    }
};
__decorate([
    Get('dashboard'),
    RequirePlatformPermissions('dashboard.read'),
    ApiOperation({ summary: 'Get platform-wide operational and financial KPIs' }),
    __param(0, Query(new ZodValidationPipe(adminDashboardQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminDashboardController.prototype, "dashboard", null);
__decorate([
    Get('reports/portfolio'),
    RequirePlatformPermissions('reports.read'),
    ApiOperation({ summary: 'Get organization-level portfolio report' }),
    __param(0, Query(new ZodValidationPipe(adminDashboardQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminDashboardController.prototype, "portfolioReport", null);
__decorate([
    Get('reports/portfolio.csv'),
    RequirePlatformPermissions('reports.read'),
    ApiOperation({
        summary: 'Download the organization portfolio report as CSV',
    }),
    __param(0, Query(new ZodValidationPipe(adminDashboardQuerySchema))),
    __param(1, Res({ passthrough: true })),
    __param(2, CurrentPlatformAdmin()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "portfolioReportCsv", null);
AdminDashboardController = __decorate([
    ApiTags('Platform Admin: Dashboard and Reports'),
    ApiBearerAuth('JWT'),
    Controller('admin'),
    UseGuards(JwtAuthGuard, PlatformAdminGuard),
    __metadata("design:paramtypes", [AdminQueryService,
        AdminAuditService])
], AdminDashboardController);
export { AdminDashboardController };
//# sourceMappingURL=admin-dashboard.controller.js.map