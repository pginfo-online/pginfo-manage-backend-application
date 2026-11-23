import { type RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../../../platform/database/index.js';
import type { EnvConfig } from '../../../config/index.js';
export declare class WhatsAppWebhookController {
    private readonly config;
    private readonly prisma;
    constructor(config: ConfigService<EnvConfig, true>, prisma: PrismaService);
    verify(mode: string, token: string, challenge: string): string;
    receive(signature: string, request: RawBodyRequest<Request>): Promise<{
        received: boolean;
    }>;
}
