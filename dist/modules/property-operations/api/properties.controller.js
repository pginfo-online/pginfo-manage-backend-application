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
import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, } from '@nestjs/swagger';
import { PropertiesService } from '../application/properties.service.js';
import { createPropertySchema, updatePropertySchema, queryPropertiesSchema, } from './dto/property.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, CurrentUserId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let PropertiesController = class PropertiesController {
    propertiesService;
    constructor(propertiesService) {
        this.propertiesService = propertiesService;
    }
    async create(dto, orgId, userId) {
        return this.propertiesService.create(dto, orgId, userId);
    }
    async findAll(query, orgId) {
        return this.propertiesService.findAll(orgId, query);
    }
    async findOne(id, orgId) {
        return this.propertiesService.findById(id, orgId);
    }
    async update(id, dto, orgId, userId) {
        return this.propertiesService.update(id, dto, orgId, userId);
    }
    async archive(id, orgId, userId) {
        return this.propertiesService.archive(id, orgId, userId);
    }
    async getOccupancyMap(id, orgId) {
        return this.propertiesService.getOccupancyMap(id, orgId);
    }
};
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({
        summary: 'Create a new property within current organization',
    }),
    ApiResponse({ status: 201, description: 'Property created' }),
    __param(0, Body(new ZodValidationPipe(createPropertySchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "create", null);
__decorate([
    Get(),
    ApiOperation({ summary: 'List properties in current organization' }),
    ApiResponse({ status: 200, description: 'Paginated list of properties' }),
    __param(0, Query(new ZodValidationPipe(queryPropertiesSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "findAll", null);
__decorate([
    Get(':id'),
    ApiOperation({ summary: 'Get property details with live statistics' }),
    ApiResponse({ status: 200, description: 'Property details' }),
    ApiResponse({ status: 404, description: 'Property not found' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "findOne", null);
__decorate([
    Patch(':id'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Update property details' }),
    ApiResponse({ status: 200, description: 'Property updated' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updatePropertySchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "update", null);
__decorate([
    Delete(':id'),
    RequireOrgRoles('OWNER', 'ADMIN'),
    ApiOperation({ summary: 'Archive a property (soft delete)' }),
    ApiResponse({ status: 200, description: 'Property archived' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "archive", null);
__decorate([
    Get(':id/occupancy-map'),
    ApiOperation({
        summary: 'Get full visual room & bed occupancy map with residents',
    }),
    ApiResponse({ status: 200, description: 'Floor/room/bed occupancy map' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "getOccupancyMap", null);
PropertiesController = __decorate([
    ApiTags('Properties'),
    Controller('properties'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [PropertiesService])
], PropertiesController);
export { PropertiesController };
//# sourceMappingURL=properties.controller.js.map