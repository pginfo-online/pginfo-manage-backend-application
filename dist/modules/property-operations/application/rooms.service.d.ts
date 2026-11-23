import { PrismaService } from '../../../platform/database/index.js';
import type { Redis } from 'ioredis';
import type { CreateRoomDto, UpdateRoomDto, CreateBedDto, UpdateBedDto, QueryRoomsDto } from '../api/dto/room.dto.js';
export declare class RoomsService {
    private readonly prisma;
    private readonly redis?;
    private readonly logger;
    constructor(prisma: PrismaService, redis?: Redis | undefined);
    private getCached;
    private setCached;
    invalidateRoomCache(propertyId: string): Promise<void>;
    private logAudit;
    create(propertyId: string, dto: CreateRoomDto, orgId: string, userId: string): Promise<{
        beds: {
            id: string;
            status: import("@prisma/client").$Enums.BedStatus;
            rentAmount: number | null;
            bedNumber: string;
        }[];
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
    }>;
    findAll(propertyId: string, orgId: string, query?: QueryRoomsDto): Promise<any>;
    findById(id: string, orgId: string): Promise<{
        property: {
            id: string;
            type: import("@prisma/client").$Enums.PropertyType;
            name: string;
            timezone: string;
        };
        beds: ({
            residents: {
                id: string;
                status: import("@prisma/client").$Enums.ResidentStatus;
                mobile: string;
                firstName: string;
                lastName: string | null;
                monthlyRent: number;
                joiningDate: Date;
            }[];
            bookings: {
                id: string;
                status: import("@prisma/client").$Enums.BookingStatus;
                guestName: string;
                guestMobile: string;
                expectedMoveIn: Date;
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
        })[];
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
    }>;
    update(id: string, dto: UpdateRoomDto, orgId: string, userId: string): Promise<{
        beds: {
            id: string;
            status: import("@prisma/client").$Enums.BedStatus;
            bedNumber: string;
        }[];
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
    }>;
    archive(id: string, orgId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    addBed(roomId: string, dto: CreateBedDto, orgId: string, userId: string): Promise<{
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
    updateBed(bedId: string, dto: UpdateBedDto, orgId: string, userId: string): Promise<{
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
    archiveBed(bedId: string, orgId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    toggleDisableRent(id: string, orgId: string, userId: string): Promise<{
        beds: {
            id: string;
            status: import("@prisma/client").$Enums.BedStatus;
            bedNumber: string;
        }[];
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
    }>;
    togglePublish(id: string, orgId: string, userId: string): Promise<{
        beds: {
            id: string;
            status: import("@prisma/client").$Enums.BedStatus;
            bedNumber: string;
        }[];
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
    }>;
    getInventoryStats(propertyId: string, orgId: string): Promise<any>;
}
