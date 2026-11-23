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
import { Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, } from '@nestjs/swagger';
import { MetersService } from '../application/meters.service.js';
import { createSubMeterSchema, recordReadingSchema, queryMetersSchema, } from './dto/meter.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, CurrentUser, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let MetersController = class MetersController {
    metersService;
    constructor(metersService) {
        this.metersService = metersService;
    }
    async create(dto, orgId) {
        return this.metersService.create(dto, orgId);
    }
    async findAll(query, orgId) {
        return this.metersService.findAll(orgId, query);
    }
    async findOne(id, orgId) {
        return this.metersService.findById(id, orgId);
    }
    async recordReading(id, dto, orgId, userId) {
        return this.metersService.recordReading(id, dto, orgId, userId);
    }
    async getReadings(id, orgId) {
        return this.metersService.getReadings(id, orgId);
    }
};
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Register an electric sub-meter' }),
    ApiResponse({ status: 201, description: 'Sub-meter registered' }),
    __param(0, Body(new ZodValidationPipe(createSubMeterSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MetersController.prototype, "create", null);
__decorate([
    Get(),
    ApiOperation({ summary: 'List electric sub-meters' }),
    ApiResponse({ status: 200, description: 'List of sub-meters' }),
    __param(0, Query(new ZodValidationPipe(queryMetersSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MetersController.prototype, "findAll", null);
__decorate([
    Get(':id'),
    ApiOperation({ summary: 'Get details and reading history for a sub-meter' }),
    ApiResponse({ status: 200, description: 'Sub-meter details' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MetersController.prototype, "findOne", null);
__decorate([
    Post(':id/readings'),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Record a new meter reading' }),
    ApiResponse({ status: 201, description: 'Meter reading recorded' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(recordReadingSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], MetersController.prototype, "recordReading", null);
__decorate([
    Get(':id/readings'),
    ApiOperation({ summary: 'Get reading logs for a sub-meter' }),
    ApiResponse({ status: 200, description: 'List of readings' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MetersController.prototype, "getReadings", null);
MetersController = __decorate([
    ApiTags('Property: Electric Sub-Meters'),
    Controller('meters'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [MetersService])
], MetersController);
export { MetersController };
//# sourceMappingURL=meters.controller.js.map