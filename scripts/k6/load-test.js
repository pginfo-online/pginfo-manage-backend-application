import http from 'k6/http';
import { check, sleep, group } from 'k6';

// ── Performance SLA Thresholds ──────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 virtual users
    { duration: '1m', target: 50 },   // Sustained load at 50 virtual users
    { duration: '30s', target: 100 }, // Peak spike load
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% under 200ms, 99% under 500ms
    http_req_failed: ['rate<0.01'],                 // Under 1% failure rate
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  group('1. Health Checks', () => {
    const res = http.get(`${BASE_URL}/health/live`);
    check(res, {
      'liveness is 200': (r) => r.status === 200,
    });
  });

  group('2. Authentication Flow', () => {
    const uniqueEmail = `perf_${__VU}_${__ITER}_${Date.now()}@pginfo.test`;
    const payload = JSON.stringify({
      email: uniqueEmail,
      password: 'Password123!',
      firstName: 'PerfUser',
    });

    const headers = { 'Content-Type': 'application/json' };
    const regRes = http.post(`${BASE_URL}/api/v1/auth/register`, payload, { headers });

    const registered = check(regRes, {
      'register is 201': (r) => r.status === 201,
      'has accessToken': (r) => JSON.parse(r.body).tokens?.accessToken !== undefined,
    });

    if (!registered) return;

    const token = JSON.parse(regRes.body).tokens.accessToken;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    group('3. User Profile', () => {
      const meRes = http.get(`${BASE_URL}/api/v1/auth/me`, { headers: authHeaders });
      check(meRes, {
        'getMe is 200': (r) => r.status === 200,
      });
    });

    group('4. Organization Management', () => {
      const orgPayload = JSON.stringify({
        name: `Perf Organization ${__VU}`,
      });
      const orgRes = http.post(`${BASE_URL}/api/v1/organizations`, orgPayload, {
        headers: authHeaders,
      });

      const orgCreated = check(orgRes, {
        'create org is 201': (r) => r.status === 201,
      });

      if (!orgCreated) return;
      const orgId = JSON.parse(orgRes.body).id;

      // Switch organization to acquire tenant-scoped JWT
      const switchRes = http.post(
        `${BASE_URL}/api/v1/organizations/${orgId}/switch`,
        null,
        { headers: authHeaders },
      );

      const switched = check(switchRes, {
        'switch org is 200': (r) => r.status === 200,
      });

      if (!switched) return;
      const tenantToken = JSON.parse(switchRes.body).accessToken;
      const tenantHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantToken}`,
      };

      group('5. Property Operations', () => {
        const propListRes = http.get(`${BASE_URL}/api/v1/properties`, {
          headers: tenantHeaders,
        });
        check(propListRes, {
          'list properties is 200': (r) => r.status === 200,
        });
      });

      group('6. Dashboard Analytics', () => {
        const metricsRes = http.get(`${BASE_URL}/api/v1/dashboard/metrics`, {
          headers: tenantHeaders,
        });
        check(metricsRes, {
          'get metrics is 200': (r) => r.status === 200,
        });
      });
    });
  });

  sleep(1);
}
