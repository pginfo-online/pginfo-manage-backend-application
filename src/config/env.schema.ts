import { z } from 'zod';

/**
 * Application environment schema validated at startup.
 * Every environment variable the app reads MUST be declared here.
 * If a required variable is missing, the application will fail fast
 * with a descriptive error before accepting any traffic.
 */
export const envSchema = z.object({
  // ── Application ──────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('api/v1'),
  APP_NAME: z.string().default('pginfo'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // ── PostgreSQL ───────────────────────────────────────────────
  DATABASE_URL: z.string().url(),

  // ── Redis ────────────────────────────────────────────────────
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_TLS_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),

  // ── JWT ──────────────────────────────────────────────────────
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  // ── Cloudinary ───────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),

  // ── Razorpay ─────────────────────────────────────────────────
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  PLATFORM_FEE_PAISE: z.coerce.number().int().nonnegative().default(3000), // Platform cut in paise (e.g. ₹30.00 = 3000 paise)

  // ── Email (Resend) ───────────────────────────────────────────
  RESEND_API_KEY: z.string().optional().default(''),
  RESEND_FROM_EMAIL: z
    .string()
    .email()
    .optional()
    .default('noreply@pginfo.local'),

  // ── WhatsApp ─────────────────────────────────────────────────
  WHATSAPP_API_URL: z.string().optional().default(''),
  WHATSAPP_API_KEY: z.string().optional().default(''),
  META_WHATSAPP_VERIFY_TOKEN: z.string().trim().default(''),
  META_WHATSAPP_APP_SECRET: z.string().trim().default(''),
  META_WHATSAPP_RENT_REMINDER_TEMPLATE: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]*$/)
    .default(''),
  META_WHATSAPP_ACCESS_TOKEN: z.string().trim().default(''),
  META_WHATSAPP_PHONE_NUMBER_ID: z.string().trim().regex(/^\d*$/).default(''),
  META_WHATSAPP_API_VERSION: z
    .string()
    .regex(/^v\d+\.\d+$/)
    .default('v23.0'),
  META_WHATSAPP_TEMPLATE_LANGUAGE: z
    .string()
    .regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/)
    .default('en'),
  META_WHATSAPP_TEMPLATE_PARAMETER_FORMAT: z
    .enum(['POSITIONAL', 'NAMED'])
    .default('POSITIONAL'),

  // ── CORS ─────────────────────────────────────────────────────
  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:3000,http://localhost:3001,http://localhost:5000,http://localhost:5173',
    )
    .transform((v) => v.split(',')),

  // ── Rate Limiting ────────────────────────────────────────────
  THROTTLE_TTL: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
});

export type EnvConfig = z.infer<typeof envSchema>;
