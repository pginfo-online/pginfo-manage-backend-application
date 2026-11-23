import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../platform/authentication/index.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import {
  CurrentPlatformAdmin,
  PlatformAdminGuard,
  RequirePlatformPermissions,
} from '../authorization/admin-authorization.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import { AdminAuditService } from '../application/admin-audit.service.js';
import type { PlatformAdminContext } from '../domain/admin-permissions.js';
import {
  adminDashboardQuerySchema,
  adminPortfolioQuerySchema,
  type AdminPortfolioQueryDto,
  type AdminDashboardQueryDto,
} from './dto/admin.dto.js';
import { adminRequestMetadata } from './admin-request.js';
import type { Request } from 'express';

@ApiTags('Platform Admin: Dashboard and Reports')
@ApiBearerAuth('JWT')
@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminDashboardController {
  constructor(
    private readonly queryService: AdminQueryService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('dashboard')
  @RequirePlatformPermissions('dashboard.read')
  @ApiOperation({ summary: 'Get platform-wide operational and financial KPIs' })
  dashboard(
    @Query(new ZodValidationPipe(adminDashboardQuerySchema))
    query: AdminDashboardQueryDto,
  ) {
    return this.queryService.dashboardSnapshot(query);
  }

  @Get('reports/portfolio')
  @RequirePlatformPermissions('reports.read')
  @ApiOperation({ summary: 'Get organization-level portfolio report' })
  portfolioReport(
    @Query(new ZodValidationPipe(adminPortfolioQuerySchema))
    query: AdminPortfolioQueryDto,
  ) {
    return this.queryService.platformReport(query);
  }

  @Get('reports/portfolio.csv')
  @RequirePlatformPermissions('reports.read')
  @ApiOperation({
    summary: 'Download the organization portfolio report as CSV',
  })
  async portfolioReportCsv(
    @Query(new ZodValidationPipe(adminDashboardQuerySchema))
    query: AdminDashboardQueryDto,
    @Res({ passthrough: true }) response: Response,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    const csv = await this.queryService.platformReportCsv(query);
    await this.audit.record(
      actor.userId,
      'platform_report.export',
      'PlatformReport',
      'portfolio',
      {
        organizationId: query.organizationId,
        metadata: {
          format: 'csv',
          from: query.from?.toISOString(),
          to: query.to?.toISOString(),
        },
        request: adminRequestMetadata(request),
      },
    );
    response.type('text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="pginfo-platform-portfolio.csv"',
    );
    return csv;
  }
}
