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
    const where: Prisma.BillingRecordWhereInput = {
      organizationId: orgId,
      status: { in: ['ISSUED', 'DUE', 'PARTIALLY_PAID', 'OVERDUE'] },
      ...(dto.residentId ? { residentId: dto.residentId } : {}),
      ...(dto.propertyId ? { propertyId: dto.propertyId } : {}),
    };

    const dues = await this.prisma.billingRecord.findMany({
      where,
      include: {
        resident: {
          include: { property: { select: { name: true } } },
        },
      },
    });

    // Group dues by resident
    const residentDues = new Map<
      string,
      {
        resident: (typeof dues)[0]['resident'];
        totalDuePaise: number;
        bills: typeof dues;
      }
    >();

    for (const due of dues) {
      const resId = due.residentId;
      const unpaid = due.amount - due.paidAmount;
      if (unpaid <= 0) continue;

      if (!residentDues.has(resId)) {
        residentDues.set(resId, {
          resident: due.resident,
          totalDuePaise: 0,
          bills: [],
        });
      }
      const entry = residentDues.get(resId)!;
      entry.totalDuePaise += unpaid;
      entry.bills.push(due);
    }

    let remindersSent = 0;
    let totalRemindedPaise = 0;

    for (const [_, entry] of residentDues.entries()) {
      const { resident, totalDuePaise } = entry;
      const formattedAmount = Monetary.formatINR(totalDuePaise);
      const propertyName = resident.property?.name ?? 'Accommodation';

      const reminderMessage = `🔔 *Rent Reminder*\n\nHi ${resident.firstName},\nThis is a gentle reminder that you have an outstanding balance of *${formattedAmount}* for your stay at *${propertyName}*.\n\nPlease clear your dues at the earliest. Thank you!`;

      if (
        (dto.channel === 'WHATSAPP' || dto.channel === 'BOTH') &&
        resident.mobile
      ) {
        await this.whatsappAdapter.send({
          to: resident.mobile,
          message: reminderMessage,
        });
      }

      if (
        (dto.channel === 'EMAIL' || dto.channel === 'BOTH') &&
        resident.email
      ) {
        await this.emailAdapter.send({
          to: resident.email,
          subject: `Rent Reminder: ${formattedAmount} due for ${propertyName}`,
          html: `<p>Hi ${resident.firstName},</p><p>This is a gentle reminder that you have an outstanding balance of <strong>${formattedAmount}</strong> for your stay at <strong>${propertyName}</strong>.</p><p>Please clear your dues at your earliest convenience.</p><p>Thank you,<br/>Property Management</p>`,
        });
      }

      remindersSent++;
      totalRemindedPaise += totalDuePaise;
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'communications.rent_reminders_sent',
        metadata: {
          remindersSent,
          totalRemindedPaise,
          channel: dto.channel,
        },
      },
    });

    return {
      remindersSent,
      totalRemindedPaise,
      totalRemindedFormatted: Monetary.formatINR(totalRemindedPaise),
    };
  }
}
