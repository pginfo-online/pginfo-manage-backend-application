import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/index.js';
import type { ActivityQueryDto } from '../api/dto/activity.dto.js';
import type { DashboardPropertiesQueryDto } from '../api/dto/dashboard.dto.js';
export declare class DashboardService {
    private readonly prisma;
    private readonly logger;
    private readonly metricsCache;
    constructor(prisma: PrismaService);
    getProperties(orgId: string, query: DashboardPropertiesQueryDto): Promise<{
        items: {
            id: string;
            type: import("@prisma/client").$Enums.PropertyType;
            name: string;
        }[];
        hasMore: boolean;
    }>;
    getPropertyLabel(orgId: string, id: string): Promise<{
        id: string;
        name: string;
    }>;
    getActivity(orgId: string, query: ActivityQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<Record<string, unknown>> | import("../../../common/pagination/index.js").PaginatedResponse<{
        id: string;
        createdAt: Date;
        metadata: Prisma.JsonValue;
        action: string;
    }>>;
    getMetrics(orgId: string, propertyId?: string, month?: number, year?: number, fy?: boolean): Promise<{
        period: {
            month: number;
            year: number;
            fy: boolean;
        };
        operational: {
            totalProperties: number;
            totalRooms: number;
            totalBeds: number;
            occupiedBeds: number;
            availableBeds: number;
            occupancyRate: number;
            currentResidents: number;
            upcomingMoveIns: number;
            periodMoveIns: number;
            periodMoveOuts: number;
            pendingComplaints: number;
            periodComplaintsCreated: number;
            periodComplaintsResolved: number;
            activeTenants: number;
            noticePeriodTenants: number;
            currentBookings: number;
            approvedBookings: number;
            activeLeads: number;
            rentDefaulters: number;
            residentsWithIdProof: number;
            complaintAgeing: {
                under7Days: number;
                days7To30: number;
                over30Days: number;
            };
        };
        financial: {
            collectionBreakdown: {
                dimension: string;
                label: string;
                amountPaise: number;
            }[];
            todayCollectedPaise: number;
            todayCollectedFormatted: string;
            monthCollectedPaise: number;
            monthCollectedFormatted: string;
            monthBilledPaise: number;
            monthBilledFormatted: string;
            monthOutstandingPaise: number;
            monthOutstandingFormatted: string;
            totalBilledPaise: number;
            totalBilledFormatted: string;
            totalCollectedPaise: number;
            totalCollectedFormatted: string;
            outstandingBalancePaise: number;
            outstandingBalanceFormatted: string;
            totalExpensesPaise: number;
            totalExpensesFormatted: string;
            monthExpensesPaise: number;
            monthExpensesFormatted: string;
            netCashflowPaise: number;
            netCashflowFormatted: string;
            securityDepositsHeldPaise: number;
            securityDepositsHeldFormatted: string;
            pendingDepositsPaise: number;
            pendingDepositsFormatted: string;
            currentDuesPaise: number;
            currentDuesFormatted: string;
            futureDuesPaise: number;
            futureDuesFormatted: string;
            overdueDuesPaise: number;
            weekDuesPaise: number;
            pastDuesPaise: number;
            potentialRentPaise: number;
            todayDuesPaise: number;
            monthProfitPaise: number;
        };
    }>;
    private computeMetrics;
}
