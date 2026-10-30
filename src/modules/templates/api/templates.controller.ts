import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TemplatesService } from '../application/templates.service.js';
import {
  createAgreementTemplateSchema,
  updateAgreementTemplateSchema,
  type CreateAgreementTemplateDto,
  type UpdateAgreementTemplateDto,
} from './dto/template.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import {
  JwtAuthGuard,
  CurrentOrgId,
} from '../../../platform/authentication/index.js';
import {
  RequireOrgGuard,
  RequireOrgRoles,
  OrgRolesGuard,
} from '../../../platform/authorization/index.js';

@ApiTags('Operations: Agreement Templates')
@Controller('templates')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a rental agreement template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async create(
    @Body(new ZodValidationPipe(createAgreementTemplateSchema))
    dto: CreateAgreementTemplateDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.templatesService.create(dto, orgId);
  }

  @Get()
  @ApiOperation({ summary: 'List agreement templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async findAll(
    @Query('propertyId') propertyId: string | undefined,
    @CurrentOrgId() orgId: string,
  ) {
    return this.templatesService.findAll(orgId, propertyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.templatesService.findById(id, orgId);
  }

  @Patch(':id')
  @RequireOrgRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update an agreement template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateAgreementTemplateSchema))
    dto: UpdateAgreementTemplateDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.templatesService.update(id, dto, orgId);
  }

  @Delete(':id')
  @RequireOrgRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Archive a template' })
  @ApiResponse({ status: 200, description: 'Template archived' })
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.templatesService.delete(id, orgId);
  }

  @Post(':id/render/:residentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Render an agreement template for a resident' })
  @ApiResponse({ status: 200, description: 'Rendered agreement document' })
  async render(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('residentId', new ParseUUIDPipe()) residentId: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.templatesService.render(id, residentId, orgId);
  }
}
