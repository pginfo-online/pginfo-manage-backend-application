import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { BillingService } from '../modules/finance/application/billing.service.js';
import { dateKeyInTimeZone } from '../common/time/property-date.js';
import { PrismaService } from '../platform/database/index.js';

export const BILLING_QUEUE = 'billing-queue';

export interface GenerateMonthlyDuesJobData {
  organizationId: string;
  propertyId?: string;
  billingMonth: number;
  billingYear: number;
  userId?: string;
}

export interface ReconcileAutopayJobData {
  organizationId: string;
  propertyId?: string;
  billingMonth?: number;
  billingYear?: number;
}

@Processor(BILLING_QUEUE)
export class BillingProcessor
  extends WorkerHost
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(BillingProcessor.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly prisma: PrismaService,
    @InjectQueue(BILLING_QUEUE)
    private readonly queue: Queue<GenerateMonthlyDuesJobData>,
  ) {
    super();
  }

  async onApplicationBootstrap() {
    await this.queue.upsertJobScheduler(
      'property-rent-daily',
      { pattern: '15 0 * * *', tz: 'Asia/Kolkata' },
      { name: 'schedule-property-rent' },
    );
  }

  private async enqueuePropertyDues(runAt: Date) {
    let after: string | undefined;
    for (;;) {
      const properties: {
        id: string;
        organizationId: string;
        timezone: string;
      }[] = await this.prisma.property.findMany({
        where: {
          status: 'ACTIVE',
          organization: { isActive: true },
          ...(after ? { id: { gt: after } } : {}),
        },
        select: { id: true, organizationId: true, timezone: true },
        orderBy: { id: 'asc' },
        take: 100,
      });
      if (!properties.length) break;
      await this.queue.addBulk(
        properties.map((property) => {
          const date = dateKeyInTimeZone(runAt, property.timezone);
          return {
            name: 'generate-monthly-dues',
            data: {
              organizationId: property.organizationId,
              propertyId: property.id,
              billingYear: Number(date.slice(0, 4)),
              billingMonth: Number(date.slice(5, 7)),
            },
            opts: { jobId: ['rent', property.id, date].join('-') },
          };
        }),
      );
      after = properties.at(-1)!.id;
    }
  }

  async process(
    job: Job<GenerateMonthlyDuesJobData | ReconcileAutopayJobData>,
  ): Promise<unknown> {
    this.logger.log(
      `Processing background billing job: ${job.name} (ID: ${job.id})`,
    );

    switch (job.name) {
      case 'schedule-property-rent':
        return this.enqueuePropertyDues(new Date());
      case 'generate-monthly-dues': {
        const {
          organizationId,
          propertyId,
          billingMonth,
          billingYear,
          userId,
        } = job.data as GenerateMonthlyDuesJobData;
        return this.billingService.generateMonthlyDues(
          { propertyId, billingMonth, billingYear },
          organizationId,
          userId,
        );
      }

      case 'reconcile-monthly-autopay': {
        const data = job.data as ReconcileAutopayJobData;
        const now = new Date();
        const month = data.billingMonth ?? now.getUTCMonth() + 1;
        const year = data.billingYear ?? now.getUTCFullYear();

        // Find all active mandates due for collection
        const activeMandates = await this.prisma.tenantMandate.findMany({
          where: {
            organizationId: data.organizationId,
            status: 'ACTIVE',
            ...(data.propertyId ? { propertyId: data.propertyId } : {}),
          },
          include: { tenant: true, property: true },
        });

        let reconciledCount = 0;
        for (const mandate of activeMandates) {
          const existingInvoice = await this.prisma.rentInvoice.findUnique({
            where: {
              tenantId_billingMonth_billingYear: {
                tenantId: mandate.tenantId,
                billingMonth: month,
                billingYear: year,
              },
            },
          });

          if (!existingInvoice) {
            // Ensure pending invoice exists for tracking
            const invNumber = `INV-${year}${String(month).padStart(2, '0')}-${mandate.tenantId.slice(0, 8).toUpperCase()}`;
            await this.prisma.rentInvoice.create({
              data: {
                organizationId: mandate.organizationId,
                tenantId: mandate.tenantId,
                propertyId: mandate.propertyId,
                unitId: mandate.unitId,
                mandateId: mandate.id,
                invoiceNumber: invNumber,
                billingMonth: month,
                billingYear: year,
                amount: mandate.rentAmount,
                platformFee: 3000,
                transferAmount: Math.max(0, mandate.rentAmount - 3000),
                status: 'PENDING',
                collectionType: 'AUTOPAY',
                dueDate: new Date(
                  Date.UTC(year, month - 1, mandate.billingDay),
                ),
              },
            });
            reconciledCount++;
          }
        }

        this.logger.log(
          `Reconciled autopay mandates for ${month}/${year}: ${reconciledCount} pending invoices created across ${activeMandates.length} active mandates.`,
        );
        return { reconciledCount, totalActiveMandates: activeMandates.length };
      }

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return null;
    }
  }
}
