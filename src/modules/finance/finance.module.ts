import { Module } from '@nestjs/common';
import { BillingController } from './api/billing.controller.js';
import { PaymentsController } from './api/payments.controller.js';
import { RazorpayWebhookController } from '../../interfaces/webhooks/razorpay.controller.js';
import { BillingService } from './application/billing.service.js';
import { PaymentsService } from './application/payments.service.js';
import { RazorpayAdapter } from './infrastructure/razorpay.adapter.js';

@Module({
  controllers: [
    BillingController,
    PaymentsController,
    RazorpayWebhookController,
  ],
  providers: [BillingService, PaymentsService, RazorpayAdapter],
  exports: [BillingService, PaymentsService, RazorpayAdapter],
})
export class FinanceModule {}
