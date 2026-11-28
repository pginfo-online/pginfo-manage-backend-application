import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
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
import { PaymentsService } from '../../finance/application/payments.service.js';
import { AdminCollectionsService } from '../application/admin-collections.service.js';
import { AdminCommandService } from '../application/admin-command.service.js';
import {
  adminPaymentsQuerySchema,
  adminPayoutsQuerySchema,
  adminPendingQuerySchema,
  reviewPayoutSchema,
  reconcileSettlementSchema,
  applyDisputedCaptureSchema,
  recordManualPayoutSchema,
  prepareManualPayoutSchema,
  type PrepareManualPayoutDto,
  type RecordManualPayoutDto,
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
    private readonly collections: AdminCollectionsService,
    private readonly paymentsService: PaymentsService,
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

  @Get('collections')
  @RequirePlatformPermissions('finance.read')
  onlineCollections(
    @Query(new ZodValidationPipe(adminPaymentsQuerySchema))
    query: AdminPaymentsQueryDto,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
  ) {
    return this.collections.list(query, actor);
  }

  @Get('collections/:id/payout-accounts')
  @RequirePlatformPermissions('finance.review')
  collectionPayoutAccounts(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.collections.eligibleAccounts(id);
  }

  @Post('collections/:id/settlement')
  @HttpCode(200)
  @RequirePlatformPermissions('finance.review')
  reconcileCollection(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(reconcileSettlementSchema))
    dto: { settledOn: string },
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.collections.reconcile(
      id,
      dto.settledOn,
      actor,
      adminRequestMetadata(request),
    );
  }

  @Post('collections/:id/apply-to-dues')
  @HttpCode(200)
  @RequirePlatformPermissions('finance.review')
  async applyToDues(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(applyDisputedCaptureSchema))
    dto: { reason: string },
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
  ) {
    const payment = await this.paymentsService.applyDisputedCapture(
      id,
      actor.userId,
      dto.reason,
    );
    return { id: payment.id, status: payment.status };
  }

  @Post('collections/:id/payout/prepare')
  @RequirePlatformPermissions('finance.review')
  prepareManualPayout(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(prepareManualPayoutSchema))
    dto: PrepareManualPayoutDto,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.collections.preparePayout(
      id,
      dto,
      actor,
      adminRequestMetadata(request),
    );
  }

  @Post('collections/:id/payout/release')
  @HttpCode(200)
  @RequirePlatformPermissions('finance.review')
  releaseManualPayout(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.collections.releasePayout(
      id,
      actor,
      adminRequestMetadata(request),
    );
  }

  @Post('collections/:id/payout')
  @RequirePlatformPermissions('finance.review')
  recordManualPayout(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(recordManualPayoutSchema))
    dto: RecordManualPayoutDto,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.collections.recordPayout(
      id,
      dto,
      actor,
      adminRequestMetadata(request),
    );
  }

  @Post('payout-accounts/:id/bank-details')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RequirePlatformPermissions('banks.review')
  revealBankDetails(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.collections.reveal(id, actor, adminRequestMetadata(request));
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
