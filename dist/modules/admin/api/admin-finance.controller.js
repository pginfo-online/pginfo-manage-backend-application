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
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../platform/authentication/index.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { CurrentPlatformAdmin, PlatformAdminGuard, RequirePlatformPermissions, } from '../authorization/admin-authorization.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import { AdminCommandService } from '../application/admin-command.service.js';
import { adminPaymentsQuerySchema, adminPayoutsQuerySchema, adminPendingQuerySchema, reviewPayoutSchema, } from './dto/admin.dto.js';
import { adminRequestMetadata } from './admin-request.js';
let AdminFinanceController = class AdminFinanceController {
    queryService;
    commands;
    constructor(queryService, commands) {
        this.queryService = queryService;
        this.commands = commands;
    }
    payments(query) {
        return this.queryService.payments(query);
    }
    payment(id) {
        return this.queryService.payment(id);
    }
    ledger(query) {
        return this.queryService.ledger(query);
    }
    pending(query) {
        return this.queryService.pendingTransactions(query.organizationId);
    }
    payoutAccounts(query) {
        return this.queryService.payouts(query);
    }
    reviewPayout(id, dto, actor, request) {
        return this.commands.reviewPayout(id, dto, actor, adminRequestMetadata(request));
    }
};
__decorate([
    Get('payments'),
    RequirePlatformPermissions('finance.read'),
    __param(0, Query(new ZodValidationPipe(adminPaymentsQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "payments", null);
__decorate([
    Get('payments/:id'),
    RequirePlatformPermissions('finance.read'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "payment", null);
__decorate([
    Get('ledger'),
    RequirePlatformPermissions('finance.read'),
    ApiOperation({ summary: 'Platform-fee and owner-transfer ledger' }),
    __param(0, Query(new ZodValidationPipe(adminPaymentsQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "ledger", null);
__decorate([
    Get('pending'),
    RequirePlatformPermissions('finance.read'),
    ApiOperation({ summary: 'Pending and disputed financial work queue' }),
    __param(0, Query(new ZodValidationPipe(adminPendingQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "pending", null);
__decorate([
    Get('payout-accounts'),
    RequirePlatformPermissions('banks.read'),
    __param(0, Query(new ZodValidationPipe(adminPayoutsQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "payoutAccounts", null);
__decorate([
    Patch('payout-accounts/:id/review'),
    RequirePlatformPermissions('banks.review'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(reviewPayoutSchema))),
    __param(2, CurrentPlatformAdmin()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "reviewPayout", null);
AdminFinanceController = __decorate([
    ApiTags('Platform Admin: Finance and Banks'),
    ApiBearerAuth('JWT'),
    Controller('admin/finance'),
    UseGuards(JwtAuthGuard, PlatformAdminGuard),
    __metadata("design:paramtypes", [AdminQueryService,
        AdminCommandService])
], AdminFinanceController);
export { AdminFinanceController };
//# sourceMappingURL=admin-finance.controller.js.map