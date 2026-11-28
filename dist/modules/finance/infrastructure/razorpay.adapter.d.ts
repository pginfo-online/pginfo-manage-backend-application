import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../../config/index.js';
export interface RazorpayOrderResult {
    orderId: string;
    amount: number;
    currency: string;
    receipt: string;
}
export interface CreateLinkedAccountOptions {
    email: string;
    phone: string;
    legalBusinessName: string;
    businessType: string;
    panNumber?: string;
    accountNumber: string;
    ifscCode: string;
    beneficiaryName: string;
    notes?: Record<string, string>;
}
export interface LinkedAccountResult {
    accountId: string;
    status: string;
    email: string;
    productId?: string;
    verified: boolean;
}
export interface CreatePlanOptions {
    name: string;
    amountPaise: number;
    currency?: string;
    description?: string;
    notes?: Record<string, string>;
}
export interface CreateSubscriptionOptions {
    planId: string;
    totalCount: number;
    customerNotify?: number;
    startAt?: number;
    notes?: Record<string, string>;
}
export interface SubscriptionResult {
    subscriptionId: string;
    planId: string;
    status: string;
    shortUrl: string;
    totalCount: number;
    paidCount: number;
}
export interface RouteTransferItem {
    account: string;
    amount: number;
    currency?: string;
    notes?: Record<string, string>;
    onHold?: number;
}
export interface RouteTransferResult {
    transferId: string;
    accountId: string;
    amount: number;
    status: string;
}
export interface CreatePaymentLinkOptions {
    amountPaise: number;
    description: string;
    customer: {
        name: string;
        contact: string;
        email?: string;
    };
    notes?: Record<string, string>;
    requireConfigured?: boolean;
    notify?: boolean;
    referenceId?: string;
    expireBy?: number;
}
export interface PaymentLinkResult {
    paymentLinkId: string;
    shortUrl: string;
    status: string;
}
export declare class RazorpayAdapter {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService<EnvConfig, true>);
    canCreateMoneyLinks(): boolean;
    fetchPayment(id: string): Promise<{
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        amount_refunded?: number;
    }>;
    createCollectionQr(amount: number, closeBy: number, paymentId: string): Promise<{
        id: string;
        imageUrl: string;
        expiresAt: Date;
    }>;
    private readGateway;
    findPaymentSettlement(paymentId: string, amount: number, date: string): Promise<{
        providerId: string;
        bankReference: string;
        netAmount: number;
    } | null>;
    fetchSubscription(id: string): Promise<{
        id: string;
        status: string;
    }>;
    hasPreviousRouteTransfer(paymentId: string): Promise<boolean>;
    private getKeyId;
    private getKeySecret;
    private getWebhookSecret;
    private isLiveOrConfigured;
    private getBasicAuthHeader;
    private secureCompare;
    verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
    verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean;
    createOrder(amountPaise: number, receipt: string, notes?: Record<string, string>): Promise<RazorpayOrderResult>;
    createLinkedAccount(options: CreateLinkedAccountOptions): Promise<LinkedAccountResult>;
    fetchRouteBankVerification(accountId: string, productId: string): Promise<boolean>;
    private isRouteBankVerified;
    private routeRequest;
    createPlan(options: CreatePlanOptions): Promise<{
        planId: string;
    }>;
    createSubscription(options: CreateSubscriptionOptions): Promise<SubscriptionResult>;
    cancelSubscription(subscriptionId: string, cancelAtCycleEnd?: boolean): Promise<{
        id: string;
        status: string;
    }>;
    transferPayment(paymentId: string, item: RouteTransferItem): Promise<RouteTransferResult>;
    createPaymentLink(options: CreatePaymentLinkOptions): Promise<PaymentLinkResult>;
}
