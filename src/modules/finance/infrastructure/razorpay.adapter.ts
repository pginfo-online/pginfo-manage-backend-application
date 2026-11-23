import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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

interface RouteProduct {
  id?: string;
  activation_status?: string;
  active_configuration?: {
    settlement_accounts?: {
      method?: string;
      active?: boolean;
      verification_status?: string;
      bank_account?: { is_default?: boolean };
    }[];
  };
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
  amount: number; // in paise
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

@Injectable()
export class RazorpayAdapter {
  private readonly logger = new Logger(RazorpayAdapter.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  canCreateMoneyLinks(): boolean {
    return this.isLiveOrConfigured() && Boolean(this.getWebhookSecret());
  }
  async fetchPayment(id: string): Promise<{
    id: string;
    order_id: string;
    amount: number;
    currency: string;
    status: string;
  }> {
    if (!/^pay_[A-Za-z0-9]+$/.test(id))
      throw new Error('Invalid gateway payment ID');
    if (!this.isLiveOrConfigured())
      throw new ServiceUnavailableException(
        'Razorpay credentials are not configured',
      );
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(id)}`,
      {
        headers: { Authorization: `Basic ${this.getBasicAuthHeader()}` },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      throw new ServiceUnavailableException(
        'Unable to verify payment with the gateway',
      );
    return (await response.json()) as {
      id: string;
      order_id: string;
      amount: number;
      currency: string;
      status: string;
    };
  }

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
    const payload = {
      type: 'route',
      tnc_accepted: true,
      email: options.email,
      phone: '+91' + options.phone.slice(-10),
      legal_business_name: options.legalBusinessName,
      business_type: options.businessType,
      ...(options.panNumber ? { legal_info: { pan: options.panNumber } } : {}),
      notes: options.notes,
      settlement_accounts: [
        {
          method: 'bank_account',
          bank_account: {
            account_number: options.accountNumber,
            beneficiary_name: options.beneficiaryName,
            code_type: 'ifsc',
            code: options.ifscCode,
            currency: 'INR',
            is_default: true,
          },
        },
      ],
    };
    const key = createHmac('sha256', this.getKeySecret())
      .update(JSON.stringify(payload))
      .digest('hex')
      .slice(0, 32);
    const idempotencyKey = [
      key.slice(0, 8),
      key.slice(8, 12),
      key.slice(12, 16),
      key.slice(16, 20),
      key.slice(20),
    ].join('-');
    const body = JSON.stringify({ ...payload, reference_id: 'pginfo_' + key });
    const data = await this.routeRequest(
      '/v2/accounts',
      'POST',
      body,
      idempotencyKey,
    );
    if (!data.id || !/^acc_[A-Za-z0-9]+$/.test(data.id))
      throw new BadGatewayException(
        'Razorpay did not return a linked account ID',
      );
    return {
      accountId: data.id,
      status: data.status ?? 'created',
      email: options.email,
      productId: data.product_config?.id,
      verified: this.isRouteBankVerified(data.product_config),
    };
  }

  async fetchRouteBankVerification(accountId: string, productId: string) {
    if (
      !/^acc_[A-Za-z0-9]+$/.test(accountId) ||
      !/^acc_prd_[A-Za-z0-9]+$/.test(productId)
    )
      throw new BadRequestException(
        'This account needs Route setup before verification can be checked',
      );
    const product = await this.routeRequest(
      `/v2/accounts/${accountId}/products/${productId}`,
      'GET',
    );
    return this.isRouteBankVerified(product);
  }

  private isRouteBankVerified(product?: RouteProduct) {
    return (
      product?.activation_status === 'activated' &&
      product.active_configuration?.settlement_accounts?.some(
        (account) =>
          account.method === 'bank_account' &&
          account.active === true &&
          account.bank_account?.is_default === true &&
          account.verification_status === 'verified',
      ) === true
    );
  }

  private async routeRequest(
    path: string,
    method: 'POST' | 'GET',
    body?: string,
    key?: string,
  ) {
    if (!this.isLiveOrConfigured()) {
      throw new ServiceUnavailableException(
        'Razorpay Route credentials are required to manage settlement accounts',
      );
    }
    let response: Response;
    try {
      response = await fetch('https://api.razorpay.com' + path, {
        method,
        body,
        signal: AbortSignal.timeout(12_000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.getBasicAuthHeader()}`,
          ...(key ? { 'Idempotency-Key': key } : {}),
        },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Razorpay Route did not respond. Retry with the same details.',
      );
    }
    if (response.status === 401 || response.status === 403)
      throw new ServiceUnavailableException(
        'Check Razorpay API credentials and confirm Route is enabled.',
      );
    if ([400, 409, 422].includes(response.status)) {
      const result = (await response.json().catch(() => null)) as {
        error?: { field?: unknown; reason?: unknown; description?: unknown };
      } | null;
      const field = result?.error?.field;
      const messages = new Map([
        [
          'reference_id',
          'Razorpay rejected the onboarding reference. Contact support before retrying.',
        ],
        [
          'legal_business_name',
          'Enter the legal name exactly as it appears on the owner’s KYC documents.',
        ],
        ['legal_info.pan', 'Check the PAN against the owner’s KYC documents.'],
        [
          'email',
          'Check whether the email is valid or already registered in Razorpay Route.',
        ],
        ['phone', 'Check the owner’s Indian mobile number.'],
        [
          'settlement_accounts[0].bank_account.account_number',
          'Check the bank account number.',
        ],
        [
          'settlement_accounts[0].bank_account.beneficiary_name',
          'Enter the beneficiary name exactly as shown in the bank records.',
        ],
        [
          'settlement_accounts[0].bank_account.code',
          'Check the bank’s IFSC code.',
        ],
      ]);
      if (response.status === 409)
        throw new ConflictException(
          'Razorpay already has a conflicting linked account or the same request is in progress. Check Route before trying again.',
        );
      const details = [result?.error?.reason, result?.error?.description]
        .filter((value): value is string => typeof value === 'string')
        .join(' ')
        .toLowerCase()
        .replaceAll('_', ' ');
      const categories = [
        [
          /route.{0,48}(not enabled|not activated|not supported|not available|not allowed)/,
          'route_disabled',
          'Razorpay reports that Route onboarding is unavailable for this merchant. Check the Route setup in the Razorpay Dashboard.',
        ],
        [
          /(already (exists|registered|linked|associated)|duplicate)/,
          'duplicate_account',
          'Razorpay reports that these details are already registered. Check existing linked accounts in Razorpay Route.',
        ],
        [
          /(beneficiary|name mismatch|name does not match)/,
          'beneficiary',
          'Enter the beneficiary name exactly as shown in the bank records.',
        ],
        [
          /\bifsc\b/,
          'ifsc',
          'Razorpay rejected the IFSC. Check it against the bank records.',
        ],
        [
          /bank account|account number/,
          'bank_account',
          'Razorpay rejected the bank account details. Check the account number and IFSC against the bank records.',
        ],
        [
          /\bpan\b|legal info/,
          'pan',
          'Check whether Razorpay requires PAN or other KYC information for this account.',
        ],
        [
          /reference id/,
          'reference',
          'Razorpay rejected the onboarding reference. Contact support before retrying.',
        ],
      ] as const;
      const matched = categories.find(([pattern]) => pattern.test(details));
      const fieldMessage =
        typeof field === 'string'
          ? messages.get(field.replace(/\[\d*\]/g, '[0]'))
          : undefined;
      this.logger.warn(
        {
          upstreamStatus: response.status,
          category:
            matched?.[1] ?? (fieldMessage ? 'known_field' : 'unclassified'),
        },
        'Razorpay Route onboarding rejected',
      );
      throw new BadRequestException(
        fieldMessage ??
          matched?.[2] ??
          'Razorpay rejected the account without a recognized field or reason. Check the failed request in Razorpay or contact Razorpay support.',
      );
    }
    if (!response.ok)
      throw new BadGatewayException(
        'Razorpay Route could not complete the request. Retry with the same details.',
      );
    return (await response.json().catch(() => {
      throw new BadGatewayException(
        'Razorpay Route returned an invalid response',
      );
    })) as RouteProduct & {
      id?: string;
      status?: string;
      product_config?: RouteProduct;
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
          signal: AbortSignal.timeout(12000),
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
              description:
                options.description || 'Monthly Rent Autopay Mandate',
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
            signal: AbortSignal.timeout(12000),
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
            signal: AbortSignal.timeout(12000),
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
    if (!this.isLiveOrConfigured())
      throw new ServiceUnavailableException(
        'Razorpay Route credentials are required for owner transfers',
      );
    if (
      !/^pay_[A-Za-z0-9]+$/.test(paymentId) ||
      !/^acc_[A-Za-z0-9]+$/.test(item.account)
    )
      throw new BadRequestException(
        'Invalid Razorpay payment or linked account',
      );
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${paymentId}/transfers`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(12_000),
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
    if (!response.ok)
      throw new BadGatewayException(
        `Razorpay Route transfer returned HTTP ${response.status}`,
      );
    const data = (await response.json()) as {
      items?: {
        id?: string;
        recipient?: string;
        amount?: number;
        status?: string;
        transfer_status?: string;
      }[];
    };
    const transfer = data?.items?.[0];
    if (
      !transfer?.id ||
      !/^trf_[A-Za-z0-9]+$/.test(transfer.id) ||
      transfer.recipient !== item.account ||
      transfer.amount !== item.amount
    )
      throw new BadGatewayException(
        'Razorpay did not confirm the expected Route transfer',
      );
    const status = transfer.transfer_status ?? transfer.status ?? 'unknown';
    if (['failed', 'reversed'].includes(status))
      throw new BadGatewayException(
        'Razorpay reported an unsuccessful Route transfer',
      );
    return {
      transferId: transfer.id,
      accountId: transfer.recipient,
      amount: transfer.amount,
      status,
    };
  }

  /**
   * Creates a one-time instant fallback payment link (`POST /v1/payment_links`)
   * when an autopay subscription fails.
   */
  async createPaymentLink(
    options: CreatePaymentLinkOptions,
  ): Promise<PaymentLinkResult> {
    if (options.requireConfigured && !this.canCreateMoneyLinks())
      throw new ServiceUnavailableException(
        'Configure Razorpay API credentials and webhook secret to create payment links',
      );
    if (this.isLiveOrConfigured()) {
      try {
        const response = await fetch(
          'https://api.razorpay.com/v1/payment_links',
          {
            method: 'POST',
            signal: AbortSignal.timeout(15000),
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
                sms: options.notify ?? true,
                email:
                  (options.notify ?? true) && Boolean(options.customer.email),
              },
              reminder_enable: options.notify ?? true,
              ...(options.referenceId
                ? { reference_id: options.referenceId }
                : {}),
              ...(options.expireBy ? { expire_by: options.expireBy } : {}),
              notes: options.notes,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          this.logger.error(
            `Razorpay payment link creation failed: ${JSON.stringify(errorData)}`,
          );
          throw new Error(
            `Razorpay Payment Link error: ${response.statusText}`,
          );
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
