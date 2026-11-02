import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { EnvConfig } from '../../../config/index.js';

export interface RazorpayOrderResult {
  orderId: string;
  amount: number; // in paise
  currency: string;
  receipt: string;
}

export interface CreateLinkedAccountOptions {
  email: string;
  phone: string;
  legalBusinessName: string;
  businessType: string;
  contactName: string;
  accountNumber: string;
  ifscCode: string;
  beneficiaryName: string;
  notes?: Record<string, string>;
}

export interface LinkedAccountResult {
  accountId: string;
  status: string;
  email: string;
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
  startAt?: number; // Unix timestamp
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
  account: string; // Landlord linked account_id
  amount: number;  // in paise
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
}

export interface PaymentLinkResult {
  paymentLinkId: string;
  shortUrl: string;
  status: string;
}

@Injectable()
export class RazorpayAdapter {
  private readonly logger = new Logger(RazorpayAdapter.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  private getKeyId(): string {
    return this.config.get('RAZORPAY_KEY_ID') || '';
  }

  private getKeySecret(): string {
    return this.config.get('RAZORPAY_KEY_SECRET') || '';
  }

  private getWebhookSecret(): string {
    return this.config.get('RAZORPAY_WEBHOOK_SECRET') || '';
  }

  private isLiveOrConfigured(): boolean {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();
    return Boolean(
      keyId &&
        keySecret &&
        !keyId.startsWith('rzp_test_xxxx') &&
        !keyId.startsWith('rzp_test_mock'),
    );
  }

  private getBasicAuthHeader(): string {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();
    return Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  }

  /**
   * Constant-time comparison between signature and expected hash
   * to protect against timing attacks.
   */
  private secureCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, 'hex');
      const bufB = Buffer.from(b, 'hex');
      if (bufA.length !== bufB.length) {
        return false;
      }
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Verifies the cryptographic HMAC SHA-256 signature returned by Razorpay Checkout.
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const keySecret = this.getKeySecret();
    if (!keySecret) {
      this.logger.warn(
        'Razorpay secret not configured; signature verification failing by default.',
      );
      return false;
    }

    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    return this.secureCompare(signature, expectedSignature);
  }

  /**
   * Verifies the cryptographic HMAC SHA-256 signature for incoming Razorpay webhooks.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = this.getWebhookSecret();
    if (!secret) {
      this.logger.warn('Razorpay webhook secret not configured.');
      return false;
    }

    const expectedSignature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return this.secureCompare(signature, expectedSignature);
  }

  /**
   * Creates an order with Razorpay.
   */
  async createOrder(
    amountPaise: number,
    receipt: string,
    notes?: Record<string, string>,
  ): Promise<RazorpayOrderResult> {
    if (this.isLiveOrConfigured()) {
      try {
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${this.getBasicAuthHeader()}`,
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt,
            notes,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          this.logger.error(
            `Razorpay order creation failed: ${JSON.stringify(errorData)}`,
          );
          throw new Error(`Razorpay error: ${response.statusText}`);
        }

        const data = (await response.json()) as {
          id: string;
          amount: number;
          currency: string;
          receipt: string;
        };
        return {
          orderId: data.id,
          amount: data.amount,
          currency: data.currency,
          receipt: data.receipt,
        };
      } catch (err) {
        this.logger.error(
          `Failed to connect to Razorpay API: ${(err as Error).message}`,
        );
        throw err;
      }
    }

    // Dev/Sandbox simulation order
    const simOrderId = `order_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.logger.log(
      `[SIMULATION] Generated Razorpay order: ${simOrderId} for ${amountPaise} paise`,
    );
    return {
      orderId: simOrderId,
      amount: amountPaise,
      currency: 'INR',
      receipt,
    };
  }

  /**
   * Onboards a landlord as a linked sub-merchant account via Razorpay Route (`POST /v1/accounts`).
   */
  async createLinkedAccount(
    options: CreateLinkedAccountOptions,
  ): Promise<LinkedAccountResult> {
    if (this.isLiveOrConfigured()) {
      try {
        const payload = {
          email: options.email,
          phone: options.phone,
          type: 'route',
          legal_business_name: options.legalBusinessName,
          business_type: options.businessType || 'individual',
          contact_name: options.contactName,
          profile: {
            category: 'housing',
            subcategory: 'real_estate_agents',
            addresses: {
              registered: {
                street1: 'Rental Property Address',
                city: 'Bengaluru',
                state: 'KA',
                postal_code: '560001',
                country: 'IN',
              },
            },
          },
          notes: options.notes,
        };

        const response = await fetch('https://api.razorpay.com/v1/accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${this.getBasicAuthHeader()}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          this.logger.error(
            `Razorpay linked account creation failed: ${JSON.stringify(errorData)}`,
          );
          throw new Error(
            `Razorpay Route Account error: ${JSON.stringify(errorData)}`,
          );
        }

        const data = (await response.json()) as {
          id: string;
          status: string;
          email: string;
        };

        return {
          accountId: data.id,
          status: data.status || 'created',
          email: data.email,
        };
      } catch (err) {
        this.logger.error(
          `Failed to create Razorpay linked account: ${(err as Error).message}`,
        );
        throw err;
      }
    }

    // Dev/Sandbox simulation
    const simAccountId = `acc_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.logger.log(
      `[SIMULATION] Created linked sub-merchant account: ${simAccountId} for ${options.legalBusinessName}`,
    );
    return {
      accountId: simAccountId,
      status: 'created',
      email: options.email,
    };
  }

  /**
   * Creates a recurring subscription plan (`POST /v1/plans`).
   */
  async createPlan(options: CreatePlanOptions): Promise<{ planId: string }> {
    if (this.isLiveOrConfigured()) {
      try {
        const response = await fetch('https://api.razorpay.com/v1/plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${this.getBasicAuthHeader()}`,
          },
          body: JSON.stringify({
            period: 'monthly',
            interval: 1,
            item: {
              name: options.name,
              amount: options.amountPaise,
              currency: options.currency || 'INR',
              description: options.description || 'Monthly Rent Autopay Mandate',
            },
            notes: options.notes,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          this.logger.error(
            `Razorpay plan creation failed: ${JSON.stringify(errorData)}`,
          );
          throw new Error(`Razorpay Plan error: ${response.statusText}`);
        }

        const data = (await response.json()) as { id: string };
        return { planId: data.id };
      } catch (err) {
        this.logger.error(
          `Failed to create Razorpay plan: ${(err as Error).message}`,
        );
        throw err;
      }
    }

    const simPlanId = `plan_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.logger.log(`[SIMULATION] Created plan: ${simPlanId}`);
    return { planId: simPlanId };
  }

  /**
   * Creates a recurring mandate subscription (`POST /v1/subscriptions`).
   * Razorpay returns a `short_url` hosted mandate authorization link.
   */
  async createSubscription(
    options: CreateSubscriptionOptions,
  ): Promise<SubscriptionResult> {
    if (this.isLiveOrConfigured()) {
      try {
        const payload: Record<string, unknown> = {
          plan_id: options.planId,
          total_count: options.totalCount,
          quantity: 1,
          customer_notify: options.customerNotify ?? 1,
          notes: options.notes,
        };
        if (options.startAt) {
          payload['start_at'] = options.startAt;
        }

        const response = await fetch(
          'https://api.razorpay.com/v1/subscriptions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${this.getBasicAuthHeader()}`,
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          this.logger.error(
            `Razorpay subscription creation failed: ${JSON.stringify(errorData)}`,
          );
          throw new Error(
            `Razorpay Subscription error: ${JSON.stringify(errorData)}`,
          );
        }

        const data = (await response.json()) as {
          id: string;
          plan_id: string;
          status: string;
          short_url: string;
          total_count: number;
          paid_count: number;
        };

        return {
          subscriptionId: data.id,
          planId: data.plan_id,
          status: data.status,
          shortUrl: data.short_url,
          totalCount: data.total_count,
          paidCount: data.paid_count || 0,
        };
      } catch (err) {
        this.logger.error(
          `Failed to create Razorpay subscription: ${(err as Error).message}`,
        );
        throw err;
      }
    }

    const simSubId = `sub_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const simShortUrl = `https://rzp.io/i/mandate_${simSubId}`;
    this.logger.log(
      `[SIMULATION] Created subscription: ${simSubId} with short_url: ${simShortUrl}`,
    );
    return {
      subscriptionId: simSubId,
      planId: options.planId,
      status: 'created',
      shortUrl: simShortUrl,
      totalCount: options.totalCount,
      paidCount: 0,
    };
  }

  /**
   * Cancels a subscription (`POST /v1/subscriptions/{id}/cancel`).
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtCycleEnd = false,
  ): Promise<{ id: string; status: string }> {
    if (this.isLiveOrConfigured()) {
      try {
        const response = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${subscriptionId}/cancel`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${this.getBasicAuthHeader()}`,
            },
            body: JSON.stringify({
              cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          this.logger.error(
            `Razorpay subscription cancellation failed: ${JSON.stringify(errorData)}`,
          );
          throw new Error(`Razorpay Cancel error: ${response.statusText}`);
        }

        const data = (await response.json()) as { id: string; status: string };
        return data;
      } catch (err) {
        this.logger.error(
          `Failed to cancel subscription: ${(err as Error).message}`,
        );
        throw err;
      }
    }

    this.logger.log(`[SIMULATION] Cancelled subscription: ${subscriptionId}`);
    return { id: subscriptionId, status: 'cancelled' };
  }

  /**
   * Executes a transfer to a landlord's linked account via Razorpay Route
   * (`POST /v1/payments/{payment_id}/transfers`).
   */
  async transferPayment(
    paymentId: string,
    item: RouteTransferItem,
  ): Promise<RouteTransferResult> {
    if (this.isLiveOrConfigured()) {
      try {
        const response = await fetch(
          `https://api.razorpay.com/v1/payments/${paymentId}/transfers`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${this.getBasicAuthHeader()}`,
            },
            body: JSON.stringify({
              transfers: [
                {
                  account: item.account,
                  amount: item.amount,
                  currency: item.currency || 'INR',
                  notes: item.notes,
                  on_hold: item.onHold ?? 0,
                },
              ],
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          this.logger.error(
            `Razorpay Route transfer failed: ${JSON.stringify(errorData)}`,
          );
          throw new Error(
            `Razorpay Route transfer error: ${JSON.stringify(errorData)}`,
          );
        }

        const data = (await response.json()) as {
          items: Array<{
            id: string;
            recipient: string;
            amount: number;
            status: string;
          }>;
        };

        const firstItem = data.items?.[0];
        return {
          transferId: firstItem?.id || `trf_${Date.now()}`,
          accountId: firstItem?.recipient || item.account,
          amount: firstItem?.amount || item.amount,
          status: firstItem?.status || 'processed',
        };
      } catch (err) {
        this.logger.error(
          `Failed to execute Route transfer for payment ${paymentId}: ${(err as Error).message}`,
        );
        throw err;
      }
    }

    // Dev/Sandbox simulation
    const simTransferId = `trf_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.logger.log(
      `[SIMULATION] Executed Route transfer: ${simTransferId} routing ${item.amount} paise to ${item.account}`,
    );
    return {
      transferId: simTransferId,
      accountId: item.account,
      amount: item.amount,
      status: 'processed',
    };
  }

  /**
   * Creates a one-time instant fallback payment link (`POST /v1/payment_links`)
   * when an autopay subscription fails.
   */
  async createPaymentLink(
    options: CreatePaymentLinkOptions,
  ): Promise<PaymentLinkResult> {
    if (this.isLiveOrConfigured()) {
      try {
        const response = await fetch(
          'https://api.razorpay.com/v1/payment_links',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${this.getBasicAuthHeader()}`,
            },
            body: JSON.stringify({
              amount: options.amountPaise,
              currency: 'INR',
              accept_partial: false,
              description: options.description,
              customer: options.customer,
              notify: {
                sms: true,
                email: Boolean(options.customer.email),
              },
              reminder_enable: true,
              notes: options.notes,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          this.logger.error(
            `Razorpay payment link creation failed: ${JSON.stringify(errorData)}`,
          );
          throw new Error(`Razorpay Payment Link error: ${response.statusText}`);
        }

        const data = (await response.json()) as {
          id: string;
          short_url: string;
          status: string;
        };

        return {
          paymentLinkId: data.id,
          shortUrl: data.short_url,
          status: data.status,
        };
      } catch (err) {
        this.logger.error(
          `Failed to create fallback payment link: ${(err as Error).message}`,
        );
        throw err;
      }
    }

    const simLinkId = `plink_sim_${Date.now()}`;
    const simUrl = `https://rzp.io/i/fallback_${simLinkId}`;
    this.logger.log(
      `[SIMULATION] Created fallback payment link: ${simUrl} for ${options.amountPaise} paise`,
    );
    return {
      paymentLinkId: simLinkId,
      shortUrl: simUrl,
      status: 'created',
    };
  }
}
