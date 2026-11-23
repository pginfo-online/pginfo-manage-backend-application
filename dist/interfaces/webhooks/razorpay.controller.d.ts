import type { Request } from 'express';
import { RazorpayWebhookService } from '../../modules/finance/application/razorpay-webhook.service.js';
export declare class RazorpayWebhookController {
    private readonly razorpayWebhookService;
    constructor(razorpayWebhookService: RazorpayWebhookService);
    handleWebhook(signature: string, req: Request, eventId?: string): Promise<{
        status: string;
        message: string;
        eventId?: undefined;
        processedAt?: undefined;
        received?: undefined;
        event?: undefined;
    } | {
        status: string;
        eventId: string;
        processedAt: Date;
        message?: undefined;
        received?: undefined;
        event?: undefined;
    } | {
        received: boolean;
        event: string;
        eventId: string;
        status?: undefined;
        message?: undefined;
        processedAt?: undefined;
    }>;
}
