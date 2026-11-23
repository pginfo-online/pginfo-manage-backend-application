var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CommunicationsProcessor_1;
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { AnnouncementsService } from '../modules/communications/application/announcements.service.js';
export const COMMUNICATIONS_QUEUE = 'communications-queue';
let CommunicationsProcessor = CommunicationsProcessor_1 = class CommunicationsProcessor extends WorkerHost {
    announcementsService;
    logger = new Logger(CommunicationsProcessor_1.name);
    constructor(announcementsService) {
        super();
        this.announcementsService = announcementsService;
    }
    async process(job) {
        this.logger.log(`Processing background communication job: ${job.name} (ID: ${job.id})`);
        switch (job.name) {
            case 'send-announcement': {
                const data = job.data;
                return this.announcementsService.send(data.announcementId, data.organizationId, data.userId);
            }
            case 'send-rent-reminders': {
                const data = job.data;
                return this.announcementsService.sendRentReminders({
                    propertyId: data.propertyId,
                    residentId: data.residentId,
                    channel: data.channel,
                }, data.organizationId, data.userId);
            }
            default:
                this.logger.warn(`Unknown job name: ${job.name}`);
                return null;
        }
    }
};
CommunicationsProcessor = CommunicationsProcessor_1 = __decorate([
    Processor(COMMUNICATIONS_QUEUE),
    __metadata("design:paramtypes", [AnnouncementsService])
], CommunicationsProcessor);
export { CommunicationsProcessor };
//# sourceMappingURL=communications.processor.js.map