import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import type {
  CreateLeadDto,
  UpdateLeadDto,
  QueryLeadsDto,
} from '../api/dto/lead.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeadDto, orgId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, organizationId: orgId },
    });

    if (!property) {
      throw new NotFoundError('Property', dto.propertyId);
    }

    const lead = await this.prisma.lead.create({
      data: {
        organizationId: orgId,
        propertyId: dto.propertyId,
        name: dto.name,
        mobile: dto.mobile,
        email: dto.email,
        budget: dto.budget,
        sharingPreference: dto.sharingPreference,
        source: dto.source || 'walk_in',
        notes: dto.notes,
        visitScheduledAt: dto.visitScheduledAt,
      },
    });

    this.logger.log(`Created lead ${lead.id} (${lead.name})`);
    return lead;
  }

  async findAll(orgId: string, query: QueryLeadsDto) {
    const { propertyId, status, search, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = {
      organizationId: orgId,
      ...(propertyId ? { propertyId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { mobile: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return buildOffsetResponse(items, total, page, limit);
  }

  async findById(id: string, orgId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: orgId },
      include: { property: { select: { id: true, name: true, city: true } } },
    });

    if (!lead) {
      throw new NotFoundError('Lead', id);
    }

    return lead;
  }

  async update(id: string, dto: UpdateLeadDto, orgId: string) {
    await this.findById(id, orgId);

    return this.prisma.lead.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.mobile ? { mobile: dto.mobile } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.budget !== undefined ? { budget: dto.budget } : {}),
        ...(dto.sharingPreference !== undefined
          ? { sharingPreference: dto.sharingPreference }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.visitScheduledAt !== undefined
          ? { visitScheduledAt: dto.visitScheduledAt }
          : {}),
      },
    });
  }

  async delete(id: string, orgId: string) {
    await this.findById(id, orgId);
    await this.prisma.lead.delete({ where: { id } });
    return { success: true, message: 'Lead deleted successfully' };
  }
}
