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
import { BillingService } from '../application/billing.service.js';
import { createChargeSchema, discountSchema, generateMonthlyDuesSchema, queryBillingSchema, } from './dto/billing.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, CurrentUserId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let BillingController = class BillingController {
    billingService;
    constructor(billingService) {
        this.billingService = billingService;
    }
    async generateMonthlyDues(dto, orgId, userId) {
        return this.billingService.generateMonthlyDues(dto, orgId, userId);
    }
    async createCharge(dto, orgId, userId) {
        return this.billingService.createCharge(dto, orgId, userId);
    }
    async findAll(query, orgId) {
        return this.billingService.findAll(orgId, query);
    }
    async findOne(id, orgId) {
        return this.billingService.findById(id, orgId);
    }
    async discount(id, dto, orgId, userId) {
        return this.billingService.discount(id, dto, orgId, userId);
    }
    async cancel(id, orgId, userId, reason) {
        return this.billingService.cancelBill(id, orgId, userId, reason);
    }
};
__decorate([
    Post('generate-monthly-dues'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({
        summary: 'Generate monthly rent dues for active residents (idempotent, safe to rerun)',
    }),
    ApiResponse({ status: 200, description: 'Monthly dues generated' }),
    __param(0, Body(new ZodValidationPipe(generateMonthlyDuesSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "generateMonthlyDues", null);
__decorate([
    Post('charges'),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({
        summary: 'Create an ad-hoc charge (Electricity, Water, Maintenance, Penalty, etc.)',
    }),
    ApiResponse({ status: 201, description: 'Charge created' }),
    __param(0, Body(new ZodValidationPipe(createChargeSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createCharge", null);
__decorate([
    Get('records'),
    ApiOperation({ summary: 'List billing records with filters and pagination' }),
    ApiResponse({ status: 200, description: 'Paginated billing records' }),
    __param(0, Query(new ZodValidationPipe(queryBillingSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "findAll", null);
__decorate([
    Get('records/:id'),
    ApiOperation({ summary: 'Get details of a specific billing record' }),
    ApiResponse({ status: 200, description: 'Billing record details' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "findOne", null);
__decorate([
    Post('records/:id/discount'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(discountSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "discount", null);
__decorate([
    Post('records/:id/cancel'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN'),
    ApiOperation({ summary: 'Cancel an unpaid billing record' }),
    ApiResponse({ status: 200, description: 'Billing record cancelled' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __param(3, Body('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "cancel", null);
BillingController = __decorate([
    ApiTags('Finance: Billing & Dues'),
    Controller('billing'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [BillingService])
], BillingController);
export { BillingController };
//# sourceMappingURL=billing.controller.js.map