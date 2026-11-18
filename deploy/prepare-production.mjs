// Run once on the VPS from the backend root. Never prints credential values.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
try {
  if (existsSync('.env.production') || existsSync('.env.compose') || existsSync('deploy/secrets/redis.conf')) {
    throw new Error('Production files already exist; refusing to overwrite secrets');
  }
  const source = parseEnv(readFileSync(option('--source', '.env'), 'utf8'));
  const ca = option('--ca');
  if (!ca || !existsSync(ca)) throw new Error('Provide --ca with the trusted Supabase CA downloaded from its dashboard');
  const origins = option('--origins', '').split(',').filter(Boolean);
  if (origins.some((origin) => new URL(origin).origin !== origin || !origin.startsWith('https://'))) {
    throw new Error('Origins must be exact HTTPS origins without trailing slashes');
  }
  const port = Number(option('--port', '3109'));
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid loopback port');
  const tag = option('--tag', new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14));
  if (!/^[a-zA-Z0-9_.-]+$/.test(tag)) throw new Error('Invalid release tag');
  const url = new URL(source.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.password) throw new Error('Invalid database URL');
  // Current project uses Supavisor SESSION mode (5432), compatible with migrations.
  if (url.port !== '5432') throw new Error('Review connection mode; this deployment expects session mode on port 5432');
  url.searchParams.set('sslmode', 'require');
  url.searchParams.set('sslaccept', 'strict');
  url.searchParams.set('sslcert', '/app/deploy/certs/supabase-ca.crt');
  url.searchParams.set('connection_limit', '5');
  url.searchParams.set('connect_timeout', '10');
  url.searchParams.set('pool_timeout', '20');
  const password = randomBytes(48).toString('hex');
  const env = {
    ...source,
    NODE_ENV: 'production', PORT: '3000', API_PREFIX: 'api/v1', LOG_LEVEL: 'info',
    DATABASE_URL: url.toString(), REDIS_HOST: 'redis', REDIS_PORT: '6379',
    REDIS_PASSWORD: password, REDIS_TLS_ENABLED: 'false',
    JWT_SECRET: randomBytes(64).toString('hex'),
    JWT_REFRESH_SECRET: randomBytes(64).toString('hex'),
    CORS_ORIGINS: origins.join(','),
    WHATSAPP_API_URL: '', WHATSAPP_API_KEY: '',
  };
  if (!env.PLATFORM_FEE_PAISE) env.PLATFORM_FEE_PAISE = '3000';
  if (!env.RESEND_API_KEY || /xxxx|your_/i.test(env.RESEND_API_KEY)) {
    env.RESEND_API_KEY = '';
    env.RESEND_FROM_EMAIL = 'noreply@pginfo.space';
    console.log('Email disabled: provide a real Resend key and verified sender to enable delivery.');
  }
  if (!env.RESEND_FROM_EMAIL || /yourdomain|\.local$/.test(env.RESEND_FROM_EMAIL)) {
    throw new Error('Configure a verified RESEND_FROM_EMAIL');
  }
  if (!env.RAZORPAY_KEY_ID?.startsWith('rzp_live_') || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error('Configure live Razorpay credentials and the matching webhook signing secret');
  }
  const schema = (await import('../dist/config/env.schema.js')).envSchema;
  schema.parse(env);
  for (const value of Object.values(env)) {
    if (/[\r\n\0]/.test(value)) throw new Error('Multiline environment values are unsupported');
  }
  mkdirSync('deploy/secrets', { recursive: true, mode: 0o700 });
  chmodSync('deploy/secrets', 0o700);
  mkdirSync('deploy/certs', { recursive: true, mode: 0o755 });
  const targetCa = resolve('deploy/certs/supabase-ca.crt');
  if (resolve(ca) !== targetCa) copyFileSync(ca, targetCa);
  chmodSync(targetCa, 0o644);
  writeFileSync('.env.production', Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600, flag: 'wx' });
  writeFileSync('.env.compose', `RELEASE_TAG=${tag}\nPGINFO_API_PORT=${port}\n`, { mode: 0o600, flag: 'wx' });
  // Parent directory is 0700 on host; mounted config must be readable by container's redis UID.
  writeFileSync('deploy/secrets/redis_password', password, { mode: 0o644, flag: 'wx' });
  writeFileSync('deploy/secrets/redis.conf', [
    'bind 0.0.0.0', 'protected-mode yes', `requirepass ${password}`,
    'port 6379', 'dir /data', 'appendonly yes', 'appendfsync everysec',
    'maxmemory 128mb', 'maxmemory-policy noeviction',
    'save 900 1', 'save 300 10', 'loglevel notice',
  ].join('\n') + '\n', { mode: 0o644, flag: 'wx' });
  console.log('Created protected production configuration. No secrets printed. Review provider/webhook settings before launch.');
} catch {
  console.error('Preparation failed. Check required CA, provider credentials, HTTPS origins, source file, build output, and existing files. No secret values are printed.');
  process.exitCode = 1;
}
