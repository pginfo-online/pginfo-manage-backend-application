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
      'Authoritative Razorpay webhook handler for Autopay mandates, charges, refunds, and failures',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({
    status: 400,
    description: 'Missing signature header or invalid body',
  })
  @ApiResponse({ status: 401, description: 'Invalid HMAC signature' })
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: Request,
    @Headers('x-razorpay-event-id') eventId?: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing x-razorpay-signature header');
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) throw new BadRequestException('Missing raw webhook body');

    return this.razorpayWebhookService.handleWebhook(
      rawBody,
      signature,
      eventId,
    );
  }
}
