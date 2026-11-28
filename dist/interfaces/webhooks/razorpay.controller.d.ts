import type { Request } from 'express';
import { RazorpayWebhookService } from '../../modules/finance/application/razorpay-webhook.service.js';
export declare class RazorpayWebhookController {
    private readonly razorpayWebhookService;
    constructor(razorpayWebhookService: RazorpayWebhookService);
    handleWebhook(signature: string, req: Request, eventId?: string): Promise<{
        status: string;
        eventId: string;
        processedAt: Date;
        received?: undefined;
        event?: undefined;
    } | {
        received: boolean;
        event: string;
        eventId: string;
        status?: undefined;
        processedAt?: undefined;
    }>;
}
