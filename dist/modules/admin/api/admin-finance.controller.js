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
import { Body, Controller, Get, Header, HttpCode, Post, Param, ParseUUIDPipe, Patch, Query, Req, UseGuards, } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../platform/authentication/index.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { CurrentPlatformAdmin, PlatformAdminGuard, RequirePlatformPermissions, } from '../authorization/admin-authorization.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import { PaymentsService } from '../../finance/application/payments.service.js';
import { AdminCollectionsService } from '../application/admin-collections.service.js';
import { AdminCommandService } from '../application/admin-command.service.js';
import { adminPaymentsQuerySchema, adminPayoutsQuerySchema, adminPendingQuerySchema, reviewPayoutSchema, reconcileSettlementSchema, applyDisputedCaptureSchema, recordManualPayoutSchema, prepareManualPayoutSchema, } from './dto/admin.dto.js';
import { adminRequestMetadata } from './admin-request.js';
let AdminFinanceController = class AdminFinanceController {
    queryService;
    commands;
    collections;
    paymentsService;
    constructor(queryService, commands, collections, paymentsService) {
        this.queryService = queryService;
        this.commands = commands;
        this.collections = collections;
        this.paymentsService = paymentsService;
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
    onlineCollections(query, actor) {
        return this.collections.list(query, actor);
    }
    collectionPayoutAccounts(id) {
        return this.collections.eligibleAccounts(id);
    }
    reconcileCollection(id, dto, actor, request) {
        return this.collections.reconcile(id, dto.settledOn, actor, adminRequestMetadata(request));
    }
    async applyToDues(id, dto, actor) {
        const payment = await this.paymentsService.applyDisputedCapture(id, actor.userId, dto.reason);
        return { id: payment.id, status: payment.status };
    }
    prepareManualPayout(id, dto, actor, request) {
        return this.collections.preparePayout(id, dto, actor, adminRequestMetadata(request));
    }
    releaseManualPayout(id, actor, request) {
        return this.collections.releasePayout(id, actor, adminRequestMetadata(request));
    }
    recordManualPayout(id, dto, actor, request) {
        return this.collections.recordPayout(id, dto, actor, adminRequestMetadata(request));
    }
    revealBankDetails(id, actor, request) {
        return this.collections.reveal(id, actor, adminRequestMetadata(request));
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
    Get('collections'),
    RequirePlatformPermissions('finance.read'),
    __param(0, Query(new ZodValidationPipe(adminPaymentsQuerySchema))),
    __param(1, CurrentPlatformAdmin()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "onlineCollections", null);
__decorate([
    Get('collections/:id/payout-accounts'),
    RequirePlatformPermissions('finance.review'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "collectionPayoutAccounts", null);
__decorate([
    Post('collections/:id/settlement'),
    HttpCode(200),
    RequirePlatformPermissions('finance.review'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(reconcileSettlementSchema))),
    __param(2, CurrentPlatformAdmin()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "reconcileCollection", null);
__decorate([
    Post('collections/:id/apply-to-dues'),
    HttpCode(200),
    RequirePlatformPermissions('finance.review'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(applyDisputedCaptureSchema))),
    __param(2, CurrentPlatformAdmin()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminFinanceController.prototype, "applyToDues", null);
__decorate([
    Post('collections/:id/payout/prepare'),
    RequirePlatformPermissions('finance.review'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(prepareManualPayoutSchema))),
    __param(2, CurrentPlatformAdmin()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "prepareManualPayout", null);
__decorate([
    Post('collections/:id/payout/release'),
    HttpCode(200),
    RequirePlatformPermissions('finance.review'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentPlatformAdmin()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "releaseManualPayout", null);
__decorate([
    Post('collections/:id/payout'),
    RequirePlatformPermissions('finance.review'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(recordManualPayoutSchema))),
    __param(2, CurrentPlatformAdmin()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "recordManualPayout", null);
__decorate([
    Post('payout-accounts/:id/bank-details'),
    HttpCode(200),
    Header('Cache-Control', 'no-store'),
    RequirePlatformPermissions('banks.review'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentPlatformAdmin()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceController.prototype, "revealBankDetails", null);
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
        AdminCommandService,
        AdminCollectionsService,
        PaymentsService])
], AdminFinanceController);
export { AdminFinanceController };
//# sourceMappingURL=admin-finance.controller.js.map