import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ExportService } from '../application/export.service.js';
import {
  JwtAuthGuard,
  CurrentOrgId,
} from '../../../platform/authentication/index.js';
import {
  RequireOrgGuard,
  RequireOrgRoles,
  OrgRolesGuard,
} from '../../../platform/authorization/index.js';

@ApiTags('Reports & Exports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class ReportsController {
  constructor(private readonly exportService: ExportService) {}

  @Get('collections/csv')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Export collections and payments to CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportCollections(
    @CurrentOrgId() orgId: string,
    @Res() res: Response,
    @Query('propertyId') propertyId?: string,
  ) {
    const csv = await this.exportService.exportCollectionsCsv(
      orgId,
      propertyId,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="collections-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }

  @Get('residents/csv')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Export residents registry to CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportResidents(
    @CurrentOrgId() orgId: string,
    @Res() res: Response,
    @Query('propertyId') propertyId?: string,
  ) {
    const csv = await this.exportService.exportResidentsCsv(orgId, propertyId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="residents-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }

  @Get('expenses/csv')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Export expenses to CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportExpenses(
    @CurrentOrgId() orgId: string,
    @Res() res: Response,
    @Query('propertyId') propertyId?: string,
  ) {
    const csv = await this.exportService.exportExpensesCsv(orgId, propertyId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="expenses-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }
}
