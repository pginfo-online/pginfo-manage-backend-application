import type { Response } from 'express';
import { AdminQueryService } from '../application/admin-query.service.js';
import { AdminAuditService } from '../application/admin-audit.service.js';
import type { PlatformAdminContext } from '../domain/admin-permissions.js';
import { type AdminPortfolioQueryDto, type AdminDashboardQueryDto } from './dto/admin.dto.js';
import type { Request } from 'express';
export declare class AdminDashboardController {
    private readonly queryService;
    private readonly audit;
    constructor(queryService: AdminQueryService, audit: AdminAuditService);
    dashboard(query: AdminDashboardQueryDto): Promise<{
        period: {
            from: Date;
            to: Date;
        };
        users: {
            total: number;
            active: number;
            new: number;
        };
        organizations: {
            total: number;
            active: number;
        };
        properties: {
            total: number;
            byStatus: {
                status: string;
                _count: number;
            }[];
        };
        inventory: {
            rooms: number;
            bedsByStatus: {
                status: string;
                _count: number;
            }[];
        };
        residents: {
            byStatus: {
                status: string;
                _count: number;
            }[];
        };
        finance: {
            collectedPaise: number;
            collections: number;
            pendingPaise: number;
            pendingPayments: number;
            disputedPayments: number;
            expensesPaise: number;
            expenses: number;
            grossRentPaise: number;
            platformFeesPaise: number;
            ownerTransfersPaise: number;
            invoices: number;
        };
        banks: {
            kycByStatus: {
                status: string;
                _count: number;
            }[];
        };
        support: {
            complaintsByStatus: {
                status: string;
                _count: number;
            }[];
            criticalOpenComplaints: number;
            casesByStatus: {
                status: string;
                _count: number;
            }[];
            overdueCases: number;
        };
    }>;
    portfolioReport(query: AdminPortfolioQueryDto): Promise<{
        organizations: {
            properties: number;
            residents: number;
            collections: number;
            collectedPaise: number;
            expensesPaise: number;
            outstandingPaise: number;
            id: string;
            name: string;
            isActive: boolean;
            slug: string;
        }[];
        meta?: {
            total: number;
            limit: number;
            hasMore: boolean;
            nextCursor?: string;
            page?: number;
            totalPages?: number;
        } | undefined;
        period: {
            from: Date;
            to: Date;
        };
    }>;
    portfolioReportCsv(query: AdminDashboardQueryDto, response: Response, actor: PlatformAdminContext, request: Request): Promise<string>;
}
