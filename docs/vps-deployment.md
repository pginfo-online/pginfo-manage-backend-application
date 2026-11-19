# PgInfo VPS deployment guide and review

For current automated releases, follow [CI/CD and rollback](cicd.md). The first
[full automated run](https://github.com/pginfo-online/pginfo-manage-backend-application/actions/runs/44259840030)
passed and deployed commit `1a177c8`. Manual release steps below remain a
reference for administrator recovery and infrastructure changes.

Review date: 18 November 2026 (Asia/Kolkata).

**Status: deployed and verified on 187.127.132.81 at https://pginfo.space.**
See [the execution record](vps-deployment-20261118.md) for actual commands,
image/digest, checks, renewal results, and existing-application comparisons.
The previous target 72.61.171.164 received no deployment from this session.

The sections below retain the preparation and future-release reference. The
execution record documents the completed deployment. Never paste passwords or production environment contents into logs,
Git, support chats, or `docker compose config` output.

## 1. Architecture and verified findings

| Component | Entry point / role | Deployment |
| --- | --- | --- |
| API | `src/main.ts` → `AppModule`; NestJS 12 / Express; REST under `/api/v1` | One non-root Node container, internal port 3000 |
| Worker | `src/worker.ts` → `WorkerModule`; BullMQ billing and communications processors | Separate non-root Node container; no HTTP port |
| Redis | BullMQ transport and application cache/client | Dedicated password-protected Redis; persistent AOF; no published port |
| Database | Prisma 6 / PostgreSQL; Supabase session pooler, Mumbai, port 5432 | Existing hosted database; do not create a local production PostgreSQL instance |
| Storage | Cloudinary | Existing remote service |
| Payments | Razorpay live API; signed webhook | Existing remote service; webhook configuration still needs dashboard verification |
| Messaging | Meta WhatsApp Cloud API v23.0 | Existing remote service |
| Email | Resend | Not configured: local key and sender are placeholders |
| Edge | Existing VPS reverse proxy, to be inventoried | Add only a separate API virtual host and certificate |

The application is a modular monolith covering identity, organizations,
properties/rooms/beds, residents, finance, expenses, maintenance, staff,
communications, reporting, leads, bookings, meters, reviews, templates, and
platform administration. API and worker share the same Prisma schema and external
credentials. Both need database access. The worker imports finance and
communications modules but opens no HTTP listener.

Authentication uses JWT access tokens, Argon2 password hashes, and opaque refresh
tokens stored as hashes. Although `JWT_REFRESH_SECRET` and refresh expiration are
validated, the current refresh implementation uses random tokens and a hardcoded
seven-day lifetime rather than signing refresh JWTs. Do not assume that changing
`JWT_REFRESH_EXPIRATION` changes current behavior.

Completed read-only external checks:

- Supabase database login and a read-only metadata transaction succeeded.
- All **21** migration directories match applied database migration names and
  checksums. No pending or unresolved migrations were found. This verifies the
  migration ledger, not a full schema-drift or data-integrity audit.
- A separate read-only Prisma schema comparison found 23 database indexes absent
  from the Prisma datamodel and database-side UUID defaults on `platform_admins`,
  `admin_cases`, and `platform_settings` where the datamodel uses client-side
  UUID generation. The checked-in admin/search/dashboard SQL migrations explain
  those differences. Do not apply the diff's proposed index removals or use
  `db push` to force the database to the datamodel: that would remove intentional
  search/performance indexes. No differences were applied.
- A Prisma connection with `sslmode=require` succeeded. Independent system-CA
  certificate verification failed with a self-signed chain error. Download the
  correct CA from the Supabase dashboard and validate strict TLS before launch.
  `pg_stat_ssl` queried through Supavisor describes the pooler-to-Postgres leg,
  not the workstation-to-pooler leg; it did not report TLS for that backend leg.
  Review project SSL enforcement in Supabase as well. Do not change it blindly
  while other database clients may be running.
- Cloudinary authenticated `GET /ping`: HTTP 200.
- Razorpay authenticated, read-only payments access: HTTP 200. The key is **live**.
- Meta authenticated, read-only phone ID access: HTTP 200.
- No payments, transfers, messages, customer records, or migrations were created
  by these checks. Webhook signing secret and sender/template delivery remain
  unverified; API authentication alone does not establish those capabilities.
- `pginfo.space` and `www.pginfo.space` resolved to **2.57.91.91** and served HTTPS.
  `api.pginfo.space` had no DNS resolution. The user confirmed that
  **pginfo.space is the backend hostname**, not a frontend website hostname.
  Inspect its current service before switching DNS or routing.

Source review identified these operational limits:

- Worker processors handle `generate-monthly-dues`, `reconcile-monthly-autopay`,
  `send-announcement`, and `send-rent-reminders`, but there are no current API queue
  producers or recurring schedulers. Most business requests execute directly.
  Do not promise automatic monthly billing or scheduled announcements merely
  because a worker is running. Implement and review scheduling separately.
- Nest's throttler module is configured but no throttler guard is applied.
  The supplied Nginx template adds independent request limits. If using another
  proxy, configure equivalent limits before exposing authentication endpoints.
- `/health/live` checks process liveness. `/health/ready` checks the database,
  not Redis. The supplied container checks add Redis and worker checks.
- The worker health check assumes this deployment's one worker; it checks that
  BullMQ has connected consumers for both queues. It is not per-replica proof
  when scaling to multiple workers. No-op queue smoke tests provide delivery
  verification without executing customer billing or messaging actions.
- Express does not currently trust proxy headers. Edge rate limits use the real
  client IP, but application `req.ip` may be the proxy/container gateway. Configure
  trusted proxy CIDRs deliberately if application-level IP auditing is required;
  never enable unrestricted trust while the app is directly reachable.
- `LOG_LEVEL` is declared but not wired into Pino's level setting. Production
  removes pretty printing; don't assume this variable currently controls levels.
- The existing Dockerfile retains development dependencies and Prisma CLI in the
  runtime image. This supports controlled migrations but increases image size;
  a later optimized image should separate migration tooling from runtime.
- Docker marks containers unhealthy but does not restart them solely for that
  status. `unless-stopped` restarts exited processes. Add external uptime and
  resource alerts and investigate unhealthy status promptly.

The email adapter was hardened locally: missing/placeholder email credentials
now report failure in production, rather than a simulated success, and provider
requests have a ten-second timeout. Development simulation is preserved.

## 2. Resolve access and DNS

In the VPS provider panel, confirm the IP is correct, the server is running,
and the SSH username/port. Allow SSH from the administrator's public IP in the
provider firewall. Use the provider console to inspect SSH if necessary. Avoid
resetting the firewall or restarting unrelated applications.

From PowerShell:

```powershell
Test-NetConnection 187.127.132.81 -Port 22
ssh -p 22 root@187.127.132.81
```

Replace `root` and `22` with the confirmed values. Verify the first SSH host key
fingerprint using the provider console. Do not use `StrictHostKeyChecking=no`.
Enter the password only at the SSH password prompt. After working key-based
access is verified, rotate the shared password. Do not disable password/root
login until an alternative administrative login is proven to work.

After inspecting the current service and preparing the VPS, update the backend
apex DNS record:

```text
Type: A
Name: @
Value: 187.127.132.81
```

The apex currently points to 2.57.91.91. Changing it switches traffic away from
that host: inspect the current service, verify the replacement, and retain the
old DNS record for rollback. Review any apex AAAA record for compatibility.
Leave `www` unchanged unless its use is established. The intended URLs:

```text
Backend:  https://pginfo.space/api/v1
Frontend: not yet specified
Webhook:  https://pginfo.space/api/v1/webhooks/razorpay
```

## 3. Inventory the VPS before making changes

Upload and run the read-only inventory script:

```powershell
scp -P 22 .\deploy\vps-preflight.sh root@187.127.132.81:/tmp/pginfo-preflight.sh
ssh -p 22 root@187.127.132.81 'bash /tmp/pginfo-preflight.sh'
```

Review the running apps, ports, Docker projects/networks, proxy, disk, RAM, and
firewall. Record each existing application's URL, HTTP status, service/container
identity, start time, and restart count as a baseline. Keep inventory privately.

The prepared service limits total 1.25 GiB RAM and 1.75 CPUs, excluding builds,
Docker, the operating system, Redis AOF overhead, and existing apps. Measure real
headroom; these values are starting limits, not measured PgInfo requirements.
Build off-host and transfer an image if an on-host build could starve existing
apps. Do not start until the chosen API port (3109 by default) is free and the
`pginfo-prod` Compose project is not owned by an existing deployment.

If Docker already runs existing applications, reuse it without daemon changes.
If it is absent, follow Docker's official instructions for the detected OS;
package installation must be planned after inventory. Do not run blanket system
upgrades, Docker daemon restarts, `docker system prune`, `docker compose down`,
global PM2 restarts, or firewall resets.

## 4. Prepare a reproducible local release

These local validation commands were run against the frozen lockfile:

```powershell
Set-Location C:\Users\ADMIN\Desktop\2030\PgInfoManage\backend
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

Node must satisfy `>=22`; use Node 22 as in the Dockerfile. pnpm is pinned to
`12.15.0`. The local check used Node 24.16.0; the actual Node 22 Linux Docker image
still needs to be built and exercised. Docker CLI exists locally, but the Linux
Docker engine was not running during this review.

Final local checks: 31 test files and 121 tests passed, TypeScript checking,
Nest compilation, lint, changed TypeScript formatting, script syntax, and Compose
configuration validation passed. The Linux image was subsequently built on the
VPS and passed startup, strict database TLS, queue delivery, and HTTPS checks.

Download the **trusted Supabase server root CA** from the project's dashboard
database settings. Obtain it through the authenticated dashboard, not by trusting
the certificate received from the failing database connection.

Generate separate production configuration on this workstation after the build:

```powershell
node deploy/prepare-production.mjs --source .env --ca C:\secure\supabase-ca.crt --port 3109 --tag 20261118-01
```

This generates `.env.production`, `.env.compose`, `deploy/certs/supabase-ca.crt`,
and `deploy/secrets/redis.conf` / `redis_password`. It refuses to overwrite existing
production files. Run from the backend root. Protect generated files using
Windows ACLs and keep them out of shared folders. POSIX modes become effective on
the Linux VPS; do not rely on `chmod` alone for Windows protection.

The script generates independent random JWT secrets and a Redis password, sets
production mode, forces strict database TLS with the mounted CA, caps database
connections at five per service, removes placeholder generic WhatsApp credentials,
and leaves browser CORS origins empty unless `--origins` is supplied. It preserves
the original local `.env`.

Keep real provider credentials from the existing `.env`. Email stays disabled
until a real Resend key and verified sender are configured. To enable email, use
the verified sender in `RESEND_FROM_EMAIL`; the generated fallback address is a
configuration default, not proof of domain verification. The backend hostname
does not establish a frontend origin. Once the browser frontend hostname is
known, pass its exact HTTPS origin with `--origins`. Until then cross-origin
browser access is disabled; native mobile/server clients can still use the API.

Environment review:

| Variables | Production requirement |
| --- | --- |
| `NODE_ENV`, `PORT`, `API_PREFIX`, `APP_NAME` | production, 3000 inside container, api/v1, pginfo |
| `DATABASE_URL` | Existing session pooler credentials; sslmode=require; sslaccept=strict; trusted sslcert; connection_limit=5; pool_timeout=20; connect_timeout=10 |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS_ENABLED` | redis, 6379, newly generated password, false on dedicated bridge network |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Independent generated secrets; never local development values |
| `JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION` | 15m and 7d; refresh implementation limitation described above |
| `CLOUDINARY_*` | Existing authenticated credentials; verify actual upload rules separately |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Existing authenticated live credentials; no test transactions during deployment |
| `RAZORPAY_WEBHOOK_SECRET` | Must match provider dashboard; not verifiable by API key check |
| `PLATFORM_FEE_PAISE` | 3000 default; confirm intended business fee before collecting money |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Real key and verified sender to enable delivery; otherwise email fails explicitly |
| `WHATSAPP_API_URL`, `WHATSAPP_API_KEY` | Empty when using direct Meta credentials |
| `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID` | Existing authenticated credentials; confirm token lifetime/permissions operationally |
| `META_WHATSAPP_API_VERSION`, `META_WHATSAPP_TEMPLATE_LANGUAGE`, `META_WHATSAPP_TEMPLATE_PARAMETER_FORMAT` | v23.0, en, POSITIONAL defaults; match approved templates |
| `CORS_ORIGINS` | Exact browser frontend HTTPS origins when known; empty by default |
| `THROTTLE_TTL`, `THROTTLE_LIMIT` | 60000 and 100; currently no guard, use proxy protection |
| `LOG_LEVEL` | info intended; Pino wiring limitation described above |

Package source without local secrets or dependencies:

```powershell
tar.exe --exclude=.git --exclude=node_modules --exclude=dist --exclude=.env --exclude=.env.* --exclude=deploy/secrets --exclude=deploy/backups -czf "$env:TEMP\pginfo-20261118-01.tar.gz" .
```

Inspect the archive listing before upload. Do not include credentials in the
archive. Transfer secrets separately through SSH/SCP.

## 5. Upload into a dedicated directory

Only after inventory confirms these paths are available:

```sh
install -d -m 0750 /opt/pginfo/releases/20261118-01
install -d -m 0700 /opt/pginfo/shared
```

From PowerShell (substitute the confirmed SSH port/user):

```powershell
scp -P 22 "$env:TEMP\pginfo-20261118-01.tar.gz" root@187.127.132.81:/opt/pginfo/releases/20261118-01/source.tar.gz
scp -P 22 .env.production root@187.127.132.81:/opt/pginfo/shared/.env.production
scp -P 22 .env.compose root@187.127.132.81:/opt/pginfo/releases/20261118-01/.env.compose
scp -P 22 -r deploy/secrets root@187.127.132.81:/opt/pginfo/shared/
```

On the VPS:

```sh
cd /opt/pginfo/releases/20261118-01
tar -xzf source.tar.gz
chmod 0700 /opt/pginfo/shared /opt/pginfo/shared/secrets
chmod 0600 /opt/pginfo/shared/.env.production .env.compose
chmod 0644 /opt/pginfo/shared/secrets/redis.conf /opt/pginfo/shared/secrets/redis_password
ln -s /opt/pginfo/shared/.env.production .env.production
ln -s /opt/pginfo/shared/secrets deploy/secrets
```

The Redis files are readable inside their specific containers; their parent
directory is root-only on the host. The application image runs as `node`, and the
Redis image drops privileges to its Redis user. `.dockerignore` excludes secrets
and backups from build contexts. Anyone with Docker/root access can inspect
container environments; restrict that access.

## 6. Build, verify strict database TLS, and review migrations

Require a Docker Compose version supporting `env_file.format: raw` (2.30+).
Raw mode prevents special characters in credentials from being interpolated.
Never print fully rendered Compose configuration containing production secrets.

```sh
cd /opt/pginfo/releases/20261118-01
docker compose --env-file .env.compose -f compose.production.yml config --quiet
docker compose --env-file .env.compose -f compose.production.yml build api
docker compose --env-file .env.compose -f compose.production.yml run --rm --no-deps api node deploy/audit-database.mjs
```

The read-only audit must succeed with `strictCertificateVerification: true`, zero
checksum mismatches, and zero unresolved migrations. It uses the production CA
inside the image's filesystem. If certificate validation fails, correct the CA or
connection settings; do not disable verification.

At review time there are **zero pending migrations**, so there is no database
change to apply for this source revision. Recheck immediately before deployment.
Before any future pending migration, verify a recent restorable Supabase backup
or snapshot and review each SQL file for table locks/data changes. If another app
shares this database, evaluate migration compatibility for that app too.

For reviewed, backed-up pending migrations only:

```sh
docker compose --env-file .env.compose -f compose.production.yml run --rm --no-deps api node node_modules/prisma/build/index.js migrate status
docker compose --env-file .env.compose -f compose.production.yml run --rm --no-deps api node node_modules/prisma/build/index.js migrate deploy
```

Run migration deployment once as a controlled release step. Do not place it in
both API and worker startup commands. Use session/direct connections for migration
tooling; do not switch this URL to transaction-pooler port 6543 blindly. Never run
`migrate reset`, `migrate dev`, `db push`, development seeds, or admin bootstrap
against production as part of normal deployment.

## 7. Start private services and verify delivery

```sh
docker compose --env-file .env.compose -f compose.production.yml up -d --wait --wait-timeout 180 redis api worker
docker compose --env-file .env.compose -f compose.production.yml ps
curl --fail --silent --show-error http://127.0.0.1:3109/health/live
curl --fail --silent --show-error http://127.0.0.1:3109/health/ready
docker compose --env-file .env.compose -f compose.production.yml exec -T api node deploy/verify-runtime.mjs
docker compose --env-file .env.compose -f compose.production.yml logs --tail=100 api worker redis
```

The no-op test adds one uniquely identified `deployment-smoke-test` job to each
queue, waits for completion, and removes completed test jobs. Existing processors
return null for unknown job names; no customer business operation is executed.
Do not use real billing/reminder jobs as deployment smoke tests.

Confirm Redis replies to authenticated PING and has the intended persistence:

```sh
docker compose --env-file .env.compose -f compose.production.yml exec -T redis sh -c 'export REDISCLI_AUTH="$(cat /run/secrets/redis_password)"; redis-cli ping; redis-cli CONFIG GET appendonly maxmemory maxmemory-policy'
ss -lntp
```

Only `127.0.0.1:3109` should be published for this app. There must be no new
public PostgreSQL/Redis ports. Redis uses AOF (`appendfsync everysec`) and
`noeviction`; approximately one second of writes can be lost in a crash. Back up
Redis data and alerts; memory-full errors require investigation, not eviction of
BullMQ keys. If Redis data is lost, do not blindly replay financial operations.

## 8. Add HTTPS without replacing an existing proxy

Inspect the existing proxy configuration and certificate management first. If the
VPS runs Caddy, Traefik, an ingress container, or a panel-managed proxy, add the
API host there. **Do not install another proxy competing for ports 80/443.** A
containerized proxy cannot reach the host's loopback through its own loopback;
design its private upstream network after inventory instead of publishing the API
to all interfaces.

For an existing host Nginx, privately back up `/etc/nginx` and run `nginx -T`.
Use a new `pginfo-api` virtual host only. The template in
`deploy/nginx.conf.example` assumes host Nginx and an upstream on 127.0.0.1:3109.
It uses `pginfo.space`; change the upstream port if inventory requires it.

First install a temporary HTTP-only host serving ACME challenges:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name pginfo.space;
    location /.well-known/acme-challenge/ {
        root /var/www/pginfo-acme;
    }
    location / { return 404; }
}
```

Enable only this new file according to the server's existing Nginx conventions,
create `/var/www/pginfo-acme`, then validate and reload:

```sh
nginx -t
systemctl reload nginx
```

Once API DNS resolves correctly, obtain a certificate using the existing ACME
client. For an already-installed Certbot:

```sh
certbot certonly --webroot -w /var/www/pginfo-acme -d pginfo.space
```

Then replace only the new API host with the supplied HTTPS template. It preserves
the ACME challenge location and redirects other HTTP requests to HTTPS, so webroot
renewal keeps working. Keep existing sites untouched.
The `limit_req_zone` directives belong in Nginx's `http` context; `sites-enabled`
normally sits there, but verify the actual include layout.

```sh
nginx -t
systemctl reload nginx
certbot renew --dry-run --cert-name pginfo.space
```

Use a deploy hook restricted to this certificate to reload Nginx after renewal,
following the VPS's existing certificate-management conventions. Do not alter
renewal hooks belonging to other applications.

If no Nginx/proxy exists, install/configure one only after checking the detected
OS, ports, package changes, and resource headroom. These commands are conditional
instructions, not an assertion that Nginx is installed on this VPS.

## 9. External checks and frontend/provider configuration

From a machine outside the VPS:

```powershell
Resolve-DnsName pginfo.space
curl.exe --fail --silent --show-error https://pginfo.space/health/live
curl.exe --fail --silent --show-error https://pginfo.space/health/ready
curl.exe -i -X OPTIONS https://pginfo.space/api/v1/auth/login -H "Origin: https://frontend.example.com" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: Content-Type"
curl.exe -i https://pginfo.space/api/v1/auth/me
```

Replace the CORS test origin with the actual configured frontend origin; skip
that test while none is configured. Expected: valid public TLS, health HTTP 200,
CORS allows exactly the configured origin, unauthenticated `/auth/me` returns 401.
Also verify an unapproved origin
does not receive an allow-origin header; CORS is a browser policy, not API
authentication. Confirm production `/api/docs` is not exposed and security headers
are present. Rate limits should return 429 on excessive requests; perform bounded
checks without loading the shared VPS.

Set the frontend/mobile API base URL to
`https://pginfo.space/api/v1`. Review its current configuration before changing
or rebuilding it; it was not changed by this backend review.

In Razorpay, set the webhook URL to the HTTPS endpoint above, confirm the exact
signing secret, and select events actually handled in
`src/modules/finance/application/razorpay-webhook.service.ts`. Use provider test
tools under an approved test workflow; do not create live charges just to prove
deployment. Verify provider retries and idempotency behavior separately.

Confirm approved Meta template names/languages/parameter formats and long-lived
token operation. Configure a verified Resend sender if email is required. No
messages were sent during this review.

Recheck every existing application's baseline URLs, service/container identity,
restart count, memory, and logs. Record the final PgInfo image ID/digest, release
tag, migrations, DNS, certificate expiry, and health/queue results. Only then call
the deployment complete.

## 10. Operation, backup, and rollback

Always run Compose with `--env-file .env.compose -f compose.production.yml` from
the selected release directory. The fixed project name is `pginfo-prod`; never use
another app's Compose files or container names.

```sh
docker compose --env-file .env.compose -f compose.production.yml ps
docker compose --env-file .env.compose -f compose.production.yml logs --tail=200 api worker
docker compose --env-file .env.compose -f compose.production.yml restart worker
docker compose --env-file .env.compose -f compose.production.yml stop api worker
```

Stopping PgInfo does not require stopping Redis or any other app. Keep Redis
volumes. Never run `down -v`. Logs rotate at 10 MiB × 3 files per container.
Monitor uptime, failed/delayed queue counts, memory/disk, AOF health, Supabase
connection limits, provider errors, certificate expiry, and backup restores.

Keep encrypted backups of shared production configuration and Redis volumes
outside the VPS. Use the Supabase backup/PITR capabilities available on the actual
project plan, and test restores to an isolated database. A volume by itself is
not an off-host backup.

For updates, create a new release directory with a new immutable release tag,
reuse the shared production secrets, repeat audit/build/health checks, and run
Compose from the new directory with the same `pginfo-prod` project name. Keep the
previous source/config/image. Avoid regenerating JWT/Redis secrets on each deploy.
No-downtime deployment of PgInfo itself is not guaranteed with this single-API
layout; plan a brief controlled replacement or implement blue/green deployment.

For an application rollback, confirm the schema is backward compatible, then run
the previous release's Compose `up -d --no-build --wait api worker`. Recheck health
and queues. Do not reverse migrations, restore over a live database, or downgrade
Redis data automatically. If the first deployment fails before exposure, stop
only PgInfo API/worker and disable only the new API proxy host after `nginx -t`.

## Official references used

- [BullMQ production guidance](https://docs.bullmq.io/guide/going-to-production):
  persistence, Redis noeviction, worker operation.
- [Supabase Prisma guide](https://supabase.com/docs/guides/database/prisma):
  pooler modes and migration connections.
- [Supabase SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement):
  certificate validation and both pooler connection legs.
- [Prisma 6 PostgreSQL connector](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql):
  sslmode, sslaccept, sslcert, pool limits.

## Deployment outcome

SSH access, VPS inventory, DNS cutover, certificate issuance/renewal simulation,
trusted Supabase CA, Linux build, healthy service startup, external HTTPS, queue
delivery, and before/after existing-application comparisons all passed on the new
VPS. See the execution record for exact results. Provider webhook configuration,
email enablement, browser frontend origins, backup ownership, and application
scheduling limitations remain described separately there.
