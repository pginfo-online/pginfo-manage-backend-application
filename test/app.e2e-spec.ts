import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env['DATABASE_URL'] =
      'postgresql://pginfo:pginfo_dev@localhost:5432/pginfo_dev';
    process.env['JWT_SECRET'] = 'test-jwt-secret-at-least-16-chars';
    process.env['JWT_REFRESH_SECRET'] = 'test-refresh-jwt-secret-16-chars';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('/health/live (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('/health/ready requires the disposable database to be healthy', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.details.database.status).toBe('up');
  });

  afterEach(async () => {
    await app.close();
  });
});
