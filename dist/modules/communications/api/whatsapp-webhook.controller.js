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
import { Controller, Get, Headers, HttpCode, Post, Query, Req, UnauthorizedException, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { PrismaService } from '../../../platform/database/index.js';
const delivery = z.object({
    id: z.string().min(1).max(255),
    status: z.enum(['sent', 'delivered', 'read', 'failed']),
    timestamp: z.string().regex(/^\d{1,10}$/),
    errors: z
        .array(z.object({ code: z.number().int().max(2147483647).min(0) }))
        .optional(),
});
const envelope = z.object({
    object: z.literal('whatsapp_business_account'),
    entry: z.array(z.object({
        changes: z.array(z.object({
            field: z.string(),
            value: z.object({
                metadata: z.object({ phone_number_id: z.string() }).optional(),
                statuses: z.array(z.unknown()).optional(),
            }),
        })),
    })),
});
function sameValue(left, right) {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
}
let WhatsAppWebhookController = class WhatsAppWebhookController {
    config;
    prisma;
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
    }
    verify(mode, token, challenge) {
        const expected = this.config.get('META_WHATSAPP_VERIFY_TOKEN');
        if (!expected ||
            mode !== 'subscribe' ||
            typeof token !== 'string' ||
            typeof challenge !== 'string' ||
            !sameValue(token, expected)) {
            throw new UnauthorizedException('WhatsApp callback verification failed');
        }
        return challenge;
    }
    async receive(signature, request) {
        const secret = this.config.get('META_WHATSAPP_APP_SECRET');
        const phoneId = this.config.get('META_WHATSAPP_PHONE_NUMBER_ID');
        if (!secret ||
            !phoneId ||
            !request.rawBody ||
            typeof signature !== 'string') {
            throw new UnauthorizedException('WhatsApp callback signature is required');
        }
        const digest = createHmac('sha256', secret)
            .update(request.rawBody)
            .digest('hex');
        if (!sameValue(signature, 'sha256=' + digest)) {
            throw new UnauthorizedException('Invalid WhatsApp callback signature');
        }
        const payload = envelope.safeParse(request.body);
        if (!payload.success)
            return { received: true };
        for (const entry of payload.data.entry) {
            for (const change of entry.changes) {
                if (change.field !== 'messages' ||
                    change.value.metadata?.phone_number_id !== phoneId)
                    continue;
                for (const status of change.value.statuses ?? []) {
                    const parsed = delivery.safeParse(status);
                    if (!parsed.success)
                        continue;
                    const value = parsed.data;
                    const statusAt = new Date(Number(value.timestamp) * 1000);
                    await this.prisma.$executeRaw `
            INSERT INTO whatsapp_deliveries (message_id, status, status_at, failure_code)
            VALUES (${value.id}, ${value.status}, ${statusAt},
              ${value.status === 'failed' ? (value.errors?.[0]?.code ?? null) : null})
            ON CONFLICT (message_id) DO UPDATE SET
              status = EXCLUDED.status, status_at = EXCLUDED.status_at,
              failure_code = EXCLUDED.failure_code
            WHERE (CASE EXCLUDED.status WHEN 'read' THEN 4 WHEN 'delivered' THEN 3 WHEN 'failed' THEN 2 ELSE 1 END)
              > (CASE whatsapp_deliveries.status WHEN 'read' THEN 4 WHEN 'delivered' THEN 3 WHEN 'failed' THEN 2 ELSE 1 END)
          `;
                }
            }
        }
        return { received: true };
    }
};
__decorate([
    Get(),
    __param(0, Query('hub.mode')),
    __param(1, Query('hub.verify_token')),
    __param(2, Query('hub.challenge')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], WhatsAppWebhookController.prototype, "verify", null);
__decorate([
    Post(),
    HttpCode(200),
    __param(0, Headers('x-hub-signature-256')),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WhatsAppWebhookController.prototype, "receive", null);
WhatsAppWebhookController = __decorate([
    Controller('webhooks/whatsapp'),
    __metadata("design:paramtypes", [ConfigService,
        PrismaService])
], WhatsAppWebhookController);
export { WhatsAppWebhookController };
//# sourceMappingURL=whatsapp-webhook.controller.js.map