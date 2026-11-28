import { PropertiesService } from '../application/properties.service.js';
import { type CreatePropertyDto, type UpdatePropertyDto, type QueryPropertiesDto } from './dto/property.dto.js';
export declare class PropertiesController {
    private readonly propertiesService;
    constructor(propertiesService: PropertiesService);
    create(dto: CreatePropertyDto, orgId: string, userId: string): Promise<{
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
    findAll(query: QueryPropertiesDto, orgId: string): Promise<any>;
    findOne(id: string, orgId: string): Promise<{
        stats: {
            totalRooms: number;
            totalBeds: number;
            occupiedBeds: number;
            availableBeds: number;
            occupancyRate: number;
            activeResidents: number;
            activeStaff: number;
            pendingComplaints: number;
        };
        _count: undefined;
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
    update(id: string, dto: UpdatePropertyDto, orgId: string, userId: string): Promise<{
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
    archive(id: string, orgId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getOccupancyMap(id: string, orgId: string): Promise<{
        property: {
            id: string;
            name: string;
            type: import("@prisma/client").$Enums.PropertyType;
        };
        summary: {
            totalRooms: number;
            totalBeds: number;
            occupiedBeds: number;
            availableBeds: number;
            occupancyRate: number;
        };
        floors: {
            floor: string;
            rooms: {
                id: string;
                roomNumber: string;
                sharingType: import("@prisma/client").$Enums.SharingType;
                rentAmount: number;
                status: import("@prisma/client").$Enums.RoomStatus;
                amenities: string[];
                beds: {
                    id: string;
                    bedNumber: string;
                    status: "ARCHIVED" | "UNDER_MAINTENANCE" | "AVAILABLE" | "OCCUPIED";
                    rentAmount: number;
                    resident: {
                        id: string;
                        status: import("@prisma/client").$Enums.ResidentStatus;
                        mobile: string;
                        firstName: string;
                        lastName: string | null;
                        monthlyRent: number;
                        joiningDate: Date;
                    };
                }[];
            }[];
        }[];
    }>;
}
