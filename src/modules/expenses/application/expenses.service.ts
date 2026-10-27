import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { Monetary } from '../../finance/domain/monetary.js';
import type {
  CreateExpenseDto,
  UpdateExpenseDto,
  CreateExpenseCategoryDto,
  QueryExpensesDto,
} from '../api/dto/expense.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new operating expense.
   */
  async create(dto: CreateExpenseDto, orgId: string, userId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, organizationId: orgId },
    });

    if (!property) {
      throw new NotFoundError('Property', dto.propertyId);
    }

    const category = await this.prisma.expenseCategory.findFirst({
      where: { id: dto.categoryId, organizationId: orgId, isActive: true },
    });

    if (!category) {
      throw new NotFoundError('Expense Category', dto.categoryId);
    }

    const expense = await this.prisma.expense.create({
      data: {
        organizationId: orgId,
        propertyId: dto.propertyId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        expenseDate: dto.expenseDate,
        paymentMode: dto.paymentMode,
        paidBy: dto.paidBy,
        paidTo: dto.paidTo,
        description: dto.description,
        receiptUrl: dto.receiptUrl,
        notes: dto.notes,
        createdBy: userId,
      },
      include: {
        category: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'expense.create',
        entityType: 'Expense',
        entityId: expense.id,
        metadata: { amount: dto.amount, category: category.name },
      },
    });

    return {
      ...expense,
      amountRupees: Monetary.toRupees(expense.amount),
      amountFormatted: Monetary.formatINR(expense.amount),
    };
  }

  /**
   * Lists expenses with pagination, search, and filters.
   */
  async findAll(orgId: string, query: QueryExpensesDto) {
    const where: Prisma.ExpenseWhereInput = {
      organizationId: orgId,
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.paymentMode ? { paymentMode: query.paymentMode } : {}),
      ...(query.startDate || query.endDate
        ? {
            expenseDate: {
              ...(query.startDate ? { gte: query.startDate } : {}),
              ...(query.endDate ? { lte: query.endDate } : {}),
            },
          }
        : {}),
    };

    const [total, expenses] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          property: { select: { id: true, name: true } },
        },
      }),
    ]);

    const formatted = expenses.map((e) => ({
      ...e,
      amountRupees: Monetary.toRupees(e.amount),
      amountFormatted: Monetary.formatINR(e.amount),
    }));

    return buildOffsetResponse(formatted, total, query.page, query.limit);
  }

  /**
   * Retrieves single expense by ID.
   */
  async findById(id: string, orgId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId: orgId },
      include: {
        category: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
      },
    });

    if (!expense) {
      throw new NotFoundError('Expense', id);
    }

    return {
      ...expense,
      amountRupees: Monetary.toRupees(expense.amount),
      amountFormatted: Monetary.formatINR(expense.amount),
    };
  }

  /**
   * Updates an existing expense.
   */
  async update(
    id: string,
    dto: UpdateExpenseDto,
    orgId: string,
    userId: string,
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!expense) {
      throw new NotFoundError('Expense', id);
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: dto,
      include: {
        category: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'expense.update',
        entityType: 'Expense',
        entityId: id,
      },
    });

    return {
      ...updated,
      amountRupees: Monetary.toRupees(updated.amount),
      amountFormatted: Monetary.formatINR(updated.amount),
    };
  }

  /**
   * Deletes an expense record.
   */
  async delete(id: string, orgId: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!expense) {
      throw new NotFoundError('Expense', id);
    }

    await this.prisma.expense.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'expense.delete',
        entityType: 'Expense',
        entityId: id,
      },
    });

    return { success: true, message: 'Expense deleted successfully' };
  }

  /**
   * Calculates expense summary breakdown by category and property.
   */
  async getSummary(
    orgId: string,
    propertyId?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: Prisma.ExpenseWhereInput = {
      organizationId: orgId,
      ...(propertyId ? { propertyId } : {}),
      ...(startDate || endDate
        ? {
            expenseDate: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    const [totalAggregate, categoryGroups, propertyGroups] = await Promise.all([
      this.prisma.expense.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['propertyId'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalAmountPaise = totalAggregate._sum.amount ?? 0;

    // Fetch names for categories
    const categoryIds = categoryGroups.map((g) => g.categoryId);
    const categories = await this.prisma.expenseCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    // Fetch names for properties
    const propertyIds = propertyGroups.map((g) => g.propertyId);
    const properties = await this.prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: { id: true, name: true },
    });
    const propertyMap = new Map(properties.map((p) => [p.id, p.name]));

    return {
      totalExpensesPaise: totalAmountPaise,
      totalExpensesRupees: Monetary.toRupees(totalAmountPaise),
      totalExpensesFormatted: Monetary.formatINR(totalAmountPaise),
      expenseCount: totalAggregate._count,
      byCategory: categoryGroups.map((g) => ({
        categoryId: g.categoryId,
        categoryName: categoryMap.get(g.categoryId) ?? 'Unknown',
        amountPaise: g._sum.amount ?? 0,
        amountRupees: Monetary.toRupees(g._sum.amount ?? 0),
        amountFormatted: Monetary.formatINR(g._sum.amount ?? 0),
        percentage:
          totalAmountPaise > 0
            ? Math.round(((g._sum.amount ?? 0) / totalAmountPaise) * 100)
            : 0,
      })),
      byProperty: propertyGroups.map((g) => ({
        propertyId: g.propertyId,
        propertyName: propertyMap.get(g.propertyId) ?? 'Unknown',
        amountPaise: g._sum.amount ?? 0,
        amountRupees: Monetary.toRupees(g._sum.amount ?? 0),
        amountFormatted: Monetary.formatINR(g._sum.amount ?? 0),
      })),
    };
  }

  /**
   * Retrieves active expense categories for the organization.
   */
  async getCategories(orgId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Adds a custom expense category to the organization.
   */
  async createCategory(dto: CreateExpenseCategoryDto, orgId: string) {
    const existing = await this.prisma.expenseCategory.findUnique({
      where: {
        organizationId_name: {
          organizationId: orgId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      if (!existing.isActive) {
        return this.prisma.expenseCategory.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }
      throw new ConflictError(`Expense category '${dto.name}' already exists`);
    }

    return this.prisma.expenseCategory.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        isSystem: false,
      },
    });
  }
}
