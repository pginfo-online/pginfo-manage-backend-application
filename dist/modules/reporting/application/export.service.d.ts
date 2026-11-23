import { PrismaService } from '../../../platform/database/index.js';
export declare class ExportService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private toCsv;
    exportCollectionsCsv(orgId: string, propertyId?: string): Promise<string>;
    exportResidentsCsv(orgId: string, propertyId?: string): Promise<string>;
    exportExpensesCsv(orgId: string, propertyId?: string): Promise<string>;
}
