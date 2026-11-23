var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { DashboardController } from './api/dashboard.controller.js';
import { ReportsController } from './api/reports.controller.js';
import { DashboardService } from './application/dashboard.service.js';
import { ExportService } from './application/export.service.js';
let ReportingModule = class ReportingModule {
};
ReportingModule = __decorate([
    Module({
        controllers: [DashboardController, ReportsController],
        providers: [DashboardService, ExportService],
        exports: [DashboardService, ExportService],
    })
], ReportingModule);
export { ReportingModule };
//# sourceMappingURL=reporting.module.js.map