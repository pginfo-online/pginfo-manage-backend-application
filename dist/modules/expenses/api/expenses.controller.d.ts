import { ExpensesService } from '../application/expenses.service.js';
import { type CreateExpenseDto, type UpdateExpenseDto, type CreateExpenseCategoryDto, type QueryExpensesDto } from './dto/expense.dto.js';
export declare class ExpensesController {
    private readonly expensesService;
    constructor(expensesService: ExpensesService);
    create(dto: CreateExpenseDto, orgId: string, userId: string): Promise<{
        amountRupees: number;
        amountFormatted: string;
        property: {
            id: string;
            name: string;
        };
        category: {
            id: string;
            name: string;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string;
        organizationId: string;
        description: string | null;
        propertyId: string;
        notes: string | null;
        paymentMode: import("@prisma/client").$Enums.PaymentMode;
        amount: number;
        categoryId: string;
        expenseDate: Date;
        paidBy: string | null;
        paidTo: string | null;
        receiptUrl: string | null;
    }>;
    findAll(query: QueryExpensesDto, orgId: string): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        amountRupees: number;
        amountFormatted: string;
        property: {
            id: string;
            name: string;
        };
        category: {
            id: string;
            name: string;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string;
        organizationId: string;
        description: string | null;
        propertyId: string;
        notes: string | null;
        paymentMode: import("@prisma/client").$Enums.PaymentMode;
        amount: number;
        categoryId: string;
        expenseDate: Date;
        paidBy: string | null;
        paidTo: string | null;
        receiptUrl: string | null;
    }>>;
    getSummary(orgId: string, propertyId?: string, startDate?: string, endDate?: string): Promise<{
        totalExpensesPaise: number;
        totalExpensesRupees: number;
        totalExpensesFormatted: string;
        expenseCount: number;
        byCategory: {
            categoryId: string;
            categoryName: string;
            amountPaise: number;
            amountRupees: number;
            amountFormatted: string;
            percentage: number;
        }[];
        byProperty: {
            propertyId: string;
            propertyName: string;
            amountPaise: number;
            amountRupees: number;
            amountFormatted: string;
        }[];
    }>;
    getCategories(orgId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        organizationId: string;
        isSystem: boolean;
    }[]>;
    createCategory(dto: CreateExpenseCategoryDto, orgId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        organizationId: string;
        isSystem: boolean;
    }>;
    findOne(id: string, orgId: string): Promise<{
        amountRupees: number;
        amountFormatted: string;
        property: {
            id: string;
            name: string;
        };
        category: {
            id: string;
            name: string;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string;
        organizationId: string;
        description: string | null;
        propertyId: string;
        notes: string | null;
        paymentMode: import("@prisma/client").$Enums.PaymentMode;
        amount: number;
        categoryId: string;
        expenseDate: Date;
        paidBy: string | null;
        paidTo: string | null;
        receiptUrl: string | null;
    }>;
    update(id: string, dto: UpdateExpenseDto, orgId: string, userId: string): Promise<{
        amountRupees: number;
        amountFormatted: string;
        property: {
            id: string;
            name: string;
        };
        category: {
            id: string;
            name: string;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string;
        organizationId: string;
        description: string | null;
        propertyId: string;
        notes: string | null;
        paymentMode: import("@prisma/client").$Enums.PaymentMode;
        amount: number;
        categoryId: string;
        expenseDate: Date;
        paidBy: string | null;
        paidTo: string | null;
        receiptUrl: string | null;
    }>;
    delete(id: string, orgId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
