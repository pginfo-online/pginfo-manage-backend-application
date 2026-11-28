import { DashboardService } from '../application/dashboard.service.js';
import { type DashboardQueryDto, type DashboardPropertiesQueryDto } from './dto/dashboard.dto.js';
import { type ActivityQueryDto } from './dto/activity.dto.js';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
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
    getMetrics(orgId: string, query: DashboardQueryDto): Promise<{
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
            reservedBeds: number;
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
    getOverview(orgId: string, query: DashboardQueryDto): Promise<{
        properties: {
            id: string;
            name: string;
            type: import("@prisma/client").$Enums.PropertyType;
            city: string;
            code: string;
            totalBeds: number;
            occupiedBeds: number;
            vacantBeds: number;
            activeTenants: number;
            underEvictionCount: number;
            currentBookings: number;
            pendingDuesPaise: number;
            monthCollectedPaise: number;
        }[];
        pendingTasks: {
            tenantsWithoutIdProof: number;
            tenantsWithoutAgreement: number;
            tenantsWithoutEmail: number;
            pendingComplaints: number;
            rentDefaulters: number;
        };
        occupancyBreakdown: {
            units: {
                total: number;
                occupied: number;
                vacant: number;
                semiVacant: number;
                occupancyRate: number;
                underNotice: number;
                underNoticeWithBooking: number;
                overbooked: number;
            };
            beds: {
                total: number;
                occupied: number;
                vacant: number;
                reserved: number;
                occupancyRate: number;
                underNotice: number;
                underNoticeWithBooking: number;
                overbooked: number;
            };
        };
        journey: {
            leads: {
                total: number;
                newCount: number;
                contacted: number;
                visited: number;
                tokenPaid: number;
                converted: number;
                lost: number;
            };
            bookings: {
                total: number;
                confirmed: number;
                checkedIn: number;
                cancelled: number;
                expired: number;
            };
            tenants: {
                total: number;
                active: number;
                noticeRaised: number;
                confirmedEviction: number;
                renewalsDue: number;
            };
        };
        issuesOverview: {
            totalOpen: number;
            byCategory: {
                label: string;
                count: number;
            }[];
            byStatus: {
                label: string;
                count: number;
            }[];
            byAssignee: {
                label: string;
                count: number;
            }[];
        };
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
            reservedBeds: number;
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
    getActivity(orgId: string, query: ActivityQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<Record<string, unknown>> | import("../../../common/pagination/index.js").PaginatedResponse<{
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        action: string;
    }>>;
}
