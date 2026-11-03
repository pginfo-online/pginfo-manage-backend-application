import { describe, expect, it } from 'vitest';
import {
  dateKeyInTimeZone,
  dateOnlyKey,
  isValidTimeZone,
} from '../../src/common/time/property-date.js';

describe('property date utilities', () => {
  it('uses the property calendar date across the UTC boundary', () => {
    const instant = new Date('2026-11-02T23:30:00.000Z');
    expect(dateKeyInTimeZone(instant, 'Asia/Kolkata')).toBe('2026-11-03');
    expect(dateKeyInTimeZone(instant, 'America/New_York')).toBe('2026-11-02');
  });

  it('preserves API date-only values and validates IANA zones', () => {
    expect(dateOnlyKey(new Date('2026-11-03'))).toBe('2026-11-03');
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
    expect(isValidTimeZone('not/a-zone')).toBe(false);
  });
});
