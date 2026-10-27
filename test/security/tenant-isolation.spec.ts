import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertiesService } from '../../src/modules/property-operations/application/properties.service.js';
import { ResidentsService } from '../../src/modules/occupancy/application/residents.service.js';
import { ExpensesService } from '../../src/modules/expenses/application/expenses.service.js';
import { NotFoundError } from '../../src/common/errors/index.js';

describe('Multi-Tenant Data Isolation & Security Safeguards', () => {
  const ORG_A = 'org-tenant-alpha-1111';
  const ORG_B = 'org-tenant-bravo-2222';
  const USER_A = 'user-alice-1111';

  let propertiesService: PropertiesService;
  let residentsService: ResidentsService;
  let expensesService: ExpensesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      property: {
        findFirst: vi.fn(),
      },
      resident: {
        findFirst: vi.fn(),
      },
      expense: {
        findFirst: vi.fn(),
      },
    };

    propertiesService = new PropertiesService(mockPrisma as any);
    residentsService = new ResidentsService(mockPrisma as any);
    expensesService = new ExpensesService(mockPrisma as any);
  });

  it('Property Access: User in Org A cannot view property belonging to Org B (IDOR prevention)', async () => {
    // When querying with Org A's ID, the DB returns null because the property belongs to Org B
    mockPrisma.property.findFirst.mockImplementation(({ where }: any) => {
      if (where.id === 'prop-org-b' && where.organizationId === ORG_B) {
        return Promise.resolve({
          id: 'prop-org-b',
          organizationId: ORG_B,
          name: 'Bravo PG',
        });
      }
      return Promise.resolve(null);
    });

    // Attempt access with Org A context
    await expect(
      propertiesService.findById('prop-org-b', ORG_A),
    ).rejects.toThrow(NotFoundError);

    // Verify the query explicitly filtered by organizationId
    expect(mockPrisma.property.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'prop-org-b',
          organizationId: ORG_A,
        }),
      }),
    );
  });

  it('Resident Access: User in Org A cannot view resident in Org B', async () => {
    mockPrisma.resident.findFirst.mockImplementation(({ where }: any) => {
      if (where.id === 'res-org-b' && where.organizationId === ORG_B) {
        return Promise.resolve({
          id: 'res-org-b',
          organizationId: ORG_B,
          firstName: 'Bob',
        });
      }
      return Promise.resolve(null);
    });

    await expect(residentsService.findById('res-org-b', ORG_A)).rejects.toThrow(
      NotFoundError,
    );

    expect(mockPrisma.resident.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'res-org-b',
          organizationId: ORG_A,
        }),
      }),
    );
  });

  it('Expense Access: User in Org A cannot access or update expense in Org B', async () => {
    mockPrisma.expense.findFirst.mockImplementation(({ where }: any) => {
      if (where.id === 'exp-org-b' && where.organizationId === ORG_B) {
        return Promise.resolve({
          id: 'exp-org-b',
          organizationId: ORG_B,
          amount: 50000,
        });
      }
      return Promise.resolve(null);
    });

    await expect(expensesService.findById('exp-org-b', ORG_A)).rejects.toThrow(
      NotFoundError,
    );

    await expect(
      expensesService.delete('exp-org-b', ORG_A, USER_A),
    ).rejects.toThrow(NotFoundError);
  });
});
