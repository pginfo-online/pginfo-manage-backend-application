import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from '../application/invoices.service.js';
import {
  queryInvoicesSchema,
  type QueryInvoicesDto,
} from './dto/invoice.dto.js';
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

@ApiTags('Finance: Rent Invoices')
@Controller('rent/invoices')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER')
  @ApiOperation({ summary: 'List rent invoices with filters and pagination' })
  async listInvoices(
    @Query(new ZodValidationPipe(queryInvoicesSchema)) query: QueryInvoicesDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.invoicesService.queryInvoices(query, orgId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER')
  @ApiOperation({ summary: 'Get rent invoice details by ID' })
  async getInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.invoicesService.getInvoice(id, orgId);
  }
}
