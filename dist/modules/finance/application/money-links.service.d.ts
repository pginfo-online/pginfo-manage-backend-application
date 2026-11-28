import { PrismaService } from '../../../platform/database/index.js';
import { RazorpayAdapter } from '../infrastructure/razorpay.adapter.js';
import { MoneyService } from './money.service.js';
export declare class MoneyLinksService {
    private readonly prisma;
    private readonly gateway;
    private readonly money;
    constructor(prisma: PrismaService, gateway: RazorpayAdapter, money: MoneyService);
    create(residentId: string, org: string, user?: string): Promise<{
        paymentLink: string;
        amount: number;
        expiresAt: Date | null;
    }>;
    create(residentId: string, org: string, user: string, kind: 'qr'): Promise<{
        qrImageUrl: string;
        amount: number;
        expiresAt: Date | null;
    }>;
}
