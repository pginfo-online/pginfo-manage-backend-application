import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { randomInt } from 'node:crypto';
import { GlobalExceptionFilter } from '../src/common/errors/global-exception.filter.js';
import { SmsOtpService } from '../src/modules/identity/infrastructure/sms-otp.service.js';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
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

describe('Mobile OTP authentication (e2e)', () => {
  it('serializes sends, exposes cooldowns, and creates single-use login and registration sessions', async () => {
    const mobile = `9${randomInt(100_000_000, 999_999_999)}`;
    let code = '';
    const sendVerificationOtp = vi.fn(async (_mobile: string, otp: string) => {
      code = otp;
      return { success: true, messageId: 'fixture-sms', phone: mobile };
    });
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SmsOtpService)
      .useValue({ sendVerificationOtp })
      .compile();
    const app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    try {
      const api = request(app.getHttpServer());
      const send = (purpose: 'REGISTER' | 'LOGIN') =>
        api.post('/api/v1/auth/otp/send').send({ mobile, purpose });
      const registration = await Promise.all([
        send('REGISTER'),
        send('REGISTER'),
      ]);
      expect(registration.map((response) => response.status).sort()).toEqual([
        200, 429,
      ]);
      expect(sendVerificationOtp).toHaveBeenCalledTimes(1);
      expect(code).toMatch(/^\d{4}$/);
      const limited = await api
        .post('/api/v1/auth/otp/resend')
        .send({ mobile, purpose: 'REGISTER' })
        .expect(429);
      expect(limited.body).toMatchObject({
        title: 'OTP_COOLDOWN',
        retryAfterSeconds: expect.any(Number),
      });
      expect(limited.headers['retry-after']).toBe(
        String(limited.body.retryAfterSeconds),
      );

      const newAccount = {
        mobile,
        otp: code,
        firstName: 'Fixture Owner',
        organizationName: 'Fixture Properties',
      };
      await api
        .post('/api/v1/auth/otp/login')
        .send({ mobile, otp: code })
        .expect(401);

      const created = await api
        .post('/api/v1/auth/otp/register')
        .send(newAccount)
        .expect(201);
      expect(created.body.user).toMatchObject({
        mobile,
        activeOrganizationRole: 'OWNER',
      });
      await api.post('/api/v1/auth/otp/register').send(newAccount).expect(401);

      await send('LOGIN').expect(200);
      const signedIn = await api
        .post('/api/v1/auth/otp/login')
        .send({ mobile, otp: code })
        .expect(200);
      expect(signedIn.body.tokens.refreshToken).toEqual(expect.any(String));
      await api
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${signedIn.body.tokens.accessToken}`)
        .expect(200);
      await api
        .post('/api/v1/auth/otp/login')
        .send({ mobile, otp: code })
        .expect(401);

      // Three sends already reached this route. Invalid payloads also count
      // toward its per-client budget and never reach the SMS provider.
      for (let index = 0; index < 7; index++) {
        await api.post('/api/v1/auth/otp/send').send({}).expect(400);
      }
      const throttled = await api
        .post('/api/v1/auth/otp/send')
        .send({})
        .expect(429);
      expect(Number(throttled.headers['retry-after'])).toBeGreaterThan(0);
      expect(sendVerificationOtp).toHaveBeenCalledTimes(2);
    } finally {
      await app.close();
    }
  });
});
