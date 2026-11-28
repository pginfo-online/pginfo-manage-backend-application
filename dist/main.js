import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/errors/index.js';
async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
        rawBody: true,
    });
    app.useLogger(app.get(Logger));
    app.use(helmet());
    const config = app.get(ConfigService);
    const trustedProxies = config.get('TRUSTED_PROXY_IPS');
    if (trustedProxies.length)
        app.set('trust proxy', trustedProxies);
    app.enableCors({
        origin: config.get('CORS_ORIGINS'),
        credentials: true,
        maxAge: 600,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Request-Id',
            'X-Trace-Id',
            'X-Idempotency-Key',
        ],
    });
    const apiPrefix = process.env['API_PREFIX'] ?? 'api/v1';
    app.setGlobalPrefix(apiPrefix, {
        exclude: ['health', 'health/live', 'health/ready'],
    });
    app.useGlobalFilters(new GlobalExceptionFilter());
    if (process.env['NODE_ENV'] !== 'production') {
        const swaggerConfig = new DocumentBuilder()
            .setTitle('PgInfo API')
            .setDescription('Production-grade property management platform for the Indian rental market')
            .setVersion('1.0')
            .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your access token',
        }, 'JWT')
            .addServer(`http://localhost:${process.env['PORT'] ?? 3000}`)
            .build();
        const document = SwaggerModule.createDocument(app, swaggerConfig);
        SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true,
                tagsSorter: 'alpha',
                operationsSorter: 'alpha',
            },
        });
    }
    app.enableShutdownHooks();
    const port = config.get('PORT');
    await app.listen(port, config.get('LISTEN_HOST'));
    const logger = app.get(Logger);
    logger.log(`🏠 PgInfo API listening on port ${port}/${apiPrefix}`);
    logger.log(`📖 Swagger docs at http://localhost:${port}/api/docs`);
}
await bootstrap();
//# sourceMappingURL=main.js.map