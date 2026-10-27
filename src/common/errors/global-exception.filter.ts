import {
  type ExceptionFilter,
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Error response following RFC 9457 Problem Details.
 */
interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  traceId: string;
  timestamp: string;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Global exception filter that converts all exceptions
 * into a consistent RFC 9457 Problem Details response.
 *
 * - HttpException: maps status and message naturally
 * - Unknown errors: 500 with safe message (no stack trace in production)
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const traceId = (request.headers['x-trace-id'] as string) ?? uuidv4();

    let status: number;
    let title: string;
    let detail: string;
    let errors: Array<{ field: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        title = this.statusToTitle(status);
        detail = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resp = exceptionResponse as Record<string, unknown>;
        title = (resp['error'] as string) ?? this.statusToTitle(status);
        detail = (resp['message'] as string) ?? exception.message;
        errors = resp['errors'] as
          Array<{ field: string; message: string }> | undefined;
      } else {
        title = this.statusToTitle(status);
        detail = exception.message;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      title = 'Internal Server Error';
      detail =
        process.env['NODE_ENV'] === 'production'
          ? 'An unexpected error occurred'
          : exception instanceof Error
            ? exception.message
            : 'An unexpected error occurred';

      // Log the full error for debugging — never send to client
      this.logger.error(
        {
          traceId,
          path: request.url,
          method: request.method,
          error: exception instanceof Error ? exception.stack : exception,
        },
        'Unhandled exception',
      );
    }

    const problem: ProblemDetail = {
      type: `https://pginfo.dev/errors/${this.statusToType(status)}`,
      title,
      status,
      detail,
      instance: request.url,
      traceId,
      timestamp: new Date().toISOString(),
    };

    if (errors) {
      problem.errors = errors;
    }

    response.status(status).json(problem);
  }

  private statusToTitle(status: number): string {
    const titles: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
    };
    return titles[status] ?? 'Error';
  }

  private statusToType(status: number): string {
    const types: Record<number, string> = {
      400: 'bad-request',
      401: 'unauthorized',
      403: 'forbidden',
      404: 'not-found',
      409: 'conflict',
      422: 'validation-error',
      429: 'rate-limited',
      500: 'internal-error',
    };
    return types[status] ?? 'unknown-error';
  }
}
