import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  EmailAdapter,
  SendEmailOptions,
  NotificationResult,
} from '../domain/notification.interfaces.js';
import type { EnvConfig } from '../../../config/index.js';

@Injectable()
export class ResendEmailAdapter implements EmailAdapter {
  private readonly logger = new Logger(ResendEmailAdapter.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async send(options: SendEmailOptions): Promise<NotificationResult> {
    const apiKey = this.config.get('RESEND_API_KEY');
    const fromEmail =
      this.config.get('RESEND_FROM_EMAIL') || 'noreply@pginfo.online';

    if (apiKey && apiKey.startsWith('re_') && !apiKey.includes('xxxx')) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          signal: AbortSignal.timeout(10_000),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text,
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          this.logger.error(`Resend email delivery failed: ${err}`);
          return { success: false, error: err };
        }

        const data = (await response.json()) as { id: string };
        return { success: true, messageId: data.id };
      } catch (err) {
        this.logger.error(
          `Network error sending email via Resend: ${(err as Error).message}`,
        );
        return { success: false, error: (err as Error).message };
      }
    }

    if (this.config.get('NODE_ENV') === 'production') {
      return { success: false, error: 'Email provider is not configured' };
    }

    // Dev/Sandbox simulation
    this.logger.log(
      `[SIMULATED EMAIL] To: ${options.to} | Subject: "${options.subject}"`,
    );
    return { success: true, messageId: `sim_email_${Date.now()}` };
  }
}
