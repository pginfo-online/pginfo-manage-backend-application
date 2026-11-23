var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
let LoggingModule = class LoggingModule {
};
LoggingModule = __decorate([
    Module({
        imports: [
            LoggerModule.forRoot({
                pinoHttp: {
                    genReqId: (req) => req.headers['x-trace-id'] ?? uuidv4(),
                    customLogLevel: (_req, res, err) => {
                        if (res.statusCode >= 500 || err)
                            return 'error';
                        if (res.statusCode >= 400)
                            return 'warn';
                        return 'info';
                    },
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
                    serializers: {
                        req: (req) => ({
                            id: req['id'],
                            method: req['method'],
                            url: typeof req['url'] === 'string'
                                ? req['url'].split('?')[0]
                                : undefined,
                            remoteAddress: req['remoteAddress'],
                        }),
                        res: (res) => ({
                            statusCode: res['statusCode'],
                        }),
                    },
                    transport: process.env['NODE_ENV'] !== 'production'
                        ? {
                            target: 'pino-pretty',
                            options: {
                                colorize: true,
                                singleLine: true,
                                translateTime: 'SYS:HH:MM:ss.l',
                                ignore: 'pid,hostname',
                            },
                        }
                        : undefined,
                },
            }),
        ],
    })
], LoggingModule);
export { LoggingModule };
//# sourceMappingURL=logging.module.js.map