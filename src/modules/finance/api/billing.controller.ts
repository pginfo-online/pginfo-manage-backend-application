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
import { BillingService } from '../application/billing.service.js';
import {
  createChargeSchema,
  generateMonthlyDuesSchema,
  queryBillingSchema,
  type CreateChargeDto,
  type GenerateMonthlyDuesDto,
  type QueryBillingDto,
} from './dto/billing.dto.js';
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

@ApiTags('Finance: Billing & Dues')
@Controller('billing')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('generate-monthly-dues')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary:
      'Generate monthly rent dues for active residents (idempotent, safe to rerun)',
  })
  @ApiResponse({ status: 200, description: 'Monthly dues generated' })
  async generateMonthlyDues(
    @Body(new ZodValidationPipe(generateMonthlyDuesSchema))
    dto: GenerateMonthlyDuesDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.billingService.generateMonthlyDues(dto, orgId, userId);
  }

  @Post('charges')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary:
      'Create an ad-hoc charge (Electricity, Water, Maintenance, Penalty, etc.)',
  })
  @ApiResponse({ status: 201, description: 'Charge created' })
  async createCharge(
    @Body(new ZodValidationPipe(createChargeSchema)) dto: CreateChargeDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.billingService.createCharge(dto, orgId, userId);
  }

  @Get('records')
  @ApiOperation({ summary: 'List billing records with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated billing records' })
  async findAll(
    @Query(new ZodValidationPipe(queryBillingSchema)) query: QueryBillingDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.billingService.findAll(orgId, query);
  }

  @Get('records/:id')
  @ApiOperation({ summary: 'Get details of a specific billing record' })
  @ApiResponse({ status: 200, description: 'Billing record details' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.billingService.findById(id, orgId);
  }

  @Post('records/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Cancel an unpaid billing record' })
  @ApiResponse({ status: 200, description: 'Billing record cancelled' })
  async cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.billingService.cancelBill(id, orgId, userId, reason);
  }
}
