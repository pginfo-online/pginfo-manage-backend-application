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
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../platform/authentication/index.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { CurrentPlatformAdmin, PlatformAdminGuard, RequirePlatformPermissions, } from '../authorization/admin-authorization.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import { AdminGovernanceService } from '../application/admin-governance.service.js';
import { adminAuditQuerySchema, adminCasesQuerySchema, adminListQuerySchema, createAdminCaseSchema, updateAdminCaseSchema, upsertPlatformSettingSchema, } from './dto/admin.dto.js';
import { adminRequestMetadata } from './admin-request.js';
let AdminGovernanceController = class AdminGovernanceController {
    queryService;
    governance;
    constructor(queryService, governance) {
        this.queryService = queryService;
        this.governance = governance;
    }
    auditLogs(query) {
        return this.queryService.auditLogs(query);
    }
    listCases(query) {
        return this.governance.listCases(query);
    }
    createCase(dto, actor, request) {
        return this.governance.createCase(dto, actor, adminRequestMetadata(request));
    }
    updateCase(id, dto, actor, request) {
        return this.governance.updateCase(id, dto, actor, adminRequestMetadata(request));
    }
    listSettings(query) {
        return this.governance.listSettings(query);
    }
    upsertSetting(key, dto, actor, request) {
        return this.governance.upsertSetting(key, dto, actor, adminRequestMetadata(request));
    }
};
__decorate([
    Get('audit-logs'),
    RequirePlatformPermissions('audit.read'),
    __param(0, Query(new ZodValidationPipe(adminAuditQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminGovernanceController.prototype, "auditLogs", null);
__decorate([
    Get('cases'),
    RequirePlatformPermissions('support.read'),
    __param(0, Query(new ZodValidationPipe(adminCasesQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminGovernanceController.prototype, "listCases", null);
__decorate([
    Post('cases'),
    RequirePlatformPermissions('support.write'),
    __param(0, Body(new ZodValidationPipe(createAdminCaseSchema))),
    __param(1, CurrentPlatformAdmin()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminGovernanceController.prototype, "createCase", null);
__decorate([
    Patch('cases/:id'),
    RequirePlatformPermissions('support.write'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updateAdminCaseSchema))),
    __param(2, CurrentPlatformAdmin()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminGovernanceController.prototype, "updateCase", null);
__decorate([
    Get('settings'),
    RequirePlatformPermissions('settings.read'),
    __param(0, Query(new ZodValidationPipe(adminListQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminGovernanceController.prototype, "listSettings", null);
__decorate([
    Put('settings/:key'),
    RequirePlatformPermissions('settings.write'),
    ApiOperation({
        summary: 'Create or version-safely update a non-secret setting',
    }),
    __param(0, Param('key')),
    __param(1, Body(new ZodValidationPipe(upsertPlatformSettingSchema))),
    __param(2, CurrentPlatformAdmin()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminGovernanceController.prototype, "upsertSetting", null);
AdminGovernanceController = __decorate([
    ApiTags('Platform Admin: Governance'),
    ApiBearerAuth('JWT'),
    Controller('admin'),
    UseGuards(JwtAuthGuard, PlatformAdminGuard),
    __metadata("design:paramtypes", [AdminQueryService,
        AdminGovernanceService])
], AdminGovernanceController);
export { AdminGovernanceController };
//# sourceMappingURL=admin-governance.controller.js.map