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
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../platform/authentication/index.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { CurrentPlatformAdmin, PlatformAdminGuard, RequirePlatformPermissions, } from '../authorization/admin-authorization.js';
import { AdminAccessService } from '../application/admin-access.service.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import { adminListQuerySchema, adminUsersQuerySchema, createPlatformAdminSchema, updatePlatformAdminSchema, updateUserStatusSchema, } from './dto/admin.dto.js';
import { adminRequestMetadata } from './admin-request.js';
let AdminAccessController = class AdminAccessController {
    access;
    queryService;
    constructor(access, queryService) {
        this.access = access;
        this.queryService = queryService;
    }
    me(actor) {
        return this.access.me(actor);
    }
    listAdmins(query) {
        return this.access.list(query);
    }
    createAdmin(dto, actor, request) {
        return this.access.create(dto, actor, adminRequestMetadata(request));
    }
    updateAdmin(id, dto, actor, request) {
        return this.access.update(id, dto, actor, adminRequestMetadata(request));
    }
    users(query) {
        return this.queryService.users(query);
    }
    user(id) {
        return this.queryService.user(id);
    }
    updateUserStatus(id, dto, actor, request) {
        return this.access.updateUserStatus(id, dto, actor, adminRequestMetadata(request));
    }
};
__decorate([
    Get('me'),
    ApiOperation({ summary: 'Get the current platform admin and permissions' }),
    __param(0, CurrentPlatformAdmin()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminAccessController.prototype, "me", null);
__decorate([
    Get('admins'),
    RequirePlatformPermissions('admins.manage'),
    __param(0, Query(new ZodValidationPipe(adminListQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminAccessController.prototype, "listAdmins", null);
__decorate([
    Post('admins'),
    RequirePlatformPermissions('admins.manage'),
    __param(0, Body(new ZodValidationPipe(createPlatformAdminSchema))),
    __param(1, CurrentPlatformAdmin()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAccessController.prototype, "createAdmin", null);
__decorate([
    Patch('admins/:id'),
    RequirePlatformPermissions('admins.manage'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updatePlatformAdminSchema))),
    __param(2, CurrentPlatformAdmin()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAccessController.prototype, "updateAdmin", null);
__decorate([
    Get('users'),
    RequirePlatformPermissions('users.read'),
    __param(0, Query(new ZodValidationPipe(adminUsersQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminAccessController.prototype, "users", null);
__decorate([
    Get('users/:id'),
    RequirePlatformPermissions('users.read'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminAccessController.prototype, "user", null);
__decorate([
    Patch('users/:id/status'),
    RequirePlatformPermissions('users.write'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updateUserStatusSchema))),
    __param(2, CurrentPlatformAdmin()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAccessController.prototype, "updateUserStatus", null);
AdminAccessController = __decorate([
    ApiTags('Platform Admin: Access and Users'),
    ApiBearerAuth('JWT'),
    Controller('admin'),
    UseGuards(JwtAuthGuard, PlatformAdminGuard),
    __metadata("design:paramtypes", [AdminAccessService,
        AdminQueryService])
], AdminAccessController);
export { AdminAccessController };
//# sourceMappingURL=admin-access.controller.js.map