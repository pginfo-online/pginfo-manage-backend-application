import { describe, expect, it } from 'vitest';
import {
  adminDashboardQuerySchema,
  adminUsersQuerySchema,
  reviewPayoutSchema,
  updatePlatformAdminSchema,
} from '../../src/modules/admin/api/dto/admin.dto.js';

describe('admin API validation', () => {
  it('parses false query values without truthy coercion', () => {
    expect(adminUsersQuerySchema.parse({ isActive: 'false' }).isActive).toBe(
      false,
    );
  });

  it('rejects inverted dashboard periods', () => {
    expect(() =>
      adminDashboardQuerySchema.parse({
        from: '2026-11-03',
        to: '2026-10-01',
      }),
    ).toThrow();
  });

  it('requires a reason and at least one admin change', () => {
    expect(() =>
      updatePlatformAdminSchema.parse({ reason: 'No change requested' }),
    ).toThrow();
    expect(
      updatePlatformAdminSchema.parse({
        status: 'SUSPENDED',
        reason: 'Security investigation',
      }).status,
    ).toBe('SUSPENDED');
  });

  it('rejects contradictory payout review state', () => {
    expect(() =>
      reviewPayoutSchema.parse({
        kycStatus: 'VERIFIED',
        status: 'REJECTED',
        reason: 'Contradictory state',
      }),
    ).toThrow();
  });
});
