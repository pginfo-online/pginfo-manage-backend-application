import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from '../application/dashboard.service.js';
import {
  JwtAuthGuard,
  CurrentOrgId,
} from '../../../platform/authentication/index.js';
import {
  RequireOrgGuard,
  OrgRolesGuard,
} from '../../../platform/authorization/index.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import {
  dashboardQuerySchema,
  dashboardPropertiesQuerySchema,
  type DashboardQueryDto,
  type DashboardPropertiesQueryDto,
} from './dto/dashboard.dto.js';
import {
  activityQuerySchema,
  type ActivityQueryDto,
} from './dto/activity.dto.js';

@ApiTags('Dashboards & Analytics')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('properties')
  @ApiOperation({
    summary: 'List lightweight property labels for dashboard cards',
  })
  async getProperties(
    @CurrentOrgId() orgId: string,
    @Query(new ZodValidationPipe(dashboardPropertiesQuerySchema))
    query: DashboardPropertiesQueryDto,
  ) {
    return this.dashboardService.getProperties(orgId, query);
  }

  @Get('properties/:id')
  @ApiOperation({ summary: 'Get a property label for dashboard header' })
  async getPropertyLabel(
    @CurrentOrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dashboardService.getPropertyLabel(orgId, id);
  }

  @Get('metrics')
  @ApiOperation({
    summary:
      'Get aggregate operational and financial indicators (occupancy, dues, collections, net profit)',
  })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getMetrics(
    @CurrentOrgId() orgId: string,
    @Query(new ZodValidationPipe(dashboardQuerySchema))
    query: DashboardQueryDto,
  ) {
    return this.dashboardService.getMetrics(
      orgId,
      query.propertyId,
      query.month,
      query.year,
      query.fy === 'true',
    );
  }

  @Get('overview')
  @ApiOperation({
    summary:
      'Get full overview payload: KPIs, property cards, pending tasks, occupancy breakdown, journey, and issues',
  })
  @ApiResponse({ status: 200, description: 'Overview workspace payload' })
  async getOverview(
    @CurrentOrgId() orgId: string,
    @Query(new ZodValidationPipe(dashboardQuerySchema))
    query: DashboardQueryDto,
  ) {
    return this.dashboardService.getOverview(
      orgId,
      query.propertyId,
      query.month,
      query.year,
      query.fy === 'true',
    );
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get organization-scoped entity activity history' })
  async getActivity(
    @CurrentOrgId() orgId: string,
    @Query(new ZodValidationPipe(activityQuerySchema)) query: ActivityQueryDto,
  ) {
    return this.dashboardService.getActivity(orgId, query);
  }
}
