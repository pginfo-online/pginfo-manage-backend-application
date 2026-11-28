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
import { Controller, Post, Get, Body, Query, Param, ParseUUIDPipe, UseGuards, HttpCode, HttpStatus, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, } from '@nestjs/swagger';
import { PayoutsService } from '../application/payouts.service.js';
import { onboardOwnerSchema, queryPayoutAccountsSchema, } from './dto/payout.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, CurrentUserId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let PayoutsController = class PayoutsController {
    payoutsService;
    constructor(payoutsService) {
        this.payoutsService = payoutsService;
    }
    async onboardOwner(dto, orgId, userId) {
        return this.payoutsService.onboardOwner(dto, orgId, userId);
    }
    refreshVerification(id, orgId) {
        return this.payoutsService.refreshVerification(id, orgId);
    }
    async listAccounts(query, orgId) {
        return this.payoutsService.queryPayoutAccounts(query, orgId);
    }
    async getActiveAccount(propertyId, orgId) {
        return this.payoutsService.getActivePayoutAccount(orgId, propertyId);
    }
};
__decorate([
    Post('onboard-owner'),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN'),
    ApiOperation({
        summary: 'Submit owner bank details for manual payout review',
    }),
    ApiResponse({ status: 201, description: 'Bank details saved for review' }),
    __param(0, Body(new ZodValidationPipe(onboardOwnerSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PayoutsController.prototype, "onboardOwner", null);
__decorate([
    Post('accounts/:id/refresh'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN'),
    __param(0, Param('id', ParseUUIDPipe)),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PayoutsController.prototype, "refreshVerification", null);
__decorate([
    Get('accounts'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({
        summary: 'List landlord payout accounts for this organization',
    }),
    __param(0, Query(new ZodValidationPipe(queryPayoutAccountsSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PayoutsController.prototype, "listAccounts", null);
__decorate([
    Get('accounts/active'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Get active landlord payout account' }),
    __param(0, Query('propertyId')),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PayoutsController.prototype, "getActiveAccount", null);
PayoutsController = __decorate([
    ApiTags('Finance: Landlord Payout Accounts'),
    Controller('payouts'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [PayoutsService])
], PayoutsController);
export { PayoutsController };
//# sourceMappingURL=payouts.controller.js.map