export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
export interface SendWhatsAppOptions {
    to: string;
    message: string;
    rentReminder?: {
        residentName: string;
        balance: string;
    };
    templateName?: string;
    templateParams?: Record<string, string>;
}
export interface NotificationResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
export declare const EMAIL_ADAPTER = "EMAIL_ADAPTER";
export declare const WHATSAPP_ADAPTER = "WHATSAPP_ADAPTER";
export interface EmailAdapter {
    send(options: SendEmailOptions): Promise<NotificationResult>;
}
export interface WhatsAppAdapter {
    send(options: SendWhatsAppOptions): Promise<NotificationResult>;
}
