import { describe, expect, it } from 'vitest';
import { dashboardQuerySchema } from '../../src/modules/reporting/api/dto/dashboard.dto.js';
import { activityQuerySchema } from '../../src/modules/reporting/api/dto/activity.dto.js';
import { queryPaymentsSchema } from '../../src/modules/finance/api/dto/payment.dto.js';
import { queryBillingSchema } from '../../src/modules/finance/api/dto/billing.dto.js';
import { queryExpensesSchema } from '../../src/modules/expenses/api/dto/expense.dto.js';

describe('reporting query contracts', () => {
  it('coerces a complete reporting period', () => {
    const query = dashboardQuerySchema.parse({ month: '11', year: '2026' });
    expect(query).toMatchObject({ month: 11, year: 2026 });
  });

  it('rejects incomplete or invalid reporting periods', () => {
    expect(() => dashboardQuerySchema.parse({ month: '11' })).toThrow();
    expect(() =>
      dashboardQuerySchema.parse({ month: '13', year: '2026' }),
    ).toThrow();
  });

  it('restricts activity reads to supported UUID-scoped entities', () => {
    const query = activityQuerySchema.parse({
      entityType: 'Resident',
      entityId: '00000000-0000-4000-8000-000000000001',
      limit: '100',
    });
    expect(query.limit).toBe(100);
    expect(() =>
      activityQuerySchema.parse({
        entityType: 'User',
        entityId: query.entityId,
      }),
    ).toThrow();
  });

  it('accepts bounded server-search terms for high-volume financial lists', () => {
    expect(queryPaymentsSchema.parse({ search: 'Aarav' }).search).toBe('Aarav');
    expect(queryBillingSchema.parse({ search: '9876543210' }).search).toBe(
      '9876543210',
    );
    expect(queryExpensesSchema.parse({ search: 'electricity' }).search).toBe(
      'electricity',
    );
    expect(() =>
      queryPaymentsSchema.parse({ search: 'x'.repeat(101) }),
    ).toThrow();
  });
});
