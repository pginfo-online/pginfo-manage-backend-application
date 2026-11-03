import {
  Controller,
  Post,
  Get,
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
import { MandatesService } from '../application/mandates.service.js';
import {
  createMandateSchema,
  queryMandatesSchema,
  type CreateMandateDto,
  type QueryMandatesDto,
} from './dto/mandate.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import {
  JwtAuthGuard,
  CurrentOrgId,
  CurrentUserId,
} from '../../../platform/authentication/index.js';
import {
  RequireOrgGuard,
  RequireOrgRoles,
  OrgRolesGuard,
} from '../../../platform/authorization/index.js';

@ApiTags('Finance: Rent Mandates & Autopay')
@Controller('rent/mandates')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class MandatesController {
  constructor(private readonly mandatesService: MandatesService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary:
      'Generate an automated rent collection mandate (UPI AutoPay & e-Mandate)',
    description:
      'Creates a recurring plan and subscription in Razorpay, returns authorization short_url and triggers WhatsApp notification payload.',
  })
  @ApiResponse({
    status: 201,
    description: 'Mandate successfully generated and tenant notified',
  })
  @ApiResponse({ status: 400, description: 'Invalid input or tenant status' })
  @ApiResponse({ status: 404, description: 'Tenant or Unit not found' })
  @ApiResponse({
    status: 409,
    description: 'Tenant already has an active mandate',
  })
  async createMandate(
    @Body(new ZodValidationPipe(createMandateSchema)) dto: CreateMandateDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.mandatesService.createMandate(dto, orgId, userId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER')
  @ApiOperation({
    summary: 'List tenant autopay mandates with filters and pagination',
  })
  async listMandates(
    @Query(new ZodValidationPipe(queryMandatesSchema)) query: QueryMandatesDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.mandatesService.queryMandates(query, orgId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER')
  @ApiOperation({ summary: 'Get mandate details by ID' })
  async getMandate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.mandatesService.getMandate(id, orgId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Cancel/Revoke tenant autopay mandate' })
  async cancelMandate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.mandatesService.cancelMandate(id, orgId, userId);
  }
}
