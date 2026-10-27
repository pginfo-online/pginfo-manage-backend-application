import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { BillingService } from '../modules/finance/application/billing.service.js';

export const BILLING_QUEUE = 'billing-queue';

export interface GenerateMonthlyDuesJobData {
  organizationId: string;
  propertyId?: string;
  billingMonth: number;
  billingYear: number;
  userId: string;
}

@Processor(BILLING_QUEUE)
export class BillingProcessor extends WorkerHost {
  private readonly logger = new Logger(BillingProcessor.name);

  constructor(private readonly billingService: BillingService) {
    super();
  }

  async process(job: Job<GenerateMonthlyDuesJobData>): Promise<unknown> {
    this.logger.log(
      `Processing background billing job: ${job.name} (ID: ${job.id})`,
    );

    switch (job.name) {
      case 'generate-monthly-dues': {
        const {
          organizationId,
          propertyId,
          billingMonth,
          billingYear,
          userId,
        } = job.data;
        return this.billingService.generateMonthlyDues(
          { propertyId, billingMonth, billingYear },
          organizationId,
          userId,
        );
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return null;
    }
  }
}
