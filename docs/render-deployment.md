# Deploy PgInfo on Render

This guide deploys the NestJS API as a Render Web Service and runs its BullMQ
processors in a separate Background Worker. Both services use a managed
PostgreSQL database and Render Key Value in the same Render region.

## 1. Prepare the infrastructure

1. Push the backend repository to a Git provider connected to Render. The
   backend directory is the repository root for these instructions.
2. In Render, create a PostgreSQL database and a Key Value instance in the same
   region as the services. Use their **internal** connection details.
3. Keep the database and Key Value on persistent plans suitable for production.
   Render's free database has a limited lifetime and should not be used for
   production data.

## 2. Create the API Web Service

Create a Web Service for the repository with:

| Setting           | Value                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Runtime           | Node                                                                                                   |
| Root Directory    | `.` (the backend repository root)                                                                      |
| Build Command     | `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm prisma generate && pnpm build` |
| Start Command     | `node dist/main.js`                                                                                    |
| Health Check Path | `/health/ready`                                                                                        |

Use Node.js 22 or newer and pnpm 9 or newer. The build installs development
dependencies because Prisma CLI is a development dependency, generates the
Prisma client, and compiles the API. The service listens on Render's `PORT` and
binds to `0.0.0.0`.

### Database migrations

Configure Render's **Pre-Deploy Command** as:

```sh
pnpm exec prisma migrate deploy
```

This applies checked-in Prisma migrations before the new API version receives
traffic. Do not use `prisma migrate dev` or `prisma db push` in production.
Render availability for pre-deploy commands depends on the service plan. If
your plan does not provide this setting, run `pnpm exec prisma migrate deploy`
once as a controlled release step using the same build and production database
environment before deploying the API. Avoid putting migrations in the start
command, which can run concurrently when multiple instances start.

## 3. Configure environment variables

Set these in the Render dashboard for the API service. Never upload or commit
your local `.env`; enter credentials as Render environment variables.

| Variable             | Value                                                                            |
| -------------------- | -------------------------------------------------------------------------------- |
| `NODE_ENV`           | `production`                                                                     |
| `DATABASE_URL`       | Render PostgreSQL **internal** connection string                                 |
| `REDIS_HOST`         | Host from the Key Value **internal** connection details                          |
| `REDIS_PORT`         | Port from the Key Value internal connection details                              |
| `REDIS_PASSWORD`     | Password if internal authentication is enabled; otherwise leave empty            |
| `REDIS_TLS_ENABLED`  | `false` when using the internal `redis://` connection                            |
| `JWT_SECRET`         | New, random, private secret of at least 16 characters                            |
| `JWT_REFRESH_SECRET` | A different new, random, private secret of at least 16 characters                |
| `CORS_ORIGINS`       | Comma-separated exact browser origins, e.g. `https://your-frontend.onrender.com` |
| `API_PREFIX`         | `api/v1`                                                                         |
| `LOG_LEVEL`          | `info`                                                                           |

Render supplies `PORT`; do not hardcode it. Keep the Key Value service private
to Render's internal network. If you enable Key Value internal authentication,
configure its password in `REDIS_PASSWORD` on both services. Do not use an
external Redis URL unless its TLS/authentication settings are configured
accordingly.

Generate JWT secrets independently, for example with a cryptographically secure
password generator. Do not reuse the development secrets from `.env`. Store
payment, storage, email, and messaging credentials only in Render's environment
settings:

| Feature            | Variables                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Cloudinary uploads | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`                                             |
| Razorpay payments  | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`                                                |
| Resend email       | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`                                                                              |
| WhatsApp provider  | `WHATSAPP_API_URL`, `WHATSAPP_API_KEY`, or Meta's `META_WHATSAPP_ACCESS_TOKEN` and `META_WHATSAPP_PHONE_NUMBER_ID` |

Only configure integrations you intend to use. For production payments, use
live provider credentials and configure the provider webhook URL as
`https://<your-api-host>/api/v1/webhooks/razorpay`; keep webhook signing
secrets private.

## 4. Create the Background Worker

Create a Render **Background Worker** from the same repository and region:

| Setting        | Value                             |
| -------------- | --------------------------------- |
| Runtime        | Node                              |
| Root Directory | `.` (the backend repository root) |
| Build Command  | Same as the API Web Service       |
| Start Command  | `node dist/worker.js`             |

Copy the API's production environment variables to the worker, including the
same `DATABASE_URL`, Redis connection settings, and JWT/provider credentials
needed by its modules. The worker does not need a web health-check path. Keep
at least one worker instance running so queued billing and communications jobs
are processed.

## 5. Deploy and verify

Deploy both services, then check:

- `https://<your-api-host>/health/live` returns `{"status":"ok"}`.
- `https://<your-api-host>/health/ready` reports the database as healthy.
- The API responds under `https://<your-api-host>/api/v1`.
- The worker logs show it started and connected to its queue backend.
- Your frontend's `CORS_ORIGINS` value matches its exact `https://` origin
  (scheme and hostname, without a path or trailing slash).
- Configure the frontend to use `https://<your-api-host>/api/v1` as its API
  base URL. Do not use `localhost` or an Android-emulator address in a
  production build.

If a deploy fails, inspect the Render service logs first. Startup validation
reports missing or malformed required settings; database readiness failures
usually indicate an incorrect database URL, network/region mismatch, or a
migration that has not been applied.
