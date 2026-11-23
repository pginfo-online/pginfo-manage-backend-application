import { ComplaintsService } from '../application/complaints.service.js';
import { type CreateComplaintDto, type UpdateComplaintStatusDto, type AssignComplaintDto, type AddCommentDto, type CreateComplaintCategoryDto, type QueryComplaintsDto } from './dto/complaint.dto.js';
export declare class ComplaintsController {
    private readonly complaintsService;
    constructor(complaintsService: ComplaintsService);
    create(dto: CreateComplaintDto, orgId: string, userId: string): Promise<{
        property: {
            name: string;
        };
        room: {
            roomNumber: string;
        } | null;
        category: {
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
    }>;
    findAll(query: QueryComplaintsDto, orgId: string): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        commentCount: number;
        _count: undefined;
        property: {
            id: string;
            name: string;
        };
        room: {
            id: string;
            roomNumber: string;
        } | null;
        category: {
            id: string;
            name: string;
        };
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
    getCategories(orgId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        organizationId: string;
        isSystem: boolean;
    }[]>;
    createCategory(dto: CreateComplaintCategoryDto, orgId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        organizationId: string;
        isSystem: boolean;
    }>;
    findOne(id: string, orgId: string): Promise<{
        property: {
            id: string;
            name: string;
        };
        room: {
            id: string;
            roomNumber: string;
            floor: string;
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
    updateStatus(id: string, dto: UpdateComplaintStatusDto, orgId: string, userId: string): Promise<{
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
    assign(id: string, dto: AssignComplaintDto, orgId: string, userId: string): Promise<{
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
    addComment(id: string, dto: AddCommentDto, orgId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        content: string;
        authorId: string;
        complaintId: string;
    }>;
}
