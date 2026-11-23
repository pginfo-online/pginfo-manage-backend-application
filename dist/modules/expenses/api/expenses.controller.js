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
import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, } from '@nestjs/swagger';
import { ExpensesService } from '../application/expenses.service.js';
import { createExpenseSchema, updateExpenseSchema, createExpenseCategorySchema, queryExpensesSchema, } from './dto/expense.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, CurrentUserId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let ExpensesController = class ExpensesController {
    expensesService;
    constructor(expensesService) {
        this.expensesService = expensesService;
    }
    async create(dto, orgId, userId) {
        return this.expensesService.create(dto, orgId, userId);
    }
    async findAll(query, orgId) {
        return this.expensesService.findAll(orgId, query);
    }
    async getSummary(orgId, propertyId, startDate, endDate) {
        return this.expensesService.getSummary(orgId, propertyId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
    }
    async getCategories(orgId) {
        return this.expensesService.getCategories(orgId);
    }
    async createCategory(dto, orgId) {
        return this.expensesService.createCategory(dto, orgId);
    }
    async findOne(id, orgId) {
        return this.expensesService.findById(id, orgId);
    }
    async update(id, dto, orgId, userId) {
        return this.expensesService.update(id, dto, orgId, userId);
    }
    async delete(id, orgId, userId) {
        return this.expensesService.delete(id, orgId, userId);
    }
};
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Record an operational expense' }),
    ApiResponse({ status: 201, description: 'Expense recorded' }),
    __param(0, Body(new ZodValidationPipe(createExpenseSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "create", null);
__decorate([
    Get(),
    ApiOperation({ summary: 'List expenses with filters and pagination' }),
    ApiResponse({ status: 200, description: 'Paginated expenses' }),
    __param(0, Query(new ZodValidationPipe(queryExpensesSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "findAll", null);
__decorate([
    Get('summary'),
    ApiOperation({
        summary: 'Get expense summary breakdown by category and property',
    }),
    ApiResponse({ status: 200, description: 'Expense summary breakdown' }),
    __param(0, CurrentOrgId()),
    __param(1, Query('propertyId')),
    __param(2, Query('startDate')),
    __param(3, Query('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "getSummary", null);
__decorate([
    Get('categories'),
    ApiOperation({ summary: 'List all active expense categories' }),
    ApiResponse({ status: 200, description: 'Categories list' }),
    __param(0, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "getCategories", null);
__decorate([
    Post('categories'),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN'),
    ApiOperation({ summary: 'Create a custom expense category' }),
    ApiResponse({ status: 201, description: 'Category created' }),
    __param(0, Body(new ZodValidationPipe(createExpenseCategorySchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "createCategory", null);
__decorate([
    Get(':id'),
    ApiOperation({ summary: 'Get details of an expense' }),
    ApiResponse({ status: 200, description: 'Expense details' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "findOne", null);
__decorate([
    Patch(':id'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Update an existing expense' }),
    ApiResponse({ status: 200, description: 'Expense updated' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updateExpenseSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "update", null);
__decorate([
    Delete(':id'),
    RequireOrgRoles('OWNER', 'ADMIN'),
    ApiOperation({ summary: 'Delete an expense' }),
    ApiResponse({ status: 200, description: 'Expense deleted' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ExpensesController.prototype, "delete", null);
ExpensesController = __decorate([
    ApiTags('Expenses'),
    Controller('expenses'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [ExpensesService])
], ExpensesController);
export { ExpensesController };
//# sourceMappingURL=expenses.controller.js.map