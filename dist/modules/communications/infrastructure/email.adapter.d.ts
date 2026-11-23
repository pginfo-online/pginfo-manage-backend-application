import { ConfigService } from '@nestjs/config';
import type { EmailAdapter, SendEmailOptions, NotificationResult } from '../domain/notification.interfaces.js';
import type { EnvConfig } from '../../../config/index.js';
export declare class ResendEmailAdapter implements EmailAdapter {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService<EnvConfig, true>);
    send(options: SendEmailOptions): Promise<NotificationResult>;
}
