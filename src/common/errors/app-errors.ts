import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base application error with a machine-readable error code.
 * All domain/application errors should extend this class.
 */
export class AppError extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(
      {
        error: errorCode,
        message,
        ...(metadata ? { metadata } : {}),
      },
      status,
    );
  }
}

// ── Common Application Errors ────────────────────────────────

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super(
      'RESOURCE_NOT_FOUND',
      id ? `${entity} with id '${id}' not found` : `${entity} not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, HttpStatus.CONFLICT);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    errors?: Array<{ field: string; message: string }>,
  ) {
    super('VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST, {
      errors,
    });
  }
}

export class ConcurrencyError extends AppError {
  constructor(entity: string) {
    super(
      'CONCURRENCY_CONFLICT',
      `${entity} was modified by another request. Please retry.`,
      HttpStatus.CONFLICT,
    );
  }
}

export class DuplicateError extends AppError {
  constructor(entity: string, field: string) {
    super(
      'DUPLICATE',
      `A ${entity} with this ${field} already exists`,
      HttpStatus.CONFLICT,
    );
  }
}
