import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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

@ApiTags('Dashboards & Analytics')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @ApiOperation({
    summary:
      'Get aggregate operational and financial indicators (occupancy, dues, collections, net profit)',
  })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getMetrics(
    @CurrentOrgId() orgId: string,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.dashboardService.getMetrics(orgId, propertyId);
  }
}
