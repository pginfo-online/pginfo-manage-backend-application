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
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, } from '@nestjs/swagger';
import { ExportService } from '../application/export.service.js';
import { JwtAuthGuard, CurrentOrgId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let ReportsController = class ReportsController {
    exportService;
    constructor(exportService) {
        this.exportService = exportService;
    }
    async exportCollections(orgId, res, propertyId) {
        const csv = await this.exportService.exportCollectionsCsv(orgId, propertyId);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="collections-${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(csv);
    }
    async exportResidents(orgId, res, propertyId) {
        const csv = await this.exportService.exportResidentsCsv(orgId, propertyId);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="residents-${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(csv);
    }
    async exportExpenses(orgId, res, propertyId) {
        const csv = await this.exportService.exportExpensesCsv(orgId, propertyId);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="expenses-${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(csv);
    }
};
__decorate([
    Get('collections/csv'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Export collections and payments to CSV' }),
    ApiResponse({ status: 200, description: 'CSV file download' }),
    __param(0, CurrentOrgId()),
    __param(1, Res()),
    __param(2, Query('propertyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportCollections", null);
__decorate([
    Get('residents/csv'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Export residents registry to CSV' }),
    ApiResponse({ status: 200, description: 'CSV file download' }),
    __param(0, CurrentOrgId()),
    __param(1, Res()),
    __param(2, Query('propertyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportResidents", null);
__decorate([
    Get('expenses/csv'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Export expenses to CSV' }),
    ApiResponse({ status: 200, description: 'CSV file download' }),
    __param(0, CurrentOrgId()),
    __param(1, Res()),
    __param(2, Query('propertyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportExpenses", null);
ReportsController = __decorate([
    ApiTags('Reports & Exports'),
    Controller('reports'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [ExportService])
], ReportsController);
export { ReportsController };
//# sourceMappingURL=reports.controller.js.map