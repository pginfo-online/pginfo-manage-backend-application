import type { Response } from 'express';
import { ExportService } from '../application/export.service.js';
export declare class ReportsController {
    private readonly exportService;
    constructor(exportService: ExportService);
    exportCollections(orgId: string, res: Response, propertyId?: string): Promise<void>;
    exportResidents(orgId: string, res: Response, propertyId?: string): Promise<void>;
    exportExpenses(orgId: string, res: Response, propertyId?: string): Promise<void>;
}
