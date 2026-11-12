import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { Monetary } from '../../finance/domain/monetary.js';
import { buildAutopayInvite } from '../../finance/domain/autopay-invite.js';
import {
  EMAIL_ADAPTER,
  WHATSAPP_ADAPTER,
  type EmailAdapter,
  type WhatsAppAdapter,
} from '../domain/notification.interfaces.js';
import type {
  CreateAnnouncementDto,
  SendRentReminderDto,
  QueryAnnouncementsDto,
} from '../api/dto/announcement.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_ADAPTER) private readonly emailAdapter: EmailAdapter,
    @Inject(WHATSAPP_ADAPTER) private readonly whatsappAdapter: WhatsAppAdapter,
  ) {}

  /**
   * Creates an announcement draft or scheduled notice.
   */
  async create(dto: CreateAnnouncementDto, orgId: string, userId: string) {
    if (dto.scope === 'PROPERTY') {
      if (!dto.propertyId) {
        throw new BadRequestException(
          'propertyId is required when scope is PROPERTY',
        );
      }
      const property = await this.prisma.property.findFirst({
        where: { id: dto.propertyId, organizationId: orgId },
      });
      if (!property) {
        throw new NotFoundError('Property', dto.propertyId);
      }
    }

    const status =
      dto.scheduledAt && dto.scheduledAt > new Date() ? 'SCHEDULED' : 'DRAFT';

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

  /**
   * Lists announcements with pagination.
   */
  async findAll(orgId: string, query: QueryAnnouncementsDto) {
    const where: Prisma.AnnouncementWhereInput = {
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

  /**
   * Retrieves single announcement by ID.
   */
  async findById(id: string, orgId: string) {
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

  /**
   * Dispatches announcement to all active residents in its target scope.
   */
  async send(id: string, orgId: string, userId: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, organizationId: orgId },
      include: { property: true },
    });

    if (!announcement) {
      throw new NotFoundError('Announcement', id);
    }

    // Find recipient active residents
    const whereResident: Prisma.ResidentWhereInput = {
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
        // Send WhatsApp if mobile available
        if (resident.mobile) {
          const res = await this.whatsappAdapter.send({
            to: resident.mobile,
            message: `📢 *${announcement.title}*\n\nDear ${resident.firstName},\n\n${announcement.body}\n\n— Property Management`,
          });
          if (res.success) sentCount++;
          else failedCount++;
        }

        // Send Email if email available
        if (resident.email) {
          await this.emailAdapter.send({
            to: resident.email,
            subject: `📢 Announcement: ${announcement.title}`,
            html: `<h3>Dear ${resident.firstName},</h3><p>${announcement.body.replace(/\n/g, '<br/>')}</p><br/><p>Best regards,<br/>Property Management</p>`,
          });
        }
      } catch (err) {
        this.logger.error(
          `Failed to send announcement to resident ${resident.id}: ${(err as Error).message}`,
        );
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

  /**
   * Sends individual or bulk rent reminders to residents with outstanding dues.
   */
  async sendRentReminders(
    dto: SendRentReminderDto,
    orgId: string,
    userId: string,
  ) {
    const where: Prisma.ResidentWhereInput = {
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
    let whatsappMessageId: string | null = null;
    let whatsappError: string | null = null;
    let totalRemindedPaise = 0;
    let after: string | undefined;
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
      if (!residents.length) break;
      const pendingMandates =
        dto.kind === 'autopay'
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
      const mandateByResident = new Map(
        pendingMandates.map((mandate) => [mandate.tenantId, mandate]),
      );
      const balances =
        dto.kind === 'autopay'
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
      const dueByResident = new Map(
        balances.map((entry) => [
          entry.residentId,
          (entry._sum.amount ?? 0) - (entry._sum.paidAmount ?? 0),
        ]),
      );
      for (let start = 0; start < residents.length; start += 10) {
        await Promise.all(
          residents.slice(start, start + 10).map(async (resident) => {
            const due = dueByResident.get(resident.id) ?? 0;
            if (dto.kind !== 'autopay' && due <= 0) return;
            const autopay = dto.kind === 'autopay';
            const mandate = mandateByResident.get(resident.id);
            const invite =
              mandate?.shortUrl && mandate.propertyId === resident.propertyId
                ? buildAutopayInvite(
                    { ...resident, property: mandate.property },
                    mandate.unit?.roomNumber ?? 'N/A',
                    mandate.rentAmount,
                    mandate.billingDay,
                    mandate.shortUrl,
                  )
                : null;
            if (autopay && !invite) missingMandates++;
            const subject = autopay
              ? 'Set up rent Autopay'
              : 'Rent payment reminder';
            const message =
              invite?.message ??
              (autopay
                ? 'Please contact your property manager to set up Autopay for your rent.'
                : 'Your outstanding balance is ' +
                  Monetary.formatINR(due) +
                  '. Please clear your dues.');
            const html =
              '<p>' +
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
            ] as const) {
              if (!requested) continue;
              const delivery =
                result.status === 'fulfilled' ? result.value : undefined;
              if (
                result.status === 'fulfilled' &&
                (!delivery || delivery.messageId?.startsWith('sim_'))
              ) {
                stats.skipped++;
              } else if (delivery?.success) {
                stats.accepted++;
                accepted = true;
                if (dto.residentId && stats === whatsapp)
                  whatsappMessageId = delivery.messageId ?? null;
              } else {
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
            if (failed) failedCount++;
          }),
        );
      }
      if (dto.residentId || residents.length < 100) break;
      after = residents.at(-1)!.id;
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action:
          dto.kind === 'autopay'
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
}
