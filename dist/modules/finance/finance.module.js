var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { BankAccountCipher } from './infrastructure/bank-account-cipher.js';
import { BillingController } from './api/billing.controller.js';
import { PaymentsController } from './api/payments.controller.js';
import { PayoutsController } from './api/payouts.controller.js';
import { MandatesController } from './api/mandates.controller.js';
import { InvoicesController } from './api/invoices.controller.js';
import { RazorpayWebhookController } from '../../interfaces/webhooks/razorpay.controller.js';
import { BillingService } from './application/billing.service.js';
import { PaymentsService } from './application/payments.service.js';
import { PayoutsService } from './application/payouts.service.js';
import { MandatesService } from './application/mandates.service.js';
import { InvoicesService } from './application/invoices.service.js';
import { RazorpayWebhookService } from './application/razorpay-webhook.service.js';
import { RazorpayAdapter } from './infrastructure/razorpay.adapter.js';
import { CommunicationsModule } from '../communications/communications.module.js';
import { MoneyController } from './api/money.controller.js';
import { MoneyService } from './application/money.service.js';
import { MoneyLinksService } from './application/money-links.service.js';
let FinanceModule = class FinanceModule {
};
FinanceModule = __decorate([
    Module({
        imports: [CommunicationsModule],
        controllers: [
            MoneyController,
            BillingController,
            PaymentsController,
            PayoutsController,
            MandatesController,
            InvoicesController,
            RazorpayWebhookController,
        ],
        providers: [
            BankAccountCipher,
            MoneyLinksService,
            MoneyService,
            BillingService,
            PaymentsService,
            PayoutsService,
            MandatesService,
            InvoicesService,
            RazorpayWebhookService,
            RazorpayAdapter,
        ],
        exports: [
            BankAccountCipher,
            BillingService,
            PaymentsService,
            PayoutsService,
            MandatesService,
            InvoicesService,
            RazorpayWebhookService,
            RazorpayAdapter,
        ],
    })
], FinanceModule);
export { FinanceModule };
//# sourceMappingURL=finance.module.js.map