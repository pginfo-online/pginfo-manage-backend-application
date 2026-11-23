import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { z } from 'zod';
import { PrismaService } from '../../../platform/database/index.js';
import type { EnvConfig } from '../../../config/index.js';

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
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          field: z.string(),
          value: z.object({
            metadata: z.object({ phone_number_id: z.string() }).optional(),
            statuses: z.array(z.unknown()).optional(),
          }),
        }),
      ),
    }),
  ),
});

function sameValue(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const expected = this.config.get('META_WHATSAPP_VERIFY_TOKEN');
    if (
      !expected ||
      mode !== 'subscribe' ||
      typeof token !== 'string' ||
      typeof challenge !== 'string' ||
      !sameValue(token, expected)
    ) {
      throw new UnauthorizedException('WhatsApp callback verification failed');
    }
    return challenge;
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Headers('x-hub-signature-256') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    const secret = this.config.get('META_WHATSAPP_APP_SECRET');
    const phoneId = this.config.get('META_WHATSAPP_PHONE_NUMBER_ID');
    if (
      !secret ||
      !phoneId ||
      !request.rawBody ||
      typeof signature !== 'string'
    ) {
      throw new UnauthorizedException(
        'WhatsApp callback signature is required',
      );
    }
    const digest = createHmac('sha256', secret)
      .update(request.rawBody)
      .digest('hex');
    if (!sameValue(signature, 'sha256=' + digest)) {
      throw new UnauthorizedException('Invalid WhatsApp callback signature');
    }
    const payload = envelope.safeParse(request.body);
    if (!payload.success) return { received: true };
    for (const entry of payload.data.entry) {
      for (const change of entry.changes) {
        if (
          change.field !== 'messages' ||
          change.value.metadata?.phone_number_id !== phoneId
        )
          continue;
        for (const status of change.value.statuses ?? []) {
          const parsed = delivery.safeParse(status);
          if (!parsed.success) continue;
          const value = parsed.data;
          const statusAt = new Date(Number(value.timestamp) * 1000);
          await this.prisma.$executeRaw`
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
}
