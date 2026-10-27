import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import type { IncomingMessage } from 'http';

/**
 * Logging module using Pino for structured JSON logging.
 *
 * Features:
 * - Automatic request/response logging
 * - Request correlation via x-trace-id header
 * - Safe: never logs auth tokens, passwords, or sensitive headers
 * - Pretty printing in development, JSON in production
 */
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        // Generate trace ID from header or create new one
        genReqId: (req: IncomingMessage) =>
          (req.headers['x-trace-id'] as string) ?? uuidv4(),

        // Custom log level based on status code
        customLogLevel: (_req, res, err) => {
          if (res.statusCode >= 500 || err) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },

        // Redact sensitive fields from logs
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.passwordHash',
            'req.body.refreshToken',
            'req.body.token',
          ],
          censor: '[REDACTED]',
        },

        // Serialize only needed request fields
        serializers: {
          req: (req: Record<string, unknown>) => ({
            id: req['id'],
            method: req['method'],
            url: req['url'],
            remoteAddress: req['remoteAddress'],
          }),
          res: (res: Record<string, unknown>) => ({
            statusCode: res['statusCode'],
          }),
        },

        transport:
          process.env['NODE_ENV'] !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:HH:MM:ss.l',
                  ignore: 'pid,hostname',
                },
              }
            : undefined, // JSON output in production
      },
    }),
  ],
})
export class LoggingModule {}
