import { StaffService } from '../application/staff.service.js';
import { type CreateStaffDto, type UpdateStaffDto, type CreateStaffDesignationDto, type QueryStaffDto } from './dto/staff.dto.js';
export declare class StaffController {
    private readonly staffService;
    constructor(staffService: StaffService);
    create(dto: CreateStaffDto, orgId: string, userId: string): Promise<{
        salaryFormatted: string | null;
        property: {
            id: string;
            name: string;
        };
        designation: {
            id: string;
            name: string;
        };
        id: string;
        status: import("@prisma/client").$Enums.StaffStatus;
        email: string | null;
        mobile: string;
        firstName: string;
        lastName: string | null;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        joiningDate: Date | null;
        notes: string | null;
        designationId: string;
        salary: number | null;
        exitDate: Date | null;
    }>;
    findAll(query: QueryStaffDto, orgId: string): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        salaryFormatted: string | null;
        property: {
            id: string;
            name: string;
        };
        designation: {
            id: string;
            name: string;
        };
        id: string;
        status: import("@prisma/client").$Enums.StaffStatus;
        email: string | null;
        mobile: string;
        firstName: string;
        lastName: string | null;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        joiningDate: Date | null;
        notes: string | null;
        designationId: string;
        salary: number | null;
        exitDate: Date | null;
    }>>;
    getDesignations(orgId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        organizationId: string;
        isSystem: boolean;
    }[]>;
    createDesignation(dto: CreateStaffDesignationDto, orgId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        organizationId: string;
        isSystem: boolean;
    }>;
    findOne(id: string, orgId: string): Promise<{
        salaryFormatted: string | null;
        property: {
            id: string;
            name: string;
            addressLine1: string;
            city: string;
        };
        designation: {
            id: string;
            name: string;
        };
        id: string;
        status: import("@prisma/client").$Enums.StaffStatus;
        email: string | null;
        mobile: string;
        firstName: string;
        lastName: string | null;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        joiningDate: Date | null;
        notes: string | null;
        designationId: string;
        salary: number | null;
        exitDate: Date | null;
    }>;
    update(id: string, dto: UpdateStaffDto, orgId: string, userId: string): Promise<{
        salaryFormatted: string | null;
        property: {
            id: string;
            name: string;
        };
        designation: {
            id: string;
            name: string;
        };
        id: string;
        status: import("@prisma/client").$Enums.StaffStatus;
        email: string | null;
        mobile: string;
        firstName: string;
        lastName: string | null;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        joiningDate: Date | null;
        notes: string | null;
        designationId: string;
        salary: number | null;
        exitDate: Date | null;
    }>;
    deactivate(id: string, orgId: string, userId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.StaffStatus;
        email: string | null;
        mobile: string;
        firstName: string;
        lastName: string | null;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        joiningDate: Date | null;
        notes: string | null;
        designationId: string;
        salary: number | null;
        exitDate: Date | null;
    }>;
}
