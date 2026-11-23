import { PrismaService } from '../../../platform/database/index.js';
import { type EmailAdapter, type WhatsAppAdapter } from '../domain/notification.interfaces.js';
import type { CreateAnnouncementDto, SendRentReminderDto, QueryAnnouncementsDto } from '../api/dto/announcement.dto.js';
export declare class AnnouncementsService {
    private readonly prisma;
    private readonly emailAdapter;
    private readonly whatsappAdapter;
    private readonly logger;
    constructor(prisma: PrismaService, emailAdapter: EmailAdapter, whatsappAdapter: WhatsAppAdapter);
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
    findAll(orgId: string, query: QueryAnnouncementsDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
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
    findById(id: string, orgId: string): Promise<{
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
    whatsappReminderHistory(orgId: string, residentId: string): Promise<unknown>;
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
