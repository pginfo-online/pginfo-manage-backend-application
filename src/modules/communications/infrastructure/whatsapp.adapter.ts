import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  WhatsAppAdapter,
  SendWhatsAppOptions,
  NotificationResult,
} from '../domain/notification.interfaces.js';
import type { EnvConfig } from '../../../config/index.js';

@Injectable()
export class WhatsAppHttpAdapter implements WhatsAppAdapter {
  private readonly logger = new Logger(WhatsAppHttpAdapter.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async send(options: SendWhatsAppOptions): Promise<NotificationResult> {
    const localNumber = options.to.trim().replace(/[\s()-]/g, '');
    const to = /^[6-9]\d{9}$/.test(localNumber)
      ? '91' + localNumber
      : localNumber.replace(/^\+/, '');
    if (!/^[1-9]\d{9,14}$/.test(to)) {
      return { success: false, error: 'Invalid WhatsApp recipient number' };
    }

    const token = this.config.get('META_WHATSAPP_ACCESS_TOKEN');
    const phoneId = this.config.get('META_WHATSAPP_PHONE_NUMBER_ID');
    if (token || phoneId) {
      if (!token || !phoneId) {
        return {
          success: false,
          error: 'Meta WhatsApp credentials are incomplete',
        };
      }
      const language = this.config.get('META_WHATSAPP_TEMPLATE_LANGUAGE');
      const version = this.config.get('META_WHATSAPP_API_VERSION');
      const named =
        this.config.get('META_WHATSAPP_TEMPLATE_PARAMETER_FORMAT') === 'NAMED';
      const reminderTemplate = this.config.get(
        'META_WHATSAPP_RENT_REMINDER_TEMPLATE',
      );
      const templateName =
        options.templateName ??
        (options.rentReminder ? reminderTemplate : undefined);
      if (options.rentReminder && !templateName) {
        return {
          success: false,
          error: 'Configure an approved WhatsApp rent reminder template',
        };
      }
      const templateParams =
        options.templateParams ??
        (options.rentReminder
          ? {
              resident_name: options.rentReminder.residentName,
              outstanding_balance: options.rentReminder.balance,
            }
          : {});
      const parameters = Object.entries(templateParams).map(([name, text]) => ({
        type: 'text',
        text,
        ...(named ? { parameter_name: name } : {}),
      }));
      const payload = templateName
        ? {
            type: 'template',
            template: {
              name: templateName,
              language: { code: language },
              ...(parameters.length
                ? { components: [{ type: 'body', parameters }] }
                : {}),
            },
          }
        : { type: 'text', text: { body: options.message } };
      return this.post(
        `https://graph.facebook.com/${version}/${phoneId}/messages`,
        token,
        { messaging_product: 'whatsapp', to, ...payload },
        true,
      );
    }

    const apiUrl = this.config.get('WHATSAPP_API_URL');
    const apiKey = this.config.get('WHATSAPP_API_KEY');
    if (apiUrl && apiKey && !apiUrl.includes('example.com')) {
      return this.post(
        apiUrl,
        apiKey,
        {
          to,
          message: options.message,
          template: options.templateName,
          params: options.templateParams,
        },
        false,
      );
    }
    return { success: false, error: 'WhatsApp provider is not configured' };
  }

  private async post(
    url: string,
    key: string,
    payload: object,
    meta: boolean,
  ): Promise<NotificationResult> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(payload),
      });
      if (!meta && response.ok) {
        return { success: true, messageId: `wa_${Date.now()}` };
      }
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: number; error_subcode?: number };
        messages?: { id?: string }[];
      } | null;
      if (!response.ok) {
        const code = body?.error?.code;
        const subcode = body?.error?.error_subcode;
        const error = `WhatsApp provider rejected the message (HTTP ${response.status}${code ? `, code ${code}` : ''}${subcode ? `, subcode ${subcode}` : ''})`;
        this.logger.warn(error);
        return { success: false, error };
      }
      const messageId = body?.messages?.[0]?.id;
      return messageId
        ? { success: true, messageId }
        : {
            success: false,
            error: 'Meta did not return a WhatsApp message ID',
          };
    } catch {
      this.logger.warn('WhatsApp provider request failed or timed out');
      return {
        success: false,
        error: 'WhatsApp provider request failed or timed out',
      };
    }
  }
}
