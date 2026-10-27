import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import type { EnvConfig } from '../../../config/index.js';

export interface RazorpayOrderResult {
  orderId: string;
  amount: number; // in paise
  currency: string;
  receipt: string;
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

    return signature === expectedSignature;
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

    return signature === expectedSignature;
  }

  /**
   * Creates an order with Razorpay.
   * If real credentials are present, calls the Razorpay API.
   * Otherwise falls back gracefully to a simulation order for development/test.
   */
  async createOrder(
    amountPaise: number,
    receipt: string,
    notes?: Record<string, string>,
  ): Promise<RazorpayOrderResult> {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();

    if (keyId && keySecret && !keyId.startsWith('rzp_test_xxxx')) {
      try {
        const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString(
          'base64',
        );
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${authHeader}`,
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
      `Generated simulated Razorpay order: ${simOrderId} for ${amountPaise} paise`,
    );
    return {
      orderId: simOrderId,
      amount: amountPaise,
      currency: 'INR',
      receipt,
    };
  }
}
