import { Module } from '@nestjs/common';
import { DashboardController } from './api/dashboard.controller.js';
import { ReportsController } from './api/reports.controller.js';
import { DashboardService } from './application/dashboard.service.js';
import { ExportService } from './application/export.service.js';

@Module({
  controllers: [DashboardController, ReportsController],
  providers: [DashboardService, ExportService],
  exports: [DashboardService, ExportService],
})
export class ReportingModule {}
