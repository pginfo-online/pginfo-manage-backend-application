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
import { MandatesService } from '../application/mandates.service.js';
import { createMandateSchema, queryMandatesSchema, } from './dto/mandate.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, CurrentUserId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let MandatesController = class MandatesController {
    mandatesService;
    constructor(mandatesService) {
        this.mandatesService = mandatesService;
    }
    async createMandate(dto, orgId, userId) {
        return this.mandatesService.createMandate(dto, orgId, userId);
    }
    async listMandates(query, orgId) {
        return this.mandatesService.queryMandates(query, orgId);
    }
    async getMandate(id, orgId) {
        return this.mandatesService.getMandate(id, orgId);
    }
    async resendInvite(id, orgId, userId) {
        return this.mandatesService.resendInvite(id, orgId, userId);
    }
    async cancelMandate(id, orgId, userId) {
        return this.mandatesService.cancelMandate(id, orgId, userId);
    }
};
__decorate([
    Post('create'),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({
        summary: 'Generate an automated rent collection mandate (UPI AutoPay & e-Mandate)',
        description: 'Creates a recurring plan and subscription in Razorpay, returns authorization short_url and triggers WhatsApp notification payload.',
    }),
    ApiResponse({
        status: 201,
        description: 'Mandate successfully generated and tenant notified',
    }),
    ApiResponse({ status: 400, description: 'Invalid input or tenant status' }),
    ApiResponse({ status: 404, description: 'Tenant or Unit not found' }),
    ApiResponse({
        status: 409,
        description: 'Tenant already has an active mandate',
    }),
    __param(0, Body(new ZodValidationPipe(createMandateSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], MandatesController.prototype, "createMandate", null);
__decorate([
    Get(),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'),
    ApiOperation({
        summary: 'List tenant autopay mandates with filters and pagination',
    }),
    __param(0, Query(new ZodValidationPipe(queryMandatesSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MandatesController.prototype, "listMandates", null);
__decorate([
    Get(':id'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'),
    ApiOperation({ summary: 'Get mandate details by ID' }),
    __param(0, Param('id', ParseUUIDPipe)),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MandatesController.prototype, "getMandate", null);
__decorate([
    Post(':id/resend-invite'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({
        summary: 'Resend WhatsApp authorization for an existing pending mandate',
    }),
    __param(0, Param('id', ParseUUIDPipe)),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MandatesController.prototype, "resendInvite", null);
__decorate([
    Post(':id/cancel'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Cancel/Revoke tenant autopay mandate' }),
    __param(0, Param('id', ParseUUIDPipe)),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MandatesController.prototype, "cancelMandate", null);
MandatesController = __decorate([
    ApiTags('Finance: Rent Mandates & Autopay'),
    Controller('rent/mandates'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [MandatesService])
], MandatesController);
export { MandatesController };
//# sourceMappingURL=mandates.controller.js.map