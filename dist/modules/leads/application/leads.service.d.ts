import { PrismaService } from '../../../platform/database/index.js';
import type { CreateLeadDto, UpdateLeadDto, QueryLeadsDto } from '../api/dto/lead.dto.js';
export declare class LeadsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(dto: CreateLeadDto, orgId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.LeadStatus;
        name: string;
        email: string | null;
        mobile: string;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        notes: string | null;
        budget: number | null;
        sharingPreference: string | null;
        source: string | null;
        visitScheduledAt: Date | null;
    }>;
    findAll(orgId: string, query: QueryLeadsDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        id: string;
        status: import("@prisma/client").$Enums.LeadStatus;
        name: string;
        email: string | null;
        mobile: string;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        notes: string | null;
        budget: number | null;
        sharingPreference: string | null;
        source: string | null;
        visitScheduledAt: Date | null;
    }>>;
    findById(id: string, orgId: string): Promise<{
        property: {
            id: string;
            name: string;
            city: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.LeadStatus;
        name: string;
        email: string | null;
        mobile: string;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        notes: string | null;
        budget: number | null;
        sharingPreference: string | null;
        source: string | null;
        visitScheduledAt: Date | null;
    }>;
    stats(orgId: string, propertyId?: string): Promise<{
        total: number;
        byStatus: {
            [k: string]: number;
        };
        conversionRate: number;
    }>;
    update(id: string, dto: UpdateLeadDto, orgId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.LeadStatus;
        name: string;
        email: string | null;
        mobile: string;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        notes: string | null;
        budget: number | null;
        sharingPreference: string | null;
        source: string | null;
        visitScheduledAt: Date | null;
    }>;
    delete(id: string, orgId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
