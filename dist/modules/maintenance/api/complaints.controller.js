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
import { ComplaintsService } from '../application/complaints.service.js';
import { createComplaintSchema, updateComplaintStatusSchema, assignComplaintSchema, addCommentSchema, createComplaintCategorySchema, queryComplaintsSchema, } from './dto/complaint.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, CurrentUserId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let ComplaintsController = class ComplaintsController {
    complaintsService;
    constructor(complaintsService) {
        this.complaintsService = complaintsService;
    }
    async create(dto, orgId, userId) {
        return this.complaintsService.create(dto, orgId, userId);
    }
    async findAll(query, orgId) {
        return this.complaintsService.findAll(orgId, query);
    }
    async getCategories(orgId) {
        return this.complaintsService.getCategories(orgId);
    }
    async createCategory(dto, orgId) {
        return this.complaintsService.createCategory(dto, orgId);
    }
    async findOne(id, orgId) {
        return this.complaintsService.findById(id, orgId);
    }
    async updateStatus(id, dto, orgId, userId) {
        return this.complaintsService.updateStatus(id, dto, orgId, userId);
    }
    async assign(id, dto, orgId, userId) {
        return this.complaintsService.assign(id, dto, orgId, userId);
    }
    async addComment(id, dto, orgId, userId) {
        return this.complaintsService.addComment(id, dto, orgId, userId);
    }
};
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    ApiOperation({ summary: 'Log a new complaint / maintenance request' }),
    ApiResponse({ status: 201, description: 'Complaint created' }),
    __param(0, Body(new ZodValidationPipe(createComplaintSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ComplaintsController.prototype, "create", null);
__decorate([
    Get(),
    ApiOperation({ summary: 'List complaints with filters and pagination' }),
    ApiResponse({ status: 200, description: 'Paginated complaints' }),
    __param(0, Query(new ZodValidationPipe(queryComplaintsSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ComplaintsController.prototype, "findAll", null);
__decorate([
    Get('categories'),
    ApiOperation({ summary: 'List active complaint categories' }),
    ApiResponse({ status: 200, description: 'Categories list' }),
    __param(0, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ComplaintsController.prototype, "getCategories", null);
__decorate([
    Post('categories'),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN'),
    ApiOperation({ summary: 'Add a custom complaint category' }),
    ApiResponse({ status: 201, description: 'Category created' }),
    __param(0, Body(new ZodValidationPipe(createComplaintCategorySchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ComplaintsController.prototype, "createCategory", null);
__decorate([
    Get(':id'),
    ApiOperation({
        summary: 'Get complaint details with full comments and transition history',
    }),
    ApiResponse({ status: 200, description: 'Complaint details' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ComplaintsController.prototype, "findOne", null);
__decorate([
    Patch(':id/status'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF'),
    ApiOperation({
        summary: 'Transition complaint status with state machine verification',
    }),
    ApiResponse({ status: 200, description: 'Status updated' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updateComplaintStatusSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], ComplaintsController.prototype, "updateStatus", null);
__decorate([
    Post(':id/assign'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Assign staff member to the complaint' }),
    ApiResponse({ status: 200, description: 'Staff assigned' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(assignComplaintSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], ComplaintsController.prototype, "assign", null);
__decorate([
    Post(':id/comments'),
    HttpCode(HttpStatus.CREATED),
    ApiOperation({ summary: 'Add a discussion comment to a complaint' }),
    ApiResponse({ status: 201, description: 'Comment added' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(addCommentSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], ComplaintsController.prototype, "addComment", null);
ComplaintsController = __decorate([
    ApiTags('Complaints & Maintenance'),
    Controller('complaints'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [ComplaintsService])
], ComplaintsController);
export { ComplaintsController };
//# sourceMappingURL=complaints.controller.js.map