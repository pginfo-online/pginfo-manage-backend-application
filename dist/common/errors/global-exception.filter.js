var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GlobalExceptionFilter_1;
import { Catch, HttpException, HttpStatus, Logger, } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    logger = new Logger(GlobalExceptionFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        const traceId = request.headers['x-trace-id'] ?? uuidv4();
        let status;
        let title;
        let detail;
        let errors;
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                title = this.statusToTitle(status);
                detail = exceptionResponse;
            }
            else if (typeof exceptionResponse === 'object' &&
                exceptionResponse !== null) {
                const resp = exceptionResponse;
                title = resp['error'] ?? this.statusToTitle(status);
                detail = resp['message'] ?? exception.message;
                errors = resp['errors'];
            }
            else {
                title = this.statusToTitle(status);
                detail = exception.message;
            }
        }
        else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            title = 'Internal Server Error';
            detail =
                process.env['NODE_ENV'] === 'production'
                    ? 'An unexpected error occurred'
                    : exception instanceof Error
                        ? exception.message
                        : 'An unexpected error occurred';
            this.logger.error({
                traceId,
                path: request.url,
                method: request.method,
                error: exception instanceof Error ? exception.stack : exception,
            }, 'Unhandled exception');
        }
        const problem = {
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
    statusToTitle(status) {
        const titles = {
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
    statusToType(status) {
        const types = {
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
};
GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    Catch()
], GlobalExceptionFilter);
export { GlobalExceptionFilter };
//# sourceMappingURL=global-exception.filter.js.map