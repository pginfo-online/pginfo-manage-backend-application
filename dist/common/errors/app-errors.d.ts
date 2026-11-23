import { HttpException, HttpStatus } from '@nestjs/common';
export declare class AppError extends HttpException {
    readonly errorCode: string;
    readonly metadata?: Record<string, unknown> | undefined;
    constructor(errorCode: string, message: string, status?: HttpStatus, metadata?: Record<string, unknown> | undefined);
}
export declare class NotFoundError extends AppError {
    constructor(entity: string, id?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ValidationError extends AppError {
    constructor(message: string, errors?: Array<{
        field: string;
        message: string;
    }>);
}
export declare class ConcurrencyError extends AppError {
    constructor(entity: string);
}
export declare class DuplicateError extends AppError {
    constructor(entity: string, field: string);
}
