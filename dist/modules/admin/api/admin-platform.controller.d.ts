import type { Request } from 'express';
import type { PlatformAdminContext } from '../domain/admin-permissions.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import { AdminCommandService } from '../application/admin-command.service.js';
import { type AdminAnnouncementsQueryDto, type AdminBookingsQueryDto, type AdminComplaintsQueryDto, type AdminInventoryQueryDto, type AdminOrganizationsQueryDto, type AdminPropertiesQueryDto, type AdminResidentsQueryDto, type UpdateBedStatusDto, type UpdateOrganizationStatusDto, type UpdatePropertyStatusDto, type UpdateRoomStatusDto } from './dto/admin.dto.js';
export declare class AdminPlatformController {
    private readonly queryService;
    private readonly commands;
    constructor(queryService: AdminQueryService, commands: AdminCommandService);
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
    updateOrganizationStatus(id: string, dto: UpdateOrganizationStatusDto, actor: PlatformAdminContext, request: Request): Promise<{
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
            bedsByStatus: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.BedGroupByOutputType, "status"[]> & {
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
    updatePropertyStatus(id: string, dto: UpdatePropertyStatusDto, actor: PlatformAdminContext, request: Request): Promise<{
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
    updateRoomStatus(id: string, dto: UpdateRoomStatusDto, actor: PlatformAdminContext, request: Request): Promise<{
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
    }>;
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
    updateBedStatus(id: string, dto: UpdateBedStatusDto, actor: PlatformAdminContext, request: Request): Promise<{
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
    }>;
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
}
