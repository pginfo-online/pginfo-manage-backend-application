import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PayoutsService } from '../application/payouts.service.js';
import {
  onboardOwnerSchema,
  queryPayoutAccountsSchema,
  type OnboardOwnerDto,
  type QueryPayoutAccountsDto,
} from './dto/payout.dto.js';
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

@ApiTags('Finance: Landlord Payout Accounts')
@Controller('payouts')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Post('onboard-owner')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Submit owner bank details for manual payout review',
  })
  @ApiResponse({ status: 201, description: 'Bank details saved for review' })
  async onboardOwner(
    @Body(new ZodValidationPipe(onboardOwnerSchema)) dto: OnboardOwnerDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.payoutsService.onboardOwner(dto, orgId, userId);
  }

  @Post('accounts/:id/refresh')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN')
  refreshVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.payoutsService.refreshVerification(id, orgId);
  }

  @Get('accounts')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'List landlord payout accounts for this organization',
  })
  async listAccounts(
    @Query(new ZodValidationPipe(queryPayoutAccountsSchema))
    query: QueryPayoutAccountsDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.payoutsService.queryPayoutAccounts(query, orgId);
  }

  @Get('accounts/active')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get active landlord payout account' })
  async getActiveAccount(
    @Query('propertyId') propertyId: string | undefined,
    @CurrentOrgId() orgId: string,
  ) {
    return this.payoutsService.getActivePayoutAccount(orgId, propertyId);
  }
}
