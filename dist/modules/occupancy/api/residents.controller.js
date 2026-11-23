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
import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, } from '@nestjs/swagger';
import { ResidentsService } from '../application/residents.service.js';
import { createResidentSchema, noticeSchema, bulkMoveOutSchema, updateResidentSchema, reallocateResidentSchema, swapBedsSchema, moveOutSchema, queryResidentsSchema, } from './dto/resident.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, CurrentUserId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let ResidentsController = class ResidentsController {
    residentsService;
    constructor(residentsService) {
        this.residentsService = residentsService;
    }
    async create(dto, orgId, userId) {
        return this.residentsService.create(dto, orgId, userId);
    }
    async findAll(query, orgId) {
        return this.residentsService.findAll(orgId, query);
    }
    async findOne(id, orgId) {
        return this.residentsService.findById(id, orgId);
    }
    async update(id, dto, orgId, userId) {
        return this.residentsService.update(id, dto, orgId, userId);
    }
    async reallocate(id, dto, orgId, userId) {
        return this.residentsService.reallocate(id, dto, orgId, userId);
    }
    async swapBeds(dto, orgId, userId) {
        return this.residentsService.swapBeds(dto, orgId, userId);
    }
    giveNotice(id, dto, orgId, userId) {
        return this.residentsService.giveNotice(id, dto, orgId, userId);
    }
    bulkMoveOut(dto, orgId, userId) {
        return this.residentsService.bulkMoveOut(dto, orgId, userId);
    }
    async moveOut(id, dto, orgId, userId) {
        return this.residentsService.moveOut(id, dto, orgId, userId);
    }
};
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Onboard a new resident and allocate room/bed' }),
    ApiResponse({ status: 201, description: 'Resident onboarded' }),
    ApiResponse({ status: 409, description: 'Bed already occupied' }),
    __param(0, Body(new ZodValidationPipe(createResidentSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ResidentsController.prototype, "create", null);
__decorate([
    Get(),
    ApiOperation({ summary: 'List residents with filters and pagination' }),
    ApiResponse({ status: 200, description: 'Paginated residents list' }),
    __param(0, Query(new ZodValidationPipe(queryResidentsSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ResidentsController.prototype, "findAll", null);
__decorate([
    Get(':id'),
    ApiOperation({
        summary: 'Get resident profile, current room/bed, and financial balance summary',
    }),
    ApiResponse({ status: 200, description: 'Resident details' }),
    ApiResponse({ status: 404, description: 'Resident not found' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ResidentsController.prototype, "findOne", null);
__decorate([
    Patch(':id'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Update resident personal or lease details' }),
    ApiResponse({ status: 200, description: 'Resident updated' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updateResidentSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], ResidentsController.prototype, "update", null);
__decorate([
    Post(':id/reallocate'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({
        summary: 'Reallocate resident to a different room or bed with full audit history',
    }),
    ApiResponse({ status: 200, description: 'Reallocation successful' }),
    ApiResponse({ status: 409, description: 'Target bed is occupied' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(reallocateResidentSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], ResidentsController.prototype, "reallocate", null);
__decorate([
    Post('swap-beds'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({
        summary: 'Atomically swap room and bed allocations between two residents',
    }),
    ApiResponse({ status: 200, description: 'Beds swapped successfully' }),
    __param(0, Body(new ZodValidationPipe(swapBedsSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ResidentsController.prototype, "swapBeds", null);
__decorate([
    Post(':id/notice'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(noticeSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], ResidentsController.prototype, "giveNotice", null);
__decorate([
    Post('bulk-move-out'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    __param(0, Body(new ZodValidationPipe(bulkMoveOutSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ResidentsController.prototype, "bulkMoveOut", null);
__decorate([
    Post(':id/move-out'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({
        summary: 'Process resident move-out and release their bed',
    }),
    ApiResponse({ status: 200, description: 'Move out processed' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(moveOutSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], ResidentsController.prototype, "moveOut", null);
ResidentsController = __decorate([
    ApiTags('Residents & Occupancy'),
    Controller('residents'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [ResidentsService])
], ResidentsController);
export { ResidentsController };
//# sourceMappingURL=residents.controller.js.map