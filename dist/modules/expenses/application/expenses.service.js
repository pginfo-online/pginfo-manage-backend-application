var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ExpensesService_1;
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { Monetary } from '../../finance/domain/monetary.js';
let ExpensesService = ExpensesService_1 = class ExpensesService {
    prisma;
    logger = new Logger(ExpensesService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, orgId, userId) {
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
    async findAll(orgId, query) {
        const where = {
            organizationId: orgId,
            ...(query.propertyId ? { propertyId: query.propertyId } : {}),
            ...(query.categoryId ? { categoryId: query.categoryId } : {}),
            ...(query.paymentMode ? { paymentMode: query.paymentMode } : {}),
            ...(query.search
                ? {
                    OR: [
                        { description: { contains: query.search, mode: 'insensitive' } },
                        { paidBy: { contains: query.search, mode: 'insensitive' } },
                        { paidTo: { contains: query.search, mode: 'insensitive' } },
                        {
                            category: {
                                name: { contains: query.search, mode: 'insensitive' },
                            },
                        },
                    ],
                }
                : {}),
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
                orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
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
    async findById(id, orgId) {
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
    async update(id, dto, orgId, userId) {
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
    async delete(id, orgId, userId) {
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
    async getSummary(orgId, propertyId, startDate, endDate) {
        const where = {
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
        const categoryIds = categoryGroups.map((g) => g.categoryId);
        const categories = await this.prisma.expenseCategory.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
        });
        const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
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
                percentage: totalAmountPaise > 0
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
    async getCategories(orgId) {
        return this.prisma.expenseCategory.findMany({
            where: { organizationId: orgId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    async createCategory(dto, orgId) {
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
};
ExpensesService = ExpensesService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], ExpensesService);
export { ExpensesService };
//# sourceMappingURL=expenses.service.js.map