import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/errors/index.js';
import type { EnvConfig } from './config/index.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true, // Buffer logs until Pino logger is attached
    rawBody: true, // Retain exact raw unparsed request bytes for webhook HMAC verification
  });

  // ── Structured Logging ───────────────────────────────────
  app.useLogger(app.get(Logger));

  // ── Security ─────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ─────────────────────────────────────────────────
  const config = app.get<ConfigService<EnvConfig, true>>(ConfigService);
  const trustedProxies = config.get('TRUSTED_PROXY_IPS');
  if (trustedProxies.length) app.set('trust proxy', trustedProxies);

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

  // ── Global Prefix ────────────────────────────────────────
  const apiPrefix = process.env['API_PREFIX'] ?? 'api/v1';
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health', 'health/live', 'health/ready'], // Health checks at root
  });

  // ── Global Exception Filter ──────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── Request Size Limits ──────────────────────────────────
  // Express default is 100kb — keep it reasonable
  // Individual upload routes can override with multer limits

  // ── Swagger / OpenAPI ────────────────────────────────────
  if (process.env['NODE_ENV'] !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('PgInfo API')
      .setDescription(
        'Production-grade property management platform for the Indian rental market',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token',
        },
        'JWT',
      )
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

  // ── Graceful Shutdown ────────────────────────────────────
  app.enableShutdownHooks();

  // ── Start ────────────────────────────────────────────────
  const port = config.get('PORT');
  await app.listen(port, config.get('LISTEN_HOST'));

  const logger = app.get(Logger);
  logger.log(`🏠 PgInfo API listening on port ${port}/${apiPrefix}`);
  logger.log(`📖 Swagger docs at http://localhost:${port}/api/docs`);
}

await bootstrap();
