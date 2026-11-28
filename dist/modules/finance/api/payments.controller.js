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
import { PaymentsService } from '../application/payments.service.js';
import { recordPaymentSchema, createRazorpayOrderSchema, verifyRazorpayPaymentSchema, queryPaymentsSchema, } from './dto/payment.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, CurrentUserId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let PaymentsController = class PaymentsController {
    paymentsService;
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    async recordPayment(dto, orgId, userId) {
        return this.paymentsService.recordPayment(dto, orgId, userId);
    }
    async createRazorpayOrder(dto, orgId, userId) {
        return this.paymentsService.createRazorpayOrder(dto, orgId, userId);
    }
    async verifyRazorpayPayment(dto, orgId, userId) {
        return this.paymentsService.verifyRazorpayPayment(dto, orgId, userId);
    }
    async findAll(query, orgId) {
        return this.paymentsService.findAll(orgId, query);
    }
    async getReceipt(id, orgId) {
        return this.paymentsService.getReceipt(id, orgId);
    }
};
__decorate([
    Post('record'),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF'),
    ApiOperation({
        summary: 'Record manual/offline payment (Cash, UPI, Cheque, Bank Transfer)',
    }),
    ApiResponse({ status: 201, description: 'Payment recorded and allocated' }),
    __param(0, Body(new ZodValidationPipe(recordPaymentSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "recordPayment", null);
__decorate([
    Post('razorpay/order'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF'),
    HttpCode(HttpStatus.CREATED),
    ApiOperation({ summary: 'Create a server-side Razorpay payment order' }),
    ApiResponse({ status: 201, description: 'Order created' }),
    __param(0, Body(new ZodValidationPipe(createRazorpayOrderSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "createRazorpayOrder", null);
__decorate([
    Post('razorpay/verify'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF'),
    HttpCode(HttpStatus.OK),
    ApiOperation({
        summary: 'Cryptographically verify Razorpay payment HMAC signature and confirm payment',
    }),
    ApiResponse({ status: 200, description: 'Payment verified and confirmed' }),
    ApiResponse({ status: 401, description: 'Signature verification failed' }),
    __param(0, Body(new ZodValidationPipe(verifyRazorpayPaymentSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "verifyRazorpayPayment", null);
__decorate([
    Get(),
    ApiOperation({ summary: 'List payments with filters and pagination' }),
    ApiResponse({ status: 200, description: 'Paginated payments list' }),
    __param(0, Query(new ZodValidationPipe(queryPaymentsSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "findAll", null);
__decorate([
    Get(':id/receipt'),
    ApiOperation({ summary: 'Download or view official payment receipt' }),
    ApiResponse({ status: 200, description: 'Payment receipt data' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getReceipt", null);
PaymentsController = __decorate([
    ApiTags('Finance: Payments & Collections'),
    Controller('payments'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [PaymentsService])
], PaymentsController);
export { PaymentsController };
//# sourceMappingURL=payments.controller.js.map