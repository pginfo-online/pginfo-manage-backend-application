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
import { TemplatesService } from '../application/templates.service.js';
import { createAgreementTemplateSchema, updateAgreementTemplateSchema, } from './dto/template.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let TemplatesController = class TemplatesController {
    templatesService;
    constructor(templatesService) {
        this.templatesService = templatesService;
    }
    async create(dto, orgId) {
        return this.templatesService.create(dto, orgId);
    }
    async findAll(propertyId, orgId) {
        return this.templatesService.findAll(orgId, propertyId);
    }
    async findOne(id, orgId) {
        return this.templatesService.findById(id, orgId);
    }
    async update(id, dto, orgId) {
        return this.templatesService.update(id, dto, orgId);
    }
    async delete(id, orgId) {
        return this.templatesService.delete(id, orgId);
    }
    async render(id, residentId, orgId) {
        return this.templatesService.render(id, residentId, orgId);
    }
};
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN'),
    ApiOperation({ summary: 'Create a rental agreement template' }),
    ApiResponse({ status: 201, description: 'Template created' }),
    __param(0, Body(new ZodValidationPipe(createAgreementTemplateSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "create", null);
__decorate([
    Get(),
    ApiOperation({ summary: 'List agreement templates' }),
    ApiResponse({ status: 200, description: 'List of templates' }),
    __param(0, Query('propertyId')),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "findAll", null);
__decorate([
    Get(':id'),
    ApiOperation({ summary: 'Get a template by ID' }),
    ApiResponse({ status: 200, description: 'Template details' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "findOne", null);
__decorate([
    Patch(':id'),
    RequireOrgRoles('OWNER', 'ADMIN'),
    ApiOperation({ summary: 'Update an agreement template' }),
    ApiResponse({ status: 200, description: 'Template updated' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updateAgreementTemplateSchema))),
    __param(2, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "update", null);
__decorate([
    Delete(':id'),
    RequireOrgRoles('OWNER', 'ADMIN'),
    ApiOperation({ summary: 'Archive a template' }),
    ApiResponse({ status: 200, description: 'Template archived' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "delete", null);
__decorate([
    Post(':id/render/:residentId'),
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Render an agreement template for a resident' }),
    ApiResponse({ status: 200, description: 'Rendered agreement document' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Param('residentId', new ParseUUIDPipe())),
    __param(2, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "render", null);
TemplatesController = __decorate([
    ApiTags('Operations: Agreement Templates'),
    Controller('templates'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [TemplatesService])
], TemplatesController);
export { TemplatesController };
//# sourceMappingURL=templates.controller.js.map