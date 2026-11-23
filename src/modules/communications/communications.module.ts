import { Module } from '@nestjs/common';
import { WhatsAppWebhookController } from './api/whatsapp-webhook.controller.js';
import { AnnouncementsController } from './api/announcements.controller.js';
import { AnnouncementsService } from './application/announcements.service.js';
import {
  EMAIL_ADAPTER,
  WHATSAPP_ADAPTER,
} from './domain/notification.interfaces.js';
import { ResendEmailAdapter } from './infrastructure/email.adapter.js';
import { WhatsAppHttpAdapter } from './infrastructure/whatsapp.adapter.js';

@Module({
  controllers: [AnnouncementsController, WhatsAppWebhookController],
  providers: [
    AnnouncementsService,
    {
      provide: EMAIL_ADAPTER,
      useClass: ResendEmailAdapter,
    },
    {
      provide: WHATSAPP_ADAPTER,
      useClass: WhatsAppHttpAdapter,
    },
  ],
  exports: [AnnouncementsService, EMAIL_ADAPTER, WHATSAPP_ADAPTER],
})
export class CommunicationsModule {}
