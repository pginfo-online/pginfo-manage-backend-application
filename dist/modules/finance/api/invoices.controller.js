var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Param, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from '../application/invoices.service.js';
import { queryInvoicesSchema, } from './dto/invoice.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let InvoicesController = class InvoicesController {
    invoicesService;
    constructor(invoicesService) {
        this.invoicesService = invoicesService;
    }
    async listInvoices(query, orgId) {
        return this.invoicesService.queryInvoices(query, orgId);
    }
    async getInvoice(id, orgId) {
        return this.invoicesService.getInvoice(id, orgId);
    }
};
__decorate([
    Get(),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'),
    ApiOperation({ summary: 'List rent invoices with filters and pagination' }),
    __param(0, Query(new ZodValidationPipe(queryInvoicesSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "listInvoices", null);
__decorate([
    Get(':id'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'),
    ApiOperation({ summary: 'Get rent invoice details by ID' }),
    __param(0, Param('id', ParseUUIDPipe)),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InvoicesController.prototype, "getInvoice", null);
InvoicesController = __decorate([
    ApiTags('Finance: Rent Invoices'),
    Controller('rent/invoices'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [InvoicesService])
], InvoicesController);
export { InvoicesController };
//# sourceMappingURL=invoices.controller.js.map