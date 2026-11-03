import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError } from '../../../common/errors/index.js';
import type {
  CreateAgreementTemplateDto,
  UpdateAgreementTemplateDto,
} from '../api/dto/template.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAgreementTemplateDto, orgId: string) {
    if (dto.propertyId) {
      const property = await this.prisma.property.findFirst({
        where: { id: dto.propertyId, organizationId: orgId },
      });
      if (!property) {
        throw new NotFoundError('Property', dto.propertyId);
      }
    }

    if (dto.isDefault) {
      await this.prisma.agreementTemplate.updateMany({
        where: {
          organizationId: orgId,
          ...(dto.propertyId ? { propertyId: dto.propertyId } : {}),
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.agreementTemplate.create({
      data: {
        organizationId: orgId,
        propertyId: dto.propertyId,
        name: dto.name,
        content: dto.content,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async findAll(orgId: string, propertyId?: string) {
    const where: Prisma.AgreementTemplateWhereInput = {
      organizationId: orgId,
      ...(propertyId ? { propertyId } : {}),
      isActive: true,
    };

    return this.prisma.agreementTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string, orgId: string) {
    const template = await this.prisma.agreementTemplate.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!template) {
      throw new NotFoundError('AgreementTemplate', id);
    }

    return template;
  }

  async update(id: string, dto: UpdateAgreementTemplateDto, orgId: string) {
    const existing = await this.findById(id, orgId);

    if (dto.isDefault) {
      await this.prisma.agreementTemplate.updateMany({
        where: {
          organizationId: orgId,
          propertyId: existing.propertyId,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.agreementTemplate.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.content ? { content: dto.content } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async delete(id: string, orgId: string) {
    await this.findById(id, orgId);
    return this.prisma.agreementTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async render(templateId: string, residentId: string, orgId: string) {
    const template = await this.findById(templateId, orgId);

    const resident = await this.prisma.resident.findFirst({
      where: { id: residentId, organizationId: orgId },
      include: {
        room: true,
        bed: true,
        property: true,
      },
    });

    if (!resident) {
      throw new NotFoundError('Resident', residentId);
    }

    const rentInRupees = (resident.monthlyRent / 100).toFixed(2);
    const depositInRupees = (resident.securityDeposit / 100).toFixed(2);
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const moveIn = resident.moveInDate
      ? new Date(resident.moveInDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : today;

    const fullName = [resident.firstName, resident.lastName]
      .filter(Boolean)
      .join(' ');

    let rendered = template.content
      .replace(/{{resident_name}}/gi, fullName || 'Resident')
      .replace(/{{resident_phone}}/gi, resident.mobile ?? '')
      .replace(/{{resident_email}}/gi, resident.email ?? '')
      .replace(/{{property_name}}/gi, resident.property?.name ?? '')
      .replace(
        /{{property_address}}/gi,
        `${resident.property?.addressLine1}, ${resident.property?.city}, ${resident.property?.state}`,
      )
      .replace(/{{room_number}}/gi, resident.room?.roomNumber ?? 'N/A')
      .replace(/{{bed_name}}/gi, resident.bed?.bedNumber ?? 'N/A')
      .replace(/{{monthly_rent}}/gi, `₹${rentInRupees}`)
      .replace(/{{security_deposit}}/gi, `₹${depositInRupees}`)
      .replace(/{{move_in_date}}/gi, moveIn)
      .replace(/{{date_today}}/gi, today);

    return {
      templateId: template.id,
      templateName: template.name,
      residentId: resident.id,
      renderedHtml: rendered,
    };
  }
}
