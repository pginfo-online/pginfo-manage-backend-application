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
import { Controller, Post, Headers, Req, HttpCode, HttpStatus, BadRequestException, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RazorpayWebhookService } from '../../modules/finance/application/razorpay-webhook.service.js';
let RazorpayWebhookController = class RazorpayWebhookController {
    razorpayWebhookService;
    constructor(razorpayWebhookService) {
        this.razorpayWebhookService = razorpayWebhookService;
    }
    async handleWebhook(signature, req, eventId) {
        if (!signature) {
            throw new BadRequestException('Missing x-razorpay-signature header');
        }
        const rawBody = req.rawBody;
        if (!rawBody)
            throw new BadRequestException('Missing raw webhook body');
        return this.razorpayWebhookService.handleWebhook(rawBody, signature, eventId);
    }
};
__decorate([
    Post('razorpay'),
    HttpCode(HttpStatus.OK),
    ApiOperation({
        summary: 'Authoritative Razorpay webhook handler for Autopay mandates, charges, refunds, and failures',
    }),
    ApiResponse({ status: 200, description: 'Webhook processed' }),
    ApiResponse({
        status: 400,
        description: 'Missing signature header or invalid body',
    }),
    ApiResponse({ status: 401, description: 'Invalid HMAC signature' }),
    __param(0, Headers('x-razorpay-signature')),
    __param(1, Req()),
    __param(2, Headers('x-razorpay-event-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], RazorpayWebhookController.prototype, "handleWebhook", null);
RazorpayWebhookController = __decorate([
    ApiTags('Webhooks'),
    Controller('webhooks'),
    __metadata("design:paramtypes", [RazorpayWebhookService])
], RazorpayWebhookController);
export { RazorpayWebhookController };
//# sourceMappingURL=razorpay.controller.js.map