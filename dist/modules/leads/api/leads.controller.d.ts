import { LeadsService } from '../application/leads.service.js';
import { type CreateLeadDto, type UpdateLeadDto, type QueryLeadsDto, type LeadStatsQueryDto } from './dto/lead.dto.js';
export declare class LeadsController {
    private readonly leadsService;
    constructor(leadsService: LeadsService);
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
    findAll(query: QueryLeadsDto, orgId: string): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
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
    stats(query: LeadStatsQueryDto, orgId: string): Promise<{
        total: number;
        byStatus: {
            [k: string]: number;
        };
        conversionRate: number;
    }>;
    findOne(id: string, orgId: string): Promise<{
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
