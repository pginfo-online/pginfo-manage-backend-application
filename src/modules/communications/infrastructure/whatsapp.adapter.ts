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
    const apiUrl = this.config.get('WHATSAPP_API_URL');
    const apiKey = this.config.get('WHATSAPP_API_KEY');

    // Format Indian phone number with 91 prefix
    const formattedNumber = options.to.startsWith('91')
      ? options.to
      : `91${options.to}`;

    if (apiUrl && apiKey && !apiUrl.includes('example.com')) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            to: formattedNumber,
            message: options.message,
            template: options.templateName,
            params: options.templateParams,
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          this.logger.error(`WhatsApp delivery failed: ${err}`);
          return { success: false, error: err };
        }

        return { success: true, messageId: `wa_${Date.now()}` };
      } catch (err) {
        this.logger.error(
          `Network error sending WhatsApp: ${(err as Error).message}`,
        );
        return { success: false, error: (err as Error).message };
      }
    }

    // Dev/Sandbox simulation
    this.logger.log(
      `[SIMULATED WHATSAPP] To: +${formattedNumber} | Message: "${options.message.slice(0, 80)}..."`,
    );
    return { success: true, messageId: `sim_wa_${Date.now()}` };
  }
}
