import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import { type WhatsAppAdapter, type EmailAdapter } from '../../communications/domain/notification.interfaces.js';
import type { EnvConfig } from '../../../config/index.js';
import { MoneyLinksService } from './money-links.service.js';
import { PaymentsService } from './payments.service.js';
export interface RazorpayWebhookPayload {
    entity: string;
    account_id?: string;
    event: string;
    id?: string;
    contains?: string[];
    created_at?: number;
    payload: {
        payment_link?: {
            entity: {
                id: string;
                reference_id?: string;
                amount: number;
                amount_paid?: number;
                status?: string;
                notes?: Record<string, string>;
            };
        };
        subscription?: {
            entity: {
                id: string;
                plan_id?: string;
                customer_id?: string;
                status?: string;
                token_id?: string;
                paid_count?: number;
                total_count?: number;
                auth_attempts?: number;
                notes?: Record<string, string>;
            };
        };
        payment?: {
            entity: {
                id: string;
                amount: number;
                currency?: string;
                status?: string;
                order_id?: string;
                subscription_id?: string;
                method?: string;
                bank?: string;
                wallet?: string;
                vpa?: string;
                email?: string;
                contact?: string;
                error_code?: string;
                error_description?: string;
                acquirer_data?: {
                    bank_transaction_id?: string;
                    upi_transaction_id?: string;
                    auth_code?: string;
                };
                notes?: Record<string, string>;
            };
        };
        order?: {
            entity: {
                id: string;
                amount?: number;
                status?: string;
                receipt?: string;
            };
        };
    };
}
export declare class RazorpayWebhookService {
    private readonly prisma;
    private readonly razorpayAdapter;
    private readonly config;
    private readonly whatsappAdapter?;
    private readonly emailAdapter?;
    private readonly paymentsService?;
    private readonly moneyLinks?;
    private readonly logger;
    constructor(prisma: PrismaService, razorpayAdapter: RazorpayAdapter, config: ConfigService<EnvConfig, true>, whatsappAdapter?: WhatsAppAdapter | undefined, emailAdapter?: EmailAdapter | undefined, paymentsService?: PaymentsService | undefined, moneyLinks?: MoneyLinksService | undefined);
    private getPlatformFeePaise;
    handleWebhook(rawBody: string, signature: string, providerEventId?: string): Promise<{
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
    private handleSubscriptionAuthenticated;
    private handleSubscriptionCharged;
    private sendReceiptNotifications;
    private handlePaymentFailed;
    private handleSubscriptionCancelledOrPaused;
    private handleOneTimePaymentCaptured;
}
