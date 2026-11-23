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
import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, } from '@nestjs/swagger';
import { OrganizationsService } from '../application/organizations.service.js';
import { createOrganizationSchema, addMemberSchema, updateMemberRoleSchema, } from './dto/organization.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentUserId, } from '../../../platform/authentication/index.js';
let OrganizationsController = class OrganizationsController {
    orgService;
    constructor(orgService) {
        this.orgService = orgService;
    }
    async create(dto, userId) {
        return this.orgService.create(dto, userId);
    }
    async findAll(userId) {
        return this.orgService.findAllForUser(userId);
    }
    async findOne(id, userId) {
        return this.orgService.findById(id, userId);
    }
    async switchOrg(id, userId) {
        return this.orgService.switchOrganization(id, userId);
    }
    async getMembers(id, userId) {
        return this.orgService.getMembers(id, userId);
    }
    async addMember(id, dto, userId) {
        return this.orgService.addMember(id, dto, userId);
    }
    async updateMemberRole(id, memberId, dto, userId) {
        return this.orgService.updateMemberRole(id, memberId, dto, userId);
    }
    async removeMember(id, memberId, userId) {
        return this.orgService.removeMember(id, memberId, userId);
    }
};
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    ApiOperation({ summary: 'Create a new property management organization' }),
    ApiResponse({
        status: 201,
        description: 'Organization created successfully',
    }),
    __param(0, Body(new ZodValidationPipe(createOrganizationSchema))),
    __param(1, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "create", null);
__decorate([
    Get(),
    ApiOperation({ summary: 'List all organizations the user belongs to' }),
    ApiResponse({ status: 200, description: 'List of organizations' }),
    __param(0, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "findAll", null);
__decorate([
    Get(':id'),
    ApiOperation({ summary: 'Get details of a specific organization' }),
    ApiResponse({ status: 200, description: 'Organization details' }),
    ApiResponse({ status: 404, description: 'Organization not found' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "findOne", null);
__decorate([
    Post(':id/switch'),
    HttpCode(HttpStatus.OK),
    ApiOperation({
        summary: 'Switch active organization context and receive a scoped JWT access token',
    }),
    ApiResponse({ status: 200, description: 'Context switched with new JWT' }),
    ApiResponse({ status: 403, description: 'User does not belong to this org' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "switchOrg", null);
__decorate([
    Get(':id/members'),
    ApiOperation({ summary: 'List all members of an organization' }),
    ApiResponse({ status: 200, description: 'List of members' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "getMembers", null);
__decorate([
    Post(':id/members'),
    HttpCode(HttpStatus.CREATED),
    ApiOperation({ summary: 'Add a registered user to the organization' }),
    ApiResponse({ status: 201, description: 'Member added' }),
    ApiResponse({ status: 403, description: 'Insufficient permissions' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(addMemberSchema))),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "addMember", null);
__decorate([
    Patch(':id/members/:memberId'),
    ApiOperation({ summary: "Update an organization member's role" }),
    ApiResponse({ status: 200, description: 'Role updated' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Param('memberId', new ParseUUIDPipe())),
    __param(2, Body(new ZodValidationPipe(updateMemberRoleSchema))),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "updateMemberRole", null);
__decorate([
    Delete(':id/members/:memberId'),
    ApiOperation({ summary: 'Remove a member from the organization' }),
    ApiResponse({ status: 200, description: 'Member removed' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Param('memberId', new ParseUUIDPipe())),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "removeMember", null);
OrganizationsController = __decorate([
    ApiTags('Organizations'),
    Controller('organizations'),
    UseGuards(JwtAuthGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [OrganizationsService])
], OrganizationsController);
export { OrganizationsController };
//# sourceMappingURL=organizations.controller.js.map