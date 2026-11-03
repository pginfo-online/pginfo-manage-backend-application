import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import { AdminGovernanceService } from '../application/admin-governance.service.js';
import {
  adminAuditQuerySchema,
  adminCasesQuerySchema,
  adminListQuerySchema,
  createAdminCaseSchema,
  updateAdminCaseSchema,
  upsertPlatformSettingSchema,
  type AdminAuditQueryDto,
  type AdminCasesQueryDto,
  type AdminListQueryDto,
  type CreateAdminCaseDto,
  type UpdateAdminCaseDto,
  type UpsertPlatformSettingDto,
} from './dto/admin.dto.js';
import { adminRequestMetadata } from './admin-request.js';

@ApiTags('Platform Admin: Governance')
@ApiBearerAuth('JWT')
@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminGovernanceController {
  constructor(
    private readonly queryService: AdminQueryService,
    private readonly governance: AdminGovernanceService,
  ) {}

  @Get('audit-logs')
  @RequirePlatformPermissions('audit.read')
  auditLogs(
    @Query(new ZodValidationPipe(adminAuditQuerySchema))
    query: AdminAuditQueryDto,
  ) {
    return this.queryService.auditLogs(query);
  }

  @Get('cases')
  @RequirePlatformPermissions('support.read')
  listCases(
    @Query(new ZodValidationPipe(adminCasesQuerySchema))
    query: AdminCasesQueryDto,
  ) {
    return this.governance.listCases(query);
  }

  @Post('cases')
  @RequirePlatformPermissions('support.write')
  createCase(
    @Body(new ZodValidationPipe(createAdminCaseSchema)) dto: CreateAdminCaseDto,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.governance.createCase(
      dto,
      actor,
      adminRequestMetadata(request),
    );
  }

  @Patch('cases/:id')
  @RequirePlatformPermissions('support.write')
  updateCase(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateAdminCaseSchema)) dto: UpdateAdminCaseDto,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.governance.updateCase(
      id,
      dto,
      actor,
      adminRequestMetadata(request),
    );
  }

  @Get('settings')
  @RequirePlatformPermissions('settings.read')
  listSettings(
    @Query(new ZodValidationPipe(adminListQuerySchema))
    query: AdminListQueryDto,
  ) {
    return this.governance.listSettings(query);
  }

  @Put('settings/:key')
  @RequirePlatformPermissions('settings.write')
  @ApiOperation({
    summary: 'Create or version-safely update a non-secret setting',
  })
  upsertSetting(
    @Param('key') key: string,
    @Body(new ZodValidationPipe(upsertPlatformSettingSchema))
    dto: UpsertPlatformSettingDto,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.governance.upsertSetting(
      key,
      dto,
      actor,
      adminRequestMetadata(request),
    );
  }
}
