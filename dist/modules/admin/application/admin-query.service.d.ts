import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/index.js';
import type { AdminAuditQueryDto, AdminAnnouncementsQueryDto, AdminBookingsQueryDto, AdminComplaintsQueryDto, AdminDashboardQueryDto, AdminInventoryQueryDto, AdminOrganizationsQueryDto, AdminPaymentsQueryDto, AdminPayoutsQueryDto, AdminPropertiesQueryDto, AdminResidentsQueryDto, AdminUsersQueryDto } from '../api/dto/admin.dto.js';
export declare class AdminQueryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
            byStatus: (Prisma.PickEnumerable<Prisma.PropertyGroupByOutputType, "status"[]> & {
                _count: number;
            })[];
        };
        inventory: {
            rooms: number;
            bedsByStatus: (Prisma.PickEnumerable<Prisma.BedGroupByOutputType, "status"[]> & {
                _count: number;
            })[];
        };
        residents: {
            byStatus: (Prisma.PickEnumerable<Prisma.ResidentGroupByOutputType, "status"[]> & {
                _count: number;
            })[];
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
            kycByStatus: (Prisma.PickEnumerable<Prisma.LandlordPayoutAccountGroupByOutputType, "kycStatus"[]> & {
                _count: number;
            })[];
        };
        support: {
            complaintsByStatus: (Prisma.PickEnumerable<Prisma.ComplaintGroupByOutputType, "status"[]> & {
                _count: number;
            })[];
            criticalOpenComplaints: number;
            casesByStatus: (Prisma.PickEnumerable<Prisma.AdminCaseGroupByOutputType, "status"[]> & {
                _count: number;
            })[];
            overdueCases: number;
        };
    }>;
    dashboardSnapshot(query: AdminDashboardQueryDto): Promise<{
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
    users(query: AdminUsersQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        platformAdmin: {
            status: import("@prisma/client").$Enums.PlatformAdminStatus;
            role: import("@prisma/client").$Enums.PlatformRole;
        } | null;
        id: string;
        email: string | null;
        mobile: string | null;
        firstName: string;
        lastName: string | null;
        emailVerified: boolean;
        mobileVerified: boolean;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        memberships: {
            organization: {
                id: string;
                name: string;
                isActive: boolean;
            };
            id: string;
            role: import("@prisma/client").$Enums.OrgRole;
            isActive: boolean;
        }[];
    }>>;
    user(id: string): Promise<{
        platformAdmin: {
            id: string;
            status: import("@prisma/client").$Enums.PlatformAdminStatus;
            role: import("@prisma/client").$Enums.PlatformRole;
            permissionOverrides: string[];
        } | null;
        id: string;
        email: string | null;
        mobile: string | null;
        firstName: string;
        lastName: string | null;
        emailVerified: boolean;
        mobileVerified: boolean;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        memberships: ({
            organization: {
                id: string;
                name: string;
                isActive: boolean;
                slug: string;
            };
        } & {
            id: string;
            role: import("@prisma/client").$Enums.OrgRole;
            isActive: boolean;
            updatedAt: Date;
            userId: string;
            organizationId: string;
            joinedAt: Date;
        })[];
        payoutAccounts: {
            id: string;
            status: import("@prisma/client").$Enums.PayoutAccountStatus;
            kycStatus: import("@prisma/client").$Enums.KycStatus;
            businessName: string;
            accountNumberMasked: string;
        }[];
    }>;
    organizations(query: AdminOrganizationsQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        _count: {
            payoutAccounts: number;
            members: number;
            properties: number;
            mandates: number;
        };
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
    }>>;
    organization(id: string): Promise<{
        metrics: {
            activeResidents: number;
            collectedPaise: number;
            outstandingPaise: number;
        };
        _count: {
            payoutAccounts: number;
            members: number;
            properties: number;
            mandates: number;
            rentInvoices: number;
        };
        members: {
            user: {
                id: string;
                email: string | null;
                mobile: string | null;
                firstName: string;
                lastName: string | null;
            };
            id: string;
            role: import("@prisma/client").$Enums.OrgRole;
            isActive: boolean;
        }[];
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
    }>;
    properties(query: AdminPropertiesQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        organization: {
            id: string;
            name: string;
            isActive: boolean;
        };
        _count: {
            staff: number;
            rooms: number;
            residents: number;
            complaints: number;
        };
    } & {
        id: string;
        type: import("@prisma/client").$Enums.PropertyType;
        status: import("@prisma/client").$Enums.PropertyStatus;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        description: string | null;
        addressLine1: string;
        addressLine2: string | null;
        city: string;
        state: string;
        pincode: string;
        country: string;
        ownerName: string | null;
        contactPhone: string | null;
        contactEmail: string | null;
        timezone: string;
        rentDueDay: number;
        amenities: string[];
        totalFloors: number | null;
    }>>;
    property(id: string): Promise<{
        metrics: {
            bedsByStatus: (Prisma.PickEnumerable<Prisma.BedGroupByOutputType, "status"[]> & {
                _count: number;
            })[];
            activeResidents: number;
            collectedPaise: number;
            expensesPaise: number;
            openComplaints: number;
        };
        organization: {
            id: string;
            name: string;
            isActive: boolean;
            slug: string;
        };
        _count: {
            staff: number;
            rooms: number;
            residents: number;
            expenses: number;
            complaints: number;
            bookings: number;
        };
        id: string;
        type: import("@prisma/client").$Enums.PropertyType;
        status: import("@prisma/client").$Enums.PropertyStatus;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        description: string | null;
        addressLine1: string;
        addressLine2: string | null;
        city: string;
        state: string;
        pincode: string;
        country: string;
        ownerName: string | null;
        contactPhone: string | null;
        contactEmail: string | null;
        timezone: string;
        rentDueDay: number;
        amenities: string[];
        totalFloors: number | null;
    }>;
    rooms(query: AdminInventoryQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        property: {
            organization: {
                id: string;
                name: string;
            };
            id: string;
            name: string;
        };
        _count: {
            residents: number;
            beds: number;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.RoomStatus;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        description: string | null;
        amenities: string[];
        propertyId: string;
        roomNumber: string;
        floor: string;
        sharingType: import("@prisma/client").$Enums.SharingType;
        rentAmount: number;
        availableFrom: Date | null;
        unitType: string;
        gender: string;
        remarks: string | null;
        lockInPeriod: string | null;
        dailyStayMinPaise: number | null;
        dailyStayMaxPaise: number | null;
        areaSqft: number | null;
        isDisabledForRent: boolean;
        isPublished: boolean;
        images: string[];
        isVerified: boolean;
    }>>;
    beds(query: AdminInventoryQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        room: {
            property: {
                organization: {
                    id: string;
                    name: string;
                };
                id: string;
                name: string;
            };
            id: string;
            roomNumber: string;
        };
        residents: {
            id: string;
            status: import("@prisma/client").$Enums.ResidentStatus;
            firstName: string;
            lastName: string | null;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.BedStatus;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        rentAmount: number | null;
        remarks: string | null;
        isDisabledForRent: boolean;
        roomId: string;
        bedNumber: string;
    }>>;
    residents(query: AdminResidentsQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        property: {
            id: string;
            name: string;
        };
        room: {
            id: string;
            roomNumber: string;
        } | null;
        bed: {
            id: string;
            bedNumber: string;
        } | null;
        _count: {
            billingRecords: number;
            payments: number;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.ResidentStatus;
        email: string | null;
        mobile: string;
        firstName: string;
        lastName: string | null;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        rentDueDay: number | null;
        propertyId: string;
        roomId: string | null;
        bedId: string | null;
        whatsappNumber: string | null;
        alternatePhone: string | null;
        sendWhatsappReminder: boolean;
        emergencyContact: string | null;
        permanentAddress: string | null;
        parentName: string | null;
        parentPhone: string | null;
        idProofUrl: string | null;
        agreementUrl: string | null;
        profession: import("@prisma/client").$Enums.Profession;
        stayType: string;
        tenantType: string;
        noticePeriodDays: number | null;
        agreementPeriodMonths: number | null;
        monthlyRent: number;
        rentalFrequencyMonths: number;
        skipFirstRent: boolean;
        securityDeposit: number;
        joiningDate: Date;
        moveInDate: Date | null;
        moveOutDate: Date | null;
        expectedVacatingDate: Date | null;
        lockInEndDate: Date | null;
        notes: string | null;
        version: number;
    }>>;
    bookings(query: AdminBookingsQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        property: {
            id: string;
            name: string;
        };
        bed: {
            room: {
                id: string;
                roomNumber: string;
            };
            id: string;
            bedNumber: string;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        roomId: string | null;
        bedId: string | null;
        notes: string | null;
        guestName: string;
        guestMobile: string;
        guestEmail: string | null;
        tokenAmount: number;
        expectedMoveIn: Date;
        expiryDate: Date | null;
        paymentMode: import("@prisma/client").$Enums.PaymentMode;
        paymentRef: string | null;
    }>>;
    complaints(query: AdminComplaintsQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        property: {
            id: string;
            name: string;
        };
        room: {
            id: string;
            roomNumber: string;
        } | null;
        _count: {
            comments: number;
            history: number;
        };
        category: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.ComplaintStatus;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string;
        organizationId: string;
        description: string;
        propertyId: string;
        roomId: string | null;
        categoryId: string;
        location: string | null;
        urgency: import("@prisma/client").$Enums.ComplaintUrgency;
        assignedTo: string | null;
        resolution: string | null;
        resolvedAt: Date | null;
    }>>;
    complaint(id: string): Promise<{
        property: {
            id: string;
            name: string;
            organizationId: string;
        };
        room: {
            id: string;
            roomNumber: string;
        } | null;
        category: {
            id: string;
            name: string;
        };
        comments: {
            id: string;
            createdAt: Date;
            content: string;
            authorId: string;
            complaintId: string;
        }[];
        history: {
            id: string;
            createdAt: Date;
            notes: string | null;
            complaintId: string;
            fromStatus: import("@prisma/client").$Enums.ComplaintStatus;
            toStatus: import("@prisma/client").$Enums.ComplaintStatus;
            changedBy: string;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.ComplaintStatus;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string;
        organizationId: string;
        description: string;
        propertyId: string;
        roomId: string | null;
        categoryId: string;
        location: string | null;
        urgency: import("@prisma/client").$Enums.ComplaintUrgency;
        assignedTo: string | null;
        resolution: string | null;
        resolvedAt: Date | null;
    }>;
    announcements(query: AdminAnnouncementsQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        organization: {
            id: string;
            name: string;
        };
        property: {
            id: string;
            name: string;
        } | null;
        id: string;
        status: import("@prisma/client").$Enums.AnnouncementStatus;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string;
        organizationId: string;
        propertyId: string | null;
        body: string;
        scope: import("@prisma/client").$Enums.AnnouncementScope;
        title: string;
        scheduledAt: Date | null;
        sentAt: Date | null;
    }>>;
    payments(query: AdminPaymentsQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        resident: {
            property: {
                id: string;
                name: string;
            };
            id: string;
            mobile: string;
            firstName: string;
            lastName: string | null;
        };
        billingRecord: {
            id: string;
            type: import("@prisma/client").$Enums.BillingType;
            status: import("@prisma/client").$Enums.BillingStatus;
            amount: number;
            paidAmount: number;
        } | null;
        id: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        mode: import("@prisma/client").$Enums.PaymentMode;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        version: number;
        amount: number;
        collectionDate: Date;
        reference: string | null;
        proofUrl: string | null;
        razorpayOrderId: string | null;
        razorpayPaymentId: string | null;
        recordedBy: string | null;
    }>>;
    payment(id: string): Promise<{
        resident: {
            property: {
                id: string;
                name: string;
            };
            room: {
                id: string;
                roomNumber: string;
            } | null;
            bed: {
                id: string;
                bedNumber: string;
            } | null;
            id: string;
            mobile: string;
            firstName: string;
            lastName: string | null;
        };
        billingRecord: {
            id: string;
            type: import("@prisma/client").$Enums.BillingType;
            status: import("@prisma/client").$Enums.BillingStatus;
            createdAt: Date;
            updatedAt: Date;
            organizationId: string;
            description: string | null;
            propertyId: string;
            version: number;
            residentId: string;
            attachmentUrls: string[];
            amount: number;
            paidAmount: number;
            lateFeeAmount: number;
            discountAmount: number;
            billingMonth: number | null;
            billingYear: number | null;
            dueDate: Date;
            periodStart: Date | null;
            periodEnd: Date | null;
            idempotencyKey: string | null;
        } | null;
        id: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        mode: import("@prisma/client").$Enums.PaymentMode;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        notes: string | null;
        version: number;
        amount: number;
        idempotencyKey: string | null;
        collectionDate: Date;
        reference: string | null;
        proofUrl: string | null;
        razorpayOrderId: string | null;
        razorpayPaymentId: string | null;
        recordedBy: string | null;
    }>;
    payouts(query: AdminPayoutsQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        user: {
            id: string;
            email: string | null;
            firstName: string;
            lastName: string | null;
        };
        organization: {
            id: string;
            name: string;
        };
        property: {
            id: string;
            name: string;
        } | null;
        id: string;
        status: import("@prisma/client").$Enums.PayoutAccountStatus;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        phone: string;
        propertyId: string | null;
        kycStatus: import("@prisma/client").$Enums.KycStatus;
        businessName: string;
        businessType: string;
        ifscCode: string;
        beneficiaryName: string;
        accountNumberMasked: string;
        razorpayAccountId: string;
    }>>;
    ledger(query: AdminPaymentsQueryDto): Promise<{
        totals: {
            grossPaise: number;
            platformFeesPaise: number;
            ownerTransfersPaise: number;
        };
        data: {
            property: {
                id: string;
                name: string;
            };
            id: string;
            status: import("@prisma/client").$Enums.RentInvoiceStatus;
            createdAt: Date;
            organizationId: string;
            amount: number;
            billingMonth: number;
            billingYear: number;
            dueDate: Date;
            failureReason: string | null;
            tenant: {
                id: string;
                firstName: string;
                lastName: string | null;
            };
            razorpayPaymentId: string | null;
            invoiceNumber: string;
            platformFee: number;
            transferAmount: number;
            collectionType: import("@prisma/client").$Enums.RentCollectionType;
            paidAt: Date | null;
            razorpayTransferId: string | null;
        }[];
        meta: {
            total: number;
            limit: number;
            hasMore: boolean;
            nextCursor?: string;
            page?: number;
            totalPages?: number;
        };
    }>;
    pendingTransactions(organizationId?: string): Promise<{
        summary: {
            pendingPayments: number;
            pendingPaymentAmountPaise: number;
            pendingInvoices: number;
            pendingPayoutAccounts: number;
            truncated: boolean;
        };
        payments: {
            resident: {
                id: string;
                firstName: string;
                lastName: string | null;
            };
            id: string;
            status: import("@prisma/client").$Enums.PaymentStatus;
            mode: import("@prisma/client").$Enums.PaymentMode;
            createdAt: Date;
            organizationId: string;
            amount: number;
            reference: string | null;
        }[];
        invoices: {
            id: string;
            status: import("@prisma/client").$Enums.RentInvoiceStatus;
            createdAt: Date;
            organizationId: string;
            amount: number;
            dueDate: Date;
            failureReason: string | null;
            retryCount: number;
            invoiceNumber: string;
            platformFee: number;
            transferAmount: number;
        }[];
        payoutAccounts: {
            id: string;
            status: import("@prisma/client").$Enums.PayoutAccountStatus;
            createdAt: Date;
            organizationId: string;
            kycStatus: import("@prisma/client").$Enums.KycStatus;
            businessName: string;
            accountNumberMasked: string;
        }[];
    }>;
    auditLogs(query: AdminAuditQueryDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        user: {
            id: string;
            email: string | null;
            firstName: string;
            lastName: string | null;
        } | null;
        organization: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        organizationId: string | null;
        metadata: Prisma.JsonValue | null;
        userAgent: string | null;
        ipAddress: string | null;
        action: string;
        entityType: string | null;
        entityId: string | null;
    }>>;
    platformReport(query: AdminDashboardQueryDto & {
        page?: number;
        limit?: number;
    }): Promise<{
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
    platformReportCsv(query: AdminDashboardQueryDto): Promise<string>;
}
