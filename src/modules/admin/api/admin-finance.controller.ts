import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../platform/authentication/index.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import {
  CurrentPlatformAdmin,
  PlatformAdminGuard,
  RequirePlatformPermissions,
} from '../authorization/admin-authorization.js';
import type { PlatformAdminContext } from '../domain/admin-permissions.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import { AdminCommandService } from '../application/admin-command.service.js';
import {
  adminPaymentsQuerySchema,
  adminPayoutsQuerySchema,
  adminPendingQuerySchema,
  reviewPayoutSchema,
  type AdminPaymentsQueryDto,
  type AdminPayoutsQueryDto,
  type AdminPendingQueryDto,
  type ReviewPayoutDto,
} from './dto/admin.dto.js';
import { adminRequestMetadata } from './admin-request.js';

@ApiTags('Platform Admin: Finance and Banks')
@ApiBearerAuth('JWT')
@Controller('admin/finance')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminFinanceController {
  constructor(
    private readonly queryService: AdminQueryService,
    private readonly commands: AdminCommandService,
  ) {}

  @Get('payments')
  @RequirePlatformPermissions('finance.read')
  payments(
    @Query(new ZodValidationPipe(adminPaymentsQuerySchema))
    query: AdminPaymentsQueryDto,
  ) {
    return this.queryService.payments(query);
  }

  @Get('payments/:id')
  @RequirePlatformPermissions('finance.read')
  payment(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.queryService.payment(id);
  }

  @Get('ledger')
  @RequirePlatformPermissions('finance.read')
  @ApiOperation({ summary: 'Platform-fee and owner-transfer ledger' })
  ledger(
    @Query(new ZodValidationPipe(adminPaymentsQuerySchema))
    query: AdminPaymentsQueryDto,
  ) {
    return this.queryService.ledger(query);
  }

  @Get('pending')
  @RequirePlatformPermissions('finance.read')
  @ApiOperation({ summary: 'Pending and disputed financial work queue' })
  pending(
    @Query(new ZodValidationPipe(adminPendingQuerySchema))
    query: AdminPendingQueryDto,
  ) {
    return this.queryService.pendingTransactions(query.organizationId);
  }

  @Get('payout-accounts')
  @RequirePlatformPermissions('banks.read')
  payoutAccounts(
    @Query(new ZodValidationPipe(adminPayoutsQuerySchema))
    query: AdminPayoutsQueryDto,
  ) {
    return this.queryService.payouts(query);
  }

  @Patch('payout-accounts/:id/review')
  @RequirePlatformPermissions('banks.review')
  reviewPayout(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(reviewPayoutSchema)) dto: ReviewPayoutDto,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.commands.reviewPayout(
      id,
      dto,
      actor,
      adminRequestMetadata(request),
    );
  }
}
