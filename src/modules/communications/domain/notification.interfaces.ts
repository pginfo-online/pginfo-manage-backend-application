export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendWhatsAppOptions {
  to: string; // Indian mobile number e.g. "9876543210"
  message: string;
  rentReminder?: { residentName: string; balance: string };
  templateName?: string;
  templateParams?: Record<string, string>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const EMAIL_ADAPTER = 'EMAIL_ADAPTER';
export const WHATSAPP_ADAPTER = 'WHATSAPP_ADAPTER';

export interface EmailAdapter {
  send(options: SendEmailOptions): Promise<NotificationResult>;
}

export interface WhatsAppAdapter {
  send(options: SendWhatsAppOptions): Promise<NotificationResult>;
}
