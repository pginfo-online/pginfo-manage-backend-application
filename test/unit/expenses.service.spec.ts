import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpensesService } from '../../src/modules/expenses/application/expenses.service.js';
import { NotFoundError } from '../../src/common/errors/index.js';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      property: {
        findFirst: vi.fn(),
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: 'prop-1', name: 'Sunrise PG' }]),
      },
      expenseCategory: {
        findFirst: vi.fn(),
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: 'cat-1', name: 'Groceries' }]),
      },
      expense: {
        create: vi.fn(),
        findFirst: vi.fn(),
        aggregate: vi.fn().mockResolvedValue({
          _sum: { amount: 150000 },
          _count: 3,
        }),
        groupBy: vi.fn().mockImplementation(({ by }) => {
          if (by.includes('categoryId')) {
            return Promise.resolve([
              { categoryId: 'cat-1', _sum: { amount: 150000 }, _count: 3 },
            ]);
          }
          return Promise.resolve([
            { propertyId: 'prop-1', _sum: { amount: 150000 }, _count: 3 },
          ]);
        }),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    service = new ExpensesService(mockPrisma as any);
  });

  it('should throw NotFoundError if property does not belong to organization', async () => {
    mockPrisma.property.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          propertyId: 'prop-1',
          categoryId: 'cat-1',
          amount: 50000,
          expenseDate: new Date(),
          paymentMode: 'UPI',
          description: 'Vegetables',
        },
        'org-1',
        'user-1',
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it('should calculate category breakdown and percentages correctly in getSummary', async () => {
    const summary = await service.getSummary('org-1');
    expect(summary.totalExpensesPaise).toBe(150000);
    expect(summary.totalExpensesRupees).toBe(1500);
    expect(summary.byCategory[0]?.categoryName).toBe('Groceries');
    expect(summary.byCategory[0]?.percentage).toBe(100);
  });
});
