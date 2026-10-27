import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExpensesService } from '../application/expenses.service.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  createExpenseCategorySchema,
  queryExpensesSchema,
  type CreateExpenseDto,
  type UpdateExpenseDto,
  type CreateExpenseCategoryDto,
  type QueryExpensesDto,
} from './dto/expense.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import {
  JwtAuthGuard,
  CurrentOrgId,
  CurrentUserId,
} from '../../../platform/authentication/index.js';
import {
  RequireOrgGuard,
  RequireOrgRoles,
  OrgRolesGuard,
} from '../../../platform/authorization/index.js';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Record an operational expense' })
  @ApiResponse({ status: 201, description: 'Expense recorded' })
  async create(
    @Body(new ZodValidationPipe(createExpenseSchema)) dto: CreateExpenseDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.expensesService.create(dto, orgId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List expenses with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated expenses' })
  async findAll(
    @Query(new ZodValidationPipe(queryExpensesSchema)) query: QueryExpensesDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.expensesService.findAll(orgId, query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get expense summary breakdown by category and property',
  })
  @ApiResponse({ status: 200, description: 'Expense summary breakdown' })
  async getSummary(
    @CurrentOrgId() orgId: string,
    @Query('propertyId') propertyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expensesService.getSummary(
      orgId,
      propertyId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all active expense categories' })
  @ApiResponse({ status: 200, description: 'Categories list' })
  async getCategories(@CurrentOrgId() orgId: string) {
    return this.expensesService.getCategories(orgId);
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a custom expense category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(
    @Body(new ZodValidationPipe(createExpenseCategorySchema))
    dto: CreateExpenseCategoryDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.expensesService.createCategory(dto, orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of an expense' })
  @ApiResponse({ status: 200, description: 'Expense details' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.expensesService.findById(id, orgId);
  }

  @Patch(':id')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update an existing expense' })
  @ApiResponse({ status: 200, description: 'Expense updated' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateExpenseSchema)) dto: UpdateExpenseDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.expensesService.update(id, dto, orgId, userId);
  }

  @Delete(':id')
  @RequireOrgRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete an expense' })
  @ApiResponse({ status: 200, description: 'Expense deleted' })
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.expensesService.delete(id, orgId, userId);
  }
}
