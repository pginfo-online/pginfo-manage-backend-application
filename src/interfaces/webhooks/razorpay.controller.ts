import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { RazorpayWebhookService } from '../../modules/finance/application/razorpay-webhook.service.js';

@ApiTags('Webhooks')
@Controller('webhooks')
export class RazorpayWebhookController {
  constructor(
    private readonly razorpayWebhookService: RazorpayWebhookService,
  ) {}

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Authoritative Razorpay webhook handler for Autopay mandates, charges, splits, and failures',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 400, description: 'Missing signature header or invalid body' })
  @ApiResponse({ status: 401, description: 'Invalid HMAC signature' })
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: Request,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing x-razorpay-signature header');
    }

    // Prefer raw unparsed bytes from NestJS rawBody for strict cryptographic verification
    const rawBodyBuffer = (req as unknown as { rawBody?: Buffer }).rawBody;
    const rawBody = rawBodyBuffer
      ? rawBodyBuffer.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body);

    return this.razorpayWebhookService.handleWebhook(rawBody, signature);
  }
}
