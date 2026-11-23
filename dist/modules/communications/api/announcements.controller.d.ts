import { AnnouncementsService } from '../application/announcements.service.js';
import { type CreateAnnouncementDto, type SendRentReminderDto, type QueryAnnouncementsDto } from './dto/announcement.dto.js';
export declare class AnnouncementsController {
    private readonly announcementsService;
    constructor(announcementsService: AnnouncementsService);
    create(dto: CreateAnnouncementDto, orgId: string, userId: string): Promise<{
        property: {
            id: string;
            name: string;
        } | null;
    } & {
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
    }>;
    findAll(query: QueryAnnouncementsDto, orgId: string): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        property: {
            id: string;
            name: string;
        } | null;
    } & {
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
    whatsappReminderHistory(residentId: string, orgId: string): Promise<unknown>;
    findOne(id: string, orgId: string): Promise<{
        property: {
            id: string;
            name: string;
        } | null;
    } & {
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
    }>;
    send(id: string, orgId: string, userId: string): Promise<{
        announcement: {
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
        };
        deliveryStats: {
            recipientsTotal: number;
            sentCount: number;
            failedCount: number;
        };
    }>;
    sendRentReminders(dto: SendRentReminderDto, orgId: string, userId: string): Promise<{
        remindersSent: number;
        failedCount: number;
        whatsapp: {
            accepted: number;
            failed: number;
            skipped: number;
        };
        email: {
            accepted: number;
            failed: number;
            skipped: number;
        };
        missingMandates: number;
        whatsappMessageId: null;
        whatsappError: null;
        totalRemindedPaise: number;
        totalRemindedFormatted: string;
    }>;
}
