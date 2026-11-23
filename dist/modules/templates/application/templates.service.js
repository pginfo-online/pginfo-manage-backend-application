var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TemplatesService_1;
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError } from '../../../common/errors/index.js';
let TemplatesService = TemplatesService_1 = class TemplatesService {
    prisma;
    logger = new Logger(TemplatesService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, orgId) {
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
    async findAll(orgId, propertyId) {
        const where = {
            organizationId: orgId,
            ...(propertyId ? { propertyId } : {}),
            isActive: true,
        };
        return this.prisma.agreementTemplate.findMany({
            where,
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
    }
    async findById(id, orgId) {
        const template = await this.prisma.agreementTemplate.findFirst({
            where: { id, organizationId: orgId },
        });
        if (!template) {
            throw new NotFoundError('AgreementTemplate', id);
        }
        return template;
    }
    async update(id, dto, orgId) {
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
    async delete(id, orgId) {
        await this.findById(id, orgId);
        return this.prisma.agreementTemplate.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async render(templateId, residentId, orgId) {
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
            .replace(/{{property_address}}/gi, `${resident.property?.addressLine1}, ${resident.property?.city}, ${resident.property?.state}`)
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
};
TemplatesService = TemplatesService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], TemplatesService);
export { TemplatesService };
//# sourceMappingURL=templates.service.js.map