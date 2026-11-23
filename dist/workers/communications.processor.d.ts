import { WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AnnouncementsService } from '../modules/communications/application/announcements.service.js';
export declare const COMMUNICATIONS_QUEUE = "communications-queue";
export interface SendAnnouncementJobData {
    announcementId: string;
    organizationId: string;
    userId: string;
}
export interface SendRentRemindersJobData {
    organizationId: string;
    propertyId?: string;
    residentId?: string;
    channel: 'WHATSAPP' | 'EMAIL' | 'BOTH';
    userId: string;
}
export declare class CommunicationsProcessor extends WorkerHost {
    private readonly announcementsService;
    private readonly logger;
    constructor(announcementsService: AnnouncementsService);
    process(job: Job<SendAnnouncementJobData | SendRentRemindersJobData>): Promise<unknown>;
}
