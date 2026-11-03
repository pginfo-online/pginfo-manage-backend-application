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
import { LeadsService } from '../application/leads.service.js';
import {
  createLeadSchema,
  updateLeadSchema,
  queryLeadsSchema,
  type CreateLeadDto,
  type UpdateLeadDto,
  type QueryLeadsDto,
  leadStatsQuerySchema,
  type LeadStatsQueryDto,
} from './dto/lead.dto.js';
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

@ApiTags('CRM: Leads Pipeline')
@Controller('leads')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new prospective tenant lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  async create(
    @Body(new ZodValidationPipe(createLeadSchema)) dto: CreateLeadDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.leadsService.create(dto, orgId);
  }

  @Get()
  @ApiOperation({ summary: 'List leads with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of leads' })
  async findAll(
    @Query(new ZodValidationPipe(queryLeadsSchema)) query: QueryLeadsDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.leadsService.findAll(orgId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get lead pipeline statistics' })
  async stats(
    @Query(new ZodValidationPipe(leadStatsQuerySchema))
    query: LeadStatsQueryDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.leadsService.stats(orgId, query.propertyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific lead' })
  @ApiResponse({ status: 200, description: 'Lead details' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.leadsService.findById(id, orgId);
  }

  @Patch(':id')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update lead status or details' })
  @ApiResponse({ status: 200, description: 'Lead updated' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateLeadSchema)) dto: UpdateLeadDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.leadsService.update(id, dto, orgId);
  }

  @Delete(':id')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete a lead' })
  @ApiResponse({ status: 200, description: 'Lead deleted' })
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.leadsService.delete(id, orgId);
  }
}
