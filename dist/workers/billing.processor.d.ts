import { WorkerHost } from '@nestjs/bullmq';
import { type OnApplicationBootstrap } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { BillingService } from '../modules/finance/application/billing.service.js';
import { PrismaService } from '../platform/database/index.js';
export declare const BILLING_QUEUE = "billing-queue";
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
export declare class BillingProcessor extends WorkerHost implements OnApplicationBootstrap {
    private readonly billingService;
    private readonly prisma;
    private readonly queue;
    private readonly logger;
    constructor(billingService: BillingService, prisma: PrismaService, queue: Queue<GenerateMonthlyDuesJobData>);
    onApplicationBootstrap(): Promise<void>;
    private enqueuePropertyDues;
    process(job: Job<GenerateMonthlyDuesJobData | ReconcileAutopayJobData>): Promise<unknown>;
}
