var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BillingProcessor_1;
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { BillingService } from '../modules/finance/application/billing.service.js';
import { dateKeyInTimeZone } from '../common/time/property-date.js';
import { PrismaService } from '../platform/database/index.js';
export const BILLING_QUEUE = 'billing-queue';
let BillingProcessor = BillingProcessor_1 = class BillingProcessor extends WorkerHost {
    billingService;
    prisma;
    queue;
    logger = new Logger(BillingProcessor_1.name);
    constructor(billingService, prisma, queue) {
        super();
        this.billingService = billingService;
        this.prisma = prisma;
        this.queue = queue;
    }
    async onApplicationBootstrap() {
        await this.queue.upsertJobScheduler('property-rent-daily', { pattern: '15 0 * * *', tz: 'Asia/Kolkata' }, { name: 'schedule-property-rent' });
    }
    async enqueuePropertyDues(runAt) {
        let after;
        for (;;) {
            const properties = await this.prisma.property.findMany({
                where: {
                    status: 'ACTIVE',
                    organization: { isActive: true },
                    ...(after ? { id: { gt: after } } : {}),
                },
                select: { id: true, organizationId: true, timezone: true },
                orderBy: { id: 'asc' },
                take: 100,
            });
            if (!properties.length)
                break;
            await this.queue.addBulk(properties.map((property) => {
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
            }));
            after = properties.at(-1).id;
        }
    }
    async process(job) {
        this.logger.log(`Processing background billing job: ${job.name} (ID: ${job.id})`);
        switch (job.name) {
            case 'schedule-property-rent':
                return this.enqueuePropertyDues(new Date());
            case 'generate-monthly-dues': {
                const { organizationId, propertyId, billingMonth, billingYear, userId, } = job.data;
                return this.billingService.generateMonthlyDues({ propertyId, billingMonth, billingYear }, organizationId, userId);
            }
            case 'reconcile-monthly-autopay': {
                const data = job.data;
                const now = new Date();
                const month = data.billingMonth ?? now.getUTCMonth() + 1;
                const year = data.billingYear ?? now.getUTCFullYear();
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
                                dueDate: new Date(Date.UTC(year, month - 1, mandate.billingDay)),
                            },
                        });
                        reconciledCount++;
                    }
                }
                this.logger.log(`Reconciled autopay mandates for ${month}/${year}: ${reconciledCount} pending invoices created across ${activeMandates.length} active mandates.`);
                return { reconciledCount, totalActiveMandates: activeMandates.length };
            }
            default:
                this.logger.warn(`Unknown job name: ${job.name}`);
                return null;
        }
    }
};
BillingProcessor = BillingProcessor_1 = __decorate([
    Processor(BILLING_QUEUE),
    __param(2, InjectQueue(BILLING_QUEUE)),
    __metadata("design:paramtypes", [BillingService,
        PrismaService, Function])
], BillingProcessor);
export { BillingProcessor };
//# sourceMappingURL=billing.processor.js.map