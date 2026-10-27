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
import { PaymentsService } from '../../modules/finance/application/payments.service.js';

@ApiTags('Webhooks')
@Controller('webhooks')
export class RazorpayWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Authoritative Razorpay webhook handler with cryptographic signature verification',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 400, description: 'Missing signature header' })
  @ApiResponse({ status: 401, description: 'Invalid HMAC signature' })
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: Request,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing x-razorpay-signature header');
    }

    // req.body could be an object or string depending on express json parser
    const rawBody =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    return this.paymentsService.handleRazorpayWebhook(rawBody, signature);
  }
}
