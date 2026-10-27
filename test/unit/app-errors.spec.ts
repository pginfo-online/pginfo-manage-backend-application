import { describe, it, expect } from 'vitest';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
  ConcurrencyError,
} from '../../src/common/errors/index.js';

describe('AppErrors', () => {
  it('NotFoundError should format message and error code correctly', () => {
    const error = new NotFoundError('Property', 'prop-123');
    expect(error.getStatus()).toBe(404);
    expect(error.errorCode).toBe('RESOURCE_NOT_FOUND');
    expect(error.message).toContain("Property with id 'prop-123' not found");
  });

  it('ConflictError should return status 409', () => {
    const error = new ConflictError('Room already occupied');
    expect(error.getStatus()).toBe(409);
    expect(error.errorCode).toBe('CONFLICT');
  });

  it('ForbiddenError should return status 403', () => {
    const error = new ForbiddenError();
    expect(error.getStatus()).toBe(403);
    expect(error.errorCode).toBe('FORBIDDEN');
  });

  it('UnauthorizedError should return status 401', () => {
    const error = new UnauthorizedError();
    expect(error.getStatus()).toBe(401);
    expect(error.errorCode).toBe('UNAUTHORIZED');
  });

  it('ValidationError should return status 400 with details', () => {
    const error = new ValidationError('Invalid inputs', [
      { field: 'email', message: 'Invalid email' },
    ]);
    expect(error.getStatus()).toBe(400);
    expect(error.errorCode).toBe('VALIDATION_ERROR');
  });

  it('ConcurrencyError should return status 409', () => {
    const error = new ConcurrencyError('Resident');
    expect(error.getStatus()).toBe(409);
    expect(error.errorCode).toBe('CONCURRENCY_CONFLICT');
  });
});
