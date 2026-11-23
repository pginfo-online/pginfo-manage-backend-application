import { PrismaService } from '../../../platform/database/index.js';
import type { CreateAgreementTemplateDto, UpdateAgreementTemplateDto } from '../api/dto/template.dto.js';
export declare class TemplatesService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(dto: CreateAgreementTemplateDto, orgId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        content: string;
        propertyId: string | null;
        isDefault: boolean;
    }>;
    findAll(orgId: string, propertyId?: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        content: string;
        propertyId: string | null;
        isDefault: boolean;
    }[]>;
    findById(id: string, orgId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        content: string;
        propertyId: string | null;
        isDefault: boolean;
    }>;
    update(id: string, dto: UpdateAgreementTemplateDto, orgId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        content: string;
        propertyId: string | null;
        isDefault: boolean;
    }>;
    delete(id: string, orgId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        content: string;
        propertyId: string | null;
        isDefault: boolean;
    }>;
    render(templateId: string, residentId: string, orgId: string): Promise<{
        templateId: string;
        templateName: string;
        residentId: string;
        renderedHtml: string;
    }>;
}
