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
import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, } from '@nestjs/swagger';
import { DashboardService } from '../application/dashboard.service.js';
import { JwtAuthGuard, CurrentOrgId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, OrgRolesGuard, } from '../../../platform/authorization/index.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { dashboardQuerySchema, dashboardPropertiesQuerySchema, } from './dto/dashboard.dto.js';
import { activityQuerySchema, } from './dto/activity.dto.js';
let DashboardController = class DashboardController {
    dashboardService;
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    async getProperties(orgId, query) {
        return this.dashboardService.getProperties(orgId, query);
    }
    async getPropertyLabel(orgId, id) {
        return this.dashboardService.getPropertyLabel(orgId, id);
    }
    async getMetrics(orgId, query) {
        return this.dashboardService.getMetrics(orgId, query.propertyId, query.month, query.year, query.fy === 'true');
    }
    async getActivity(orgId, query) {
        return this.dashboardService.getActivity(orgId, query);
    }
};
__decorate([
    Get('properties'),
    ApiOperation({
        summary: 'List lightweight property labels for dashboard cards',
    }),
    __param(0, CurrentOrgId()),
    __param(1, Query(new ZodValidationPipe(dashboardPropertiesQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getProperties", null);
__decorate([
    Get('properties/:id'),
    ApiOperation({ summary: 'Get a property label for dashboard header' }),
    __param(0, CurrentOrgId()),
    __param(1, Param('id', ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getPropertyLabel", null);
__decorate([
    Get('metrics'),
    ApiOperation({
        summary: 'Get aggregate operational and financial indicators (occupancy, dues, collections, net profit)',
    }),
    ApiResponse({ status: 200, description: 'Dashboard metrics' }),
    __param(0, CurrentOrgId()),
    __param(1, Query(new ZodValidationPipe(dashboardQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getMetrics", null);
__decorate([
    Get('activity'),
    ApiOperation({ summary: 'Get organization-scoped entity activity history' }),
    __param(0, CurrentOrgId()),
    __param(1, Query(new ZodValidationPipe(activityQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getActivity", null);
DashboardController = __decorate([
    ApiTags('Dashboards & Analytics'),
    Controller('dashboard'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [DashboardService])
], DashboardController);
export { DashboardController };
//# sourceMappingURL=dashboard.controller.js.map