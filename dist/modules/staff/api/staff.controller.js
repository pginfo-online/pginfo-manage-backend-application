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
import { StaffService } from '../application/staff.service.js';
import { createStaffSchema, updateStaffSchema, createStaffDesignationSchema, queryStaffSchema, } from './dto/staff.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, CurrentUserId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let StaffController = class StaffController {
    staffService;
    constructor(staffService) {
        this.staffService = staffService;
    }
    async create(dto, orgId, userId) {
        return this.staffService.create(dto, orgId, userId);
    }
    async findAll(query, orgId) {
        return this.staffService.findAll(orgId, query);
    }
    async getDesignations(orgId) {
        return this.staffService.getDesignations(orgId);
    }
    async createDesignation(dto, orgId) {
        return this.staffService.createDesignation(dto, orgId);
    }
    async findOne(id, orgId) {
        return this.staffService.findById(id, orgId);
    }
    async update(id, dto, orgId, userId) {
        return this.staffService.update(id, dto, orgId, userId);
    }
    async deactivate(id, orgId, userId) {
        return this.staffService.deactivate(id, orgId, userId);
    }
};
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Add a new staff member' }),
    ApiResponse({ status: 201, description: 'Staff created' }),
    __param(0, Body(new ZodValidationPipe(createStaffSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "create", null);
__decorate([
    Get(),
    ApiOperation({ summary: 'List staff members with filters and pagination' }),
    ApiResponse({ status: 200, description: 'Paginated staff list' }),
    __param(0, Query(new ZodValidationPipe(queryStaffSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "findAll", null);
__decorate([
    Get('designations'),
    ApiOperation({ summary: 'List active staff designations' }),
    ApiResponse({ status: 200, description: 'Designations list' }),
    __param(0, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getDesignations", null);
__decorate([
    Post('designations'),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN'),
    ApiOperation({ summary: 'Create a custom staff designation' }),
    ApiResponse({ status: 201, description: 'Designation created' }),
    __param(0, Body(new ZodValidationPipe(createStaffDesignationSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "createDesignation", null);
__decorate([
    Get(':id'),
    ApiOperation({ summary: 'Get details of a staff member' }),
    ApiResponse({ status: 200, description: 'Staff details' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "findOne", null);
__decorate([
    Patch(':id'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Update a staff member' }),
    ApiResponse({ status: 200, description: 'Staff updated' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updateStaffSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "update", null);
__decorate([
    Delete(':id'),
    RequireOrgRoles('OWNER', 'ADMIN'),
    ApiOperation({ summary: 'Deactivate a staff member' }),
    ApiResponse({ status: 200, description: 'Staff deactivated' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "deactivate", null);
StaffController = __decorate([
    ApiTags('Staff'),
    Controller('staff'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [StaffService])
], StaffController);
export { StaffController };
//# sourceMappingURL=staff.controller.js.map