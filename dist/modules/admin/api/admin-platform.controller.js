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
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../platform/authentication/index.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { CurrentPlatformAdmin, PlatformAdminGuard, RequirePlatformPermissions, } from '../authorization/admin-authorization.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import { AdminCommandService } from '../application/admin-command.service.js';
import { adminAnnouncementsQuerySchema, adminBookingsQuerySchema, adminComplaintsQuerySchema, adminInventoryQuerySchema, adminOrganizationsQuerySchema, adminPropertiesQuerySchema, adminResidentsQuerySchema, updateBedStatusSchema, updateOrganizationStatusSchema, updatePropertyStatusSchema, updateRoomStatusSchema, } from './dto/admin.dto.js';
import { adminRequestMetadata } from './admin-request.js';
let AdminPlatformController = class AdminPlatformController {
    queryService;
    commands;
    constructor(queryService, commands) {
        this.queryService = queryService;
        this.commands = commands;
    }
    organizations(query) {
        return this.queryService.organizations(query);
    }
    organization(id) {
        return this.queryService.organization(id);
    }
    updateOrganizationStatus(id, dto, actor, request) {
        return this.commands.updateOrganizationStatus(id, dto, actor, adminRequestMetadata(request));
    }
    properties(query) {
        return this.queryService.properties(query);
    }
    property(id) {
        return this.queryService.property(id);
    }
    updatePropertyStatus(id, dto, actor, request) {
        return this.commands.updatePropertyStatus(id, dto, actor, adminRequestMetadata(request));
    }
    rooms(query) {
        return this.queryService.rooms(query);
    }
    updateRoomStatus(id, dto, actor, request) {
        return this.commands.updateRoomStatus(id, dto, actor, adminRequestMetadata(request));
    }
    beds(query) {
        return this.queryService.beds(query);
    }
    updateBedStatus(id, dto, actor, request) {
        return this.commands.updateBedStatus(id, dto, actor, adminRequestMetadata(request));
    }
    residents(query) {
        return this.queryService.residents(query);
    }
    bookings(query) {
        return this.queryService.bookings(query);
    }
    complaints(query) {
        return this.queryService.complaints(query);
    }
    complaint(id) {
        return this.queryService.complaint(id);
    }
    announcements(query) {
        return this.queryService.announcements(query);
    }
};
__decorate([
    Get('organizations'),
    RequirePlatformPermissions('organizations.read'),
    __param(0, Query(new ZodValidationPipe(adminOrganizationsQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "organizations", null);
__decorate([
    Get('organizations/:id'),
    RequirePlatformPermissions('organizations.read'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "organization", null);
__decorate([
    Patch('organizations/:id/status'),
    RequirePlatformPermissions('organizations.write'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updateOrganizationStatusSchema))),
    __param(2, CurrentPlatformAdmin()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "updateOrganizationStatus", null);
__decorate([
    Get('properties'),
    RequirePlatformPermissions('properties.read'),
    __param(0, Query(new ZodValidationPipe(adminPropertiesQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "properties", null);
__decorate([
    Get('properties/:id'),
    RequirePlatformPermissions('properties.read'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "property", null);
__decorate([
    Patch('properties/:id/status'),
    RequirePlatformPermissions('properties.write'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updatePropertyStatusSchema))),
    __param(2, CurrentPlatformAdmin()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "updatePropertyStatus", null);
__decorate([
    Get('rooms'),
    RequirePlatformPermissions('inventory.read'),
    __param(0, Query(new ZodValidationPipe(adminInventoryQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "rooms", null);
__decorate([
    Patch('rooms/:id/status'),
    RequirePlatformPermissions('inventory.write'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updateRoomStatusSchema))),
    __param(2, CurrentPlatformAdmin()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "updateRoomStatus", null);
__decorate([
    Get('beds'),
    RequirePlatformPermissions('inventory.read'),
    __param(0, Query(new ZodValidationPipe(adminInventoryQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "beds", null);
__decorate([
    Patch('beds/:id/status'),
    RequirePlatformPermissions('inventory.write'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updateBedStatusSchema))),
    __param(2, CurrentPlatformAdmin()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "updateBedStatus", null);
__decorate([
    Get('residents'),
    RequirePlatformPermissions('residents.read'),
    __param(0, Query(new ZodValidationPipe(adminResidentsQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "residents", null);
__decorate([
    Get('bookings'),
    RequirePlatformPermissions('bookings.read'),
    __param(0, Query(new ZodValidationPipe(adminBookingsQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "bookings", null);
__decorate([
    Get('complaints'),
    RequirePlatformPermissions('support.read'),
    __param(0, Query(new ZodValidationPipe(adminComplaintsQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "complaints", null);
__decorate([
    Get('complaints/:id'),
    RequirePlatformPermissions('support.read'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "complaint", null);
__decorate([
    Get('announcements'),
    RequirePlatformPermissions('support.read'),
    ApiOperation({ summary: 'Monitor organization and property announcements' }),
    __param(0, Query(new ZodValidationPipe(adminAnnouncementsQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminPlatformController.prototype, "announcements", null);
AdminPlatformController = __decorate([
    ApiTags('Platform Admin: Property Operations'),
    ApiBearerAuth('JWT'),
    Controller('admin'),
    UseGuards(JwtAuthGuard, PlatformAdminGuard),
    __metadata("design:paramtypes", [AdminQueryService,
        AdminCommandService])
], AdminPlatformController);
export { AdminPlatformController };
//# sourceMappingURL=admin-platform.controller.js.map