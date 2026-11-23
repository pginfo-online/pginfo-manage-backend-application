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
import { LeadsService } from '../application/leads.service.js';
import { createLeadSchema, updateLeadSchema, queryLeadsSchema, leadStatsQuerySchema, } from './dto/lead.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let LeadsController = class LeadsController {
    leadsService;
    constructor(leadsService) {
        this.leadsService = leadsService;
    }
    async create(dto, orgId) {
        return this.leadsService.create(dto, orgId);
    }
    async findAll(query, orgId) {
        return this.leadsService.findAll(orgId, query);
    }
    async stats(query, orgId) {
        return this.leadsService.stats(orgId, query.propertyId);
    }
    async findOne(id, orgId) {
        return this.leadsService.findById(id, orgId);
    }
    async update(id, dto, orgId) {
        return this.leadsService.update(id, dto, orgId);
    }
    async delete(id, orgId) {
        return this.leadsService.delete(id, orgId);
    }
};
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Create a new prospective tenant lead' }),
    ApiResponse({ status: 201, description: 'Lead created successfully' }),
    __param(0, Body(new ZodValidationPipe(createLeadSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "create", null);
__decorate([
    Get(),
    ApiOperation({ summary: 'List leads with filters and pagination' }),
    ApiResponse({ status: 200, description: 'Paginated list of leads' }),
    __param(0, Query(new ZodValidationPipe(queryLeadsSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "findAll", null);
__decorate([
    Get('stats'),
    ApiOperation({ summary: 'Get lead pipeline statistics' }),
    __param(0, Query(new ZodValidationPipe(leadStatsQuerySchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "stats", null);
__decorate([
    Get(':id'),
    ApiOperation({ summary: 'Get details of a specific lead' }),
    ApiResponse({ status: 200, description: 'Lead details' }),
    ApiResponse({ status: 404, description: 'Lead not found' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "findOne", null);
__decorate([
    Patch(':id'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Update lead status or details' }),
    ApiResponse({ status: 200, description: 'Lead updated' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updateLeadSchema))),
    __param(2, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "update", null);
__decorate([
    Delete(':id'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Delete a lead' }),
    ApiResponse({ status: 200, description: 'Lead deleted' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "delete", null);
LeadsController = __decorate([
    ApiTags('CRM: Leads Pipeline'),
    Controller('leads'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [LeadsService])
], LeadsController);
export { LeadsController };
//# sourceMappingURL=leads.controller.js.map