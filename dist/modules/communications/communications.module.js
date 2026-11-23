var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { WhatsAppWebhookController } from './api/whatsapp-webhook.controller.js';
import { AnnouncementsController } from './api/announcements.controller.js';
import { AnnouncementsService } from './application/announcements.service.js';
import { EMAIL_ADAPTER, WHATSAPP_ADAPTER, } from './domain/notification.interfaces.js';
import { ResendEmailAdapter } from './infrastructure/email.adapter.js';
import { WhatsAppHttpAdapter } from './infrastructure/whatsapp.adapter.js';
let CommunicationsModule = class CommunicationsModule {
};
CommunicationsModule = __decorate([
    Module({
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
], CommunicationsModule);
export { CommunicationsModule };
//# sourceMappingURL=communications.module.js.map