import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { AnnouncementsService } from '../modules/communications/application/announcements.service.js';

export const COMMUNICATIONS_QUEUE = 'communications-queue';

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

@Processor(COMMUNICATIONS_QUEUE)
export class CommunicationsProcessor extends WorkerHost {
  private readonly logger = new Logger(CommunicationsProcessor.name);

  constructor(private readonly announcementsService: AnnouncementsService) {
    super();
  }

  async process(
    job: Job<SendAnnouncementJobData | SendRentRemindersJobData>,
  ): Promise<unknown> {
    this.logger.log(
      `Processing background communication job: ${job.name} (ID: ${job.id})`,
    );

    switch (job.name) {
      case 'send-announcement': {
        const data = job.data as SendAnnouncementJobData;
        return this.announcementsService.send(
          data.announcementId,
          data.organizationId,
          data.userId,
        );
      }
      case 'send-rent-reminders': {
        const data = job.data as SendRentRemindersJobData;
        return this.announcementsService.sendRentReminders(
          {
            propertyId: data.propertyId,
            residentId: data.residentId,
            channel: data.channel,
          },
          data.organizationId,
          data.userId,
        );
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return null;
    }
  }
}
