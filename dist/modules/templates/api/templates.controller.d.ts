import { TemplatesService } from '../application/templates.service.js';
import { type CreateAgreementTemplateDto, type UpdateAgreementTemplateDto } from './dto/template.dto.js';
export declare class TemplatesController {
    private readonly templatesService;
    constructor(templatesService: TemplatesService);
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
    findAll(propertyId: string | undefined, orgId: string): Promise<{
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
    findOne(id: string, orgId: string): Promise<{
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
    render(id: string, residentId: string, orgId: string): Promise<{
        templateId: string;
        templateName: string;
        residentId: string;
        renderedHtml: string;
    }>;
}
