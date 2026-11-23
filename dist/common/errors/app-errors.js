import { HttpException, HttpStatus } from '@nestjs/common';
export class AppError extends HttpException {
    errorCode;
    metadata;
    constructor(errorCode, message, status = HttpStatus.BAD_REQUEST, metadata) {
        super({
            error: errorCode,
            message,
            ...(metadata ? { metadata } : {}),
        }, status);
        this.errorCode = errorCode;
        this.metadata = metadata;
    }
}
export class NotFoundError extends AppError {
    constructor(entity, id) {
        super('RESOURCE_NOT_FOUND', id ? `${entity} with id '${id}' not found` : `${entity} not found`, HttpStatus.NOT_FOUND);
    }
}
export class ConflictError extends AppError {
    constructor(message) {
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
    constructor(message, errors) {
        super('VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST, {
            errors,
        });
    }
}
export class ConcurrencyError extends AppError {
    constructor(entity) {
        super('CONCURRENCY_CONFLICT', `${entity} was modified by another request. Please retry.`, HttpStatus.CONFLICT);
    }
}
export class DuplicateError extends AppError {
    constructor(entity, field) {
        super('DUPLICATE', `A ${entity} with this ${field} already exists`, HttpStatus.CONFLICT);
    }
}
//# sourceMappingURL=app-errors.js.map