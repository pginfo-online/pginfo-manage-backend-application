var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AnnouncementsService_1;
import { Injectable, Logger, Inject, BadRequestException, } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { Monetary } from '../../finance/domain/monetary.js';
import { buildAutopayInvite } from '../../finance/domain/autopay-invite.js';
import { EMAIL_ADAPTER, WHATSAPP_ADAPTER, } from '../domain/notification.interfaces.js';
let AnnouncementsService = AnnouncementsService_1 = class AnnouncementsService {
    prisma;
    emailAdapter;
    whatsappAdapter;
    logger = new Logger(AnnouncementsService_1.name);
    constructor(prisma, emailAdapter, whatsappAdapter) {
        this.prisma = prisma;
        this.emailAdapter = emailAdapter;
        this.whatsappAdapter = whatsappAdapter;
    }
    async create(dto, orgId, userId) {
        if (dto.scope === 'PROPERTY') {
            if (!dto.propertyId) {
                throw new BadRequestException('propertyId is required when scope is PROPERTY');
            }
            const property = await this.prisma.property.findFirst({
                where: { id: dto.propertyId, organizationId: orgId },
            });
            if (!property) {
                throw new NotFoundError('Property', dto.propertyId);
            }
        }
        const status = dto.scheduledAt && dto.scheduledAt > new Date() ? 'SCHEDULED' : 'DRAFT';
        const announcement = await this.prisma.announcement.create({
            data: {
                organizationId: orgId,
                propertyId: dto.scope === 'PROPERTY' ? dto.propertyId : null,
                scope: dto.scope,
                title: dto.title,
                body: dto.body,
                status,
                scheduledAt: dto.scheduledAt,
                createdBy: userId,
            },
            include: {
                property: { select: { id: true, name: true } },
            },
        });
        await this.prisma.auditLog.create({
            data: {
                organizationId: orgId,
                userId,
                action: 'announcement.create',
                entityType: 'Announcement',
                entityId: announcement.id,
                metadata: { title: dto.title, scope: dto.scope },
            },
        });
        return announcement;
    }
    async findAll(orgId, query) {
        const where = {
            organizationId: orgId,
            ...(query.propertyId ? { propertyId: query.propertyId } : {}),
            ...(query.status ? { status: query.status } : {}),
        };
        const [total, announcements] = await Promise.all([
            this.prisma.announcement.count({ where }),
            this.prisma.announcement.findMany({
                where,
                skip: (query.page - 1) * query.limit,
                take: query.limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    property: { select: { id: true, name: true } },
                },
            }),
        ]);
        return buildOffsetResponse(announcements, total, query.page, query.limit);
    }
    async findById(id, orgId) {
        const announcement = await this.prisma.announcement.findFirst({
            where: { id, organizationId: orgId },
            include: {
                property: { select: { id: true, name: true } },
            },
        });
        if (!announcement) {
            throw new NotFoundError('Announcement', id);
        }
        return announcement;
    }
    async send(id, orgId, userId) {
        const announcement = await this.prisma.announcement.findFirst({
            where: { id, organizationId: orgId },
            include: { property: true },
        });
        if (!announcement) {
            throw new NotFoundError('Announcement', id);
        }
        const whereResident = {
            organizationId: orgId,
            status: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
            ...(announcement.propertyId
                ? { propertyId: announcement.propertyId }
                : {}),
        };
        const residents = await this.prisma.resident.findMany({
            where: whereResident,
            select: { id: true, firstName: true, email: true, mobile: true },
        });
        await this.prisma.announcement.update({
            where: { id },
            data: { status: 'SENDING' },
        });
        let sentCount = 0;
        let failedCount = 0;
        for (const resident of residents) {
            try {
                if (resident.mobile) {
                    const res = await this.whatsappAdapter.send({
                        to: resident.mobile,
                        message: `📢 *${announcement.title}*\n\nDear ${resident.firstName},\n\n${announcement.body}\n\n— Property Management`,
                    });
                    if (res.success)
                        sentCount++;
                    else
                        failedCount++;
                }
                if (resident.email) {
                    await this.emailAdapter.send({
                        to: resident.email,
                        subject: `📢 Announcement: ${announcement.title}`,
                        html: `<h3>Dear ${resident.firstName},</h3><p>${announcement.body.replace(/\n/g, '<br/>')}</p><br/><p>Best regards,<br/>Property Management</p>`,
                    });
                }
            }
            catch (err) {
                this.logger.error(`Failed to send announcement to resident ${resident.id}: ${err.message}`);
                failedCount++;
            }
        }
        const updated = await this.prisma.announcement.update({
            where: { id },
            data: {
                status: 'SENT',
                sentAt: new Date(),
            },
        });
        await this.prisma.auditLog.create({
            data: {
                organizationId: orgId,
                userId,
                action: 'announcement.sent',
                entityType: 'Announcement',
                entityId: id,
                metadata: {
                    recipientsCount: residents.length,
                    sentCount,
                    failedCount,
                },
            },
        });
        return {
            announcement: updated,
            deliveryStats: {
                recipientsTotal: residents.length,
                sentCount,
                failedCount,
            },
        };
    }
    async whatsappReminderHistory(orgId, residentId) {
        return this.prisma.$queryRaw `
      SELECT CASE WHEN a.action = 'communications.autopay_reminders_sent' THEN 'autopay'
                  ELSE 'rent' END AS kind,
             a.created_at AS "requestedAt",
             COALESCE(d.status, 'accepted') AS status,
             d.status_at AS "statusAt",
             d.failure_code AS "failureCode"
      FROM audit_logs a
      CROSS JOIN LATERAL jsonb_array_elements(
        COALESCE(a.metadata->'whatsappDeliveries', '[]'::jsonb)
      ) AS reminder
      LEFT JOIN whatsapp_deliveries d ON d.message_id = reminder->>'messageId'
      WHERE a.organization_id = ${orgId}::uuid
        AND a.action IN ('communications.autopay_reminders_sent', 'communications.rent_reminders_sent')
        AND (reminder->>'residentId') = ${residentId}
      ORDER BY a.created_at DESC
      LIMIT 20
    `;
    }
    async sendRentReminders(dto, orgId, userId) {
        const where = {
            organizationId: orgId,
            id: dto.residentIds ? { in: dto.residentIds } : dto.residentId,
            propertyId: dto.propertyId,
            status: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
            ...(dto.kind === 'autopay'
                ? {
                    mandates: { none: { collectionMode: 'AUTOPAY', status: 'ACTIVE' } },
                }
                : {}),
        };
        let remindersSent = 0;
        let failedCount = 0;
        let missingMandates = 0;
        const whatsapp = { accepted: 0, failed: 0, skipped: 0 };
        const email = { accepted: 0, failed: 0, skipped: 0 };
        const whatsappDeliveries = [];
        let whatsappMessageId = null;
        let whatsappError = null;
        let totalRemindedPaise = 0;
        let after;
        for (;;) {
            const residents = await this.prisma.resident.findMany({
                where: {
                    ...where,
                    id: dto.residentIds
                        ? { in: dto.residentIds, ...(after ? { gt: after } : {}) }
                        : (dto.residentId ?? (after ? { gt: after } : undefined)),
                },
                select: {
                    id: true,
                    firstName: true,
                    mobile: true,
                    whatsappNumber: true,
                    sendWhatsappReminder: true,
                    email: true,
                    propertyId: true,
                },
                orderBy: { id: 'asc' },
                take: 100,
            });
            if (!residents.length)
                break;
            const pendingMandates = dto.kind === 'autopay'
                ? await this.prisma.tenantMandate.findMany({
                    where: {
                        organizationId: orgId,
                        tenantId: { in: residents.map((resident) => resident.id) },
                        collectionMode: 'AUTOPAY',
                        status: { in: ['CREATED', 'PENDING'] },
                        shortUrl: { not: null },
                    },
                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                    distinct: ['tenantId'],
                    select: {
                        tenantId: true,
                        propertyId: true,
                        shortUrl: true,
                        rentAmount: true,
                        billingDay: true,
                        property: { select: { name: true } },
                        unit: { select: { roomNumber: true } },
                    },
                })
                : [];
            const mandateByResident = new Map(pendingMandates.map((mandate) => [mandate.tenantId, mandate]));
            const balances = dto.kind === 'autopay'
                ? []
                : await this.prisma.billingRecord.groupBy({
                    by: ['residentId'],
                    where: {
                        organizationId: orgId,
                        residentId: { in: residents.map((resident) => resident.id) },
                        status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
                    },
                    _sum: { amount: true, paidAmount: true },
                });
            const dueByResident = new Map(balances.map((entry) => [
                entry.residentId,
                (entry._sum.amount ?? 0) - (entry._sum.paidAmount ?? 0),
            ]));
            for (let start = 0; start < residents.length; start += 10) {
                await Promise.all(residents.slice(start, start + 10).map(async (resident) => {
                    const due = dueByResident.get(resident.id) ?? 0;
                    if (dto.kind !== 'autopay' && due <= 0)
                        return;
                    const autopay = dto.kind === 'autopay';
                    const mandate = mandateByResident.get(resident.id);
                    const invite = mandate?.shortUrl && mandate.propertyId === resident.propertyId
                        ? buildAutopayInvite({ ...resident, property: mandate.property }, mandate.unit?.roomNumber ?? 'N/A', mandate.rentAmount, mandate.billingDay, mandate.shortUrl)
                        : null;
                    if (autopay && !invite)
                        missingMandates++;
                    const subject = autopay
                        ? 'Set up rent Autopay'
                        : 'Rent payment reminder';
                    const message = invite?.message ??
                        (autopay
                            ? 'Please contact your property manager to set up Autopay for your rent.'
                            : 'Your outstanding balance is ' +
                                Monetary.formatINR(due) +
                                '. Please clear your dues.');
                    const html = '<p>' +
                        message
                            .replaceAll('&', '&amp;')
                            .replaceAll('<', '&lt;')
                            .replaceAll('>', '&gt;') +
                        '</p>';
                    const [whatsappResult, emailResult] = await Promise.allSettled([
                        dto.channel !== 'EMAIL' &&
                            resident.sendWhatsappReminder &&
                            (!autopay || invite)
                            ? this.whatsappAdapter.send({
                                to: resident.whatsappNumber || resident.mobile,
                                message,
                                ...(!autopay
                                    ? {
                                        rentReminder: {
                                            residentName: resident.firstName,
                                            balance: Monetary.formatINR(due),
                                        },
                                    }
                                    : {}),
                                templateName: invite?.template,
                                templateParams: invite?.templateParams,
                            })
                            : undefined,
                        dto.channel !== 'WHATSAPP' && resident.email
                            ? this.emailAdapter.send({ to: resident.email, subject, html })
                            : undefined,
                    ]);
                    let accepted = false;
                    let failed = false;
                    for (const [result, stats, requested] of [
                        [whatsappResult, whatsapp, dto.channel !== 'EMAIL'],
                        [emailResult, email, dto.channel !== 'WHATSAPP'],
                    ]) {
                        if (!requested)
                            continue;
                        const delivery = result.status === 'fulfilled' ? result.value : undefined;
                        if (result.status === 'fulfilled' &&
                            (!delivery || delivery.messageId?.startsWith('sim_'))) {
                            stats.skipped++;
                        }
                        else if (delivery?.success) {
                            stats.accepted++;
                            accepted = true;
                            if (stats === whatsapp && delivery.messageId) {
                                whatsappDeliveries.push({
                                    residentId: resident.id,
                                    messageId: delivery.messageId,
                                });
                                if (dto.residentId)
                                    whatsappMessageId = delivery.messageId;
                            }
                        }
                        else {
                            stats.failed++;
                            failed = true;
                            if (dto.residentId && stats === whatsapp) {
                                whatsappError =
                                    delivery?.error ?? 'WhatsApp provider request failed';
                            }
                        }
                    }
                    if (accepted) {
                        remindersSent++;
                        totalRemindedPaise += due;
                    }
                    if (failed)
                        failedCount++;
                }));
            }
            if (dto.residentId || residents.length < 100)
                break;
            after = residents.at(-1).id;
        }
        await this.prisma.auditLog.create({
            data: {
                organizationId: orgId,
                userId,
                action: dto.kind === 'autopay'
                    ? 'communications.autopay_reminders_sent'
                    : 'communications.rent_reminders_sent',
                entityType: dto.residentId ? 'Resident' : undefined,
                entityId: dto.residentId,
                metadata: {
                    remindersSent,
                    failedCount,
                    totalRemindedPaise,
                    channel: dto.channel,
                    whatsapp,
                    email,
                    missingMandates,
                    whatsappMessageId,
                    whatsappDeliveries,
                    whatsappError,
                },
            },
        });
        return {
            remindersSent,
            failedCount,
            whatsapp,
            email,
            missingMandates,
            whatsappMessageId,
            whatsappError,
            totalRemindedPaise,
            totalRemindedFormatted: Monetary.formatINR(totalRemindedPaise),
        };
    }
};
AnnouncementsService = AnnouncementsService_1 = __decorate([
    Injectable(),
    __param(1, Inject(EMAIL_ADAPTER)),
    __param(2, Inject(WHATSAPP_ADAPTER)),
    __metadata("design:paramtypes", [PrismaService, Object, Object])
], AnnouncementsService);
export { AnnouncementsService };
//# sourceMappingURL=announcements.service.js.map