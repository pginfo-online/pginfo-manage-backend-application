import { ConfigService } from '@nestjs/config';
import type { WhatsAppAdapter, SendWhatsAppOptions, NotificationResult } from '../domain/notification.interfaces.js';
import type { EnvConfig } from '../../../config/index.js';
export declare class WhatsAppHttpAdapter implements WhatsAppAdapter {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService<EnvConfig, true>);
    send(options: SendWhatsAppOptions): Promise<NotificationResult>;
    private post;
}
