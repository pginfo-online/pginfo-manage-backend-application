# PgInfo deployment execution record — 18 November 2026

This records the initial manual deployment. The backend subsequently moved to
GitHub Actions CI/CD at commit `1a177c8ee902e09128379dde80fd806fcfb0c4b9`.
The first [automated run](https://github.com/pginfo-online/pginfo-manage-backend-application/actions/runs/44259840030)
passed all checks and deployed successfully. Follow [the CI/CD guide](cicd.md)
for future updates; `/opt/pginfo/current` now points to its immutable CI release.

Target: **187.127.132.81**, SSH user `root`, port `22`.
Canonical backend: **https://pginfo.space**.
Release directory: `/opt/pginfo/releases/20261118-01`.
Compose project: `pginfo-prod`.

**Status: deployed and verified.** The API, worker, Redis, public HTTPS, database
readiness, queue delivery, and certificate renewal simulation all passed.

The previous IP `72.61.171.164` never received a deployment from this session.
There were no PgInfo files/services from this work to delete there. The domain's
A record was changed by the user to the new VPS. Public resolver caches may
temporarily retain the old record's four-hour TTL.

## Isolation and baseline

The new VPS runs Ubuntu 24.04.5 LTS, Docker 29.9.3, Compose 5.7.1, host Nginx,
Certbot 2.9.0, and PM2. It has two CPUs, approximately 8 GiB RAM, and had about
51 GiB free disk space and 3.7 GiB available memory before building.

Before PgInfo deployment, 47 existing containers and 53 Nginx hostnames were
recorded. Two containers were already in restart loops (`itjobx-nginx` and
`lovenzea-watchtower`); these were not repaired or reconfigured as part of PgInfo.
One PM2 process was already stopped. Baseline files are root-protected under
`/root/pginfo-deployment-audit` on the VPS. Existing Nginx site files were hashed
and the expanded configuration was backed up before the new host was enabled.

PgInfo has its own Docker network, Redis data volume, secrets, image, and project
name. Only the API publishes a port, **127.0.0.1:3109**. Existing Redis/database
containers and ports are not reused. Watchtower updates are explicitly disabled
for the PgInfo containers. There were no host firewall changes, package upgrades,
server reboots, Docker daemon restarts, or global PM2 restarts.

## Commands and configuration used

### 1. Local validation and production environment

From `C:\Users\ADMIN\Desktop\2030\PgInfoManage\backend`:

```powershell
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

31 test files / 121 tests passed. The email adapter now explicitly fails when
email credentials are absent in production and bounds provider requests to ten
seconds. Development-only email simulation is preserved.

The Supabase CA was fetched through authenticated HTTPS transport from:

```text
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt
```

Certificate subject: Supabase Root 2021 CA. SHA-256 of the downloaded PEM file:
`700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`.
Strict Prisma TLS authentication succeeded locally with this CA before upload.

```powershell
node deploy/prepare-production.mjs --source .env --ca deploy/certs/supabase-ca.crt --port 3109 --tag 20261118-01
tar.exe --exclude=.git --exclude=node_modules --exclude=dist --exclude=.env --exclude=.env.* --exclude=deploy/secrets --exclude=deploy/backups -czf "$env:TEMP\pginfo-20261118-01.tar.gz" .
```

The archive was inspected to confirm that it contained no `.env` files, secrets,
Git metadata, or local dependencies. Original `.env` contents were not changed.
Generated production JWT secrets are independent and random. Redis has a separate
random password. Database TLS uses `sslmode=require`, `sslaccept=strict`, and the
mounted CA. Prisma pools are capped at five connections per service.

No browser frontend origin has been supplied: `CORS_ORIGINS` is empty. Configure
exact HTTPS frontend origins when a browser frontend is introduced. Native
mobile/server clients are not governed by browser CORS. Resend is disabled until
a real key and verified sender are provided; email delivery now fails explicitly.
Cloudinary, live Razorpay, and Meta credentials passed read-only authentication
checks. Webhook signing-secret matching and actual message delivery were not
tested by creating payments or sending messages.

### 2. Secure upload and dedicated directories

SSH and SFTP used the server's already-known host key. Passwords and provider
credentials were never printed or included in this record.

```sh
install -d -m 0750 /opt/pginfo/releases/20261118-01
install -d -m 0700 /opt/pginfo/shared /opt/pginfo/shared/secrets
cd /opt/pginfo/releases/20261118-01
tar -xzf source.tar.gz
ln -s /opt/pginfo/shared/.env.production .env.production
ln -s /opt/pginfo/shared/secrets deploy/secrets
chmod 0600 .env.compose /opt/pginfo/shared/.env.production
```

SFTP placed the source archive and `.env.compose` in the release directory and
`.env.production` / Redis configuration in the root-only shared directory. Redis
config/password files have mode 0644 within their 0700 host parent directory so
the dedicated container Redis user can read the mounted files.

Equivalent manual transfer uses `scp -P 22`, as described in the main guide.
Do not overwrite or regenerate the shared production secrets on normal updates.

### 3. Resource-limited Linux build

```sh
cd /opt/pginfo/releases/20261118-01
docker compose --env-file .env.compose -f compose.production.yml config --quiet
docker buildx create --name pginfo-builder --driver docker-container \
  --driver-opt memory=1800m \
  --driver-opt cpu-period=100000 \
  --driver-opt cpu-quota=75000
docker buildx build --builder pginfo-builder --load --progress plain \
  -t pginfo-backend:20261118-01 .
docker buildx stop pginfo-builder
```

The builder was limited to 1800 MiB and 75% of one CPU, then stopped after a
successful build. Build output is in `/root/pginfo-deployment-audit/build.log`.
Image ID: `sha256:1945bb426a79995acc88042e911a76d04370ea9473e5cf4e017311058260d644`.
The Dockerfile uses Node 22 Alpine and the frozen pnpm lockfile.

### 4. Database audit and service startup

```sh
cd /opt/pginfo/releases/20261118-01
docker compose --env-file .env.compose -f compose.production.yml run --rm --no-deps api node deploy/audit-database.mjs
docker compose --env-file .env.compose -f compose.production.yml up -d --wait --wait-timeout 180 redis api worker
```

Database migration checks are read-only. The repository has 21 applied matching
migrations and no pending changes; no `migrate deploy`, seeds, resets, or schema
pushes were needed. The separate schema comparison found intentional SQL-created
indexes and UUID-default differences; none were removed or altered.

API and worker run as the image's non-root `node` user with a read-only filesystem,
temporary `/tmp`, dropped capabilities, process limits, bounded memory/CPU,
graceful shutdown, log rotation, and `unless-stopped` restart policies. Redis is
private, password-protected, persists AOF every second, and uses `noeviction`.

### 5. DNS and HTTPS

The user changed the apex A record to `187.127.132.81`. Host Nginx was retained;
only a new `pginfo-api` site was added. Its first HTTP-only configuration allowed
ACME validation. The challenge route was checked externally with `curl --resolve`.

```sh
install -d -m 0755 /var/www/pginfo-acme/.well-known/acme-challenge
install -m 0644 deploy/nginx-bootstrap.conf /etc/nginx/sites-available/pginfo-api
ln -s /etc/nginx/sites-available/pginfo-api /etc/nginx/sites-enabled/pginfo-api
nginx -t
systemctl reload nginx
certbot certonly --webroot -w /var/www/pginfo-acme \
  --cert-name pginfo.space -d pginfo.space --non-interactive --agree-tos
```

Let's Encrypt issued the certificate successfully. It expires **16 February
2027** and is stored at `/etc/letsencrypt/live/pginfo.space/`. Certbot's existing
scheduled renewal service manages renewal.

The final host configuration is `deploy/nginx.conf.example`: HTTP redirects to
HTTPS, ACME challenges retain their webroot, HTTPS proxies to 127.0.0.1:3109,
and API/auth rate limits are scoped to the PgInfo host. `/` maps to the backend
liveness response; normal API endpoints remain under `/api/v1`.
The authentication limit also matches case variants and an optional trailing
slash; a bounded preflight test confirmed those variants return HTTP 429 too.

```sh
cd /opt/pginfo/releases/20261118-01
install -m 0644 deploy/nginx.conf.example /etc/nginx/sites-available/pginfo-api
nginx -t
systemctl reload nginx
install -m 0750 deploy/renew-certificate.sh /etc/letsencrypt/renewal-hooks/deploy/pginfo-reload-nginx
certbot renew --dry-run --cert-name pginfo.space --run-deploy-hooks --no-random-sleep-on-renew --non-interactive
```

The scoped renewal hook reloads Nginx only when the PgInfo certificate renews.
The dry run and deploy hook succeeded (exit 0). `certbot.timer` is enabled and
active. The informational `nginx -t` messages are emitted on stderr by Nginx;
Certbot's phrase “error output” for those messages did not indicate a failure.

Redis's recorded digest:
`redis@sha256:7f7d30b7fdd09467bac58198a1f166dd69789d348d4fe859cccb20e0cf287fbe`.
The uploaded source archive SHA-256:
`5b1c5e2d7bdbd0b83075cc8349d533ad34ecc99195b381dce7d16e238b60e7c8`.

## Final verification

| Check | Result |
| --- | --- |
| `https://pginfo.space/` | HTTP 200, `{"status":"ok"}` |
| `/health/live` | HTTP 200 |
| `/health/ready` | HTTP 200, database up |
| `/api/v1/auth/me` without token | HTTP 401, as expected |
| `/api/docs` in production | HTTP 404, as expected |
| Plain HTTP | HTTP 301 to HTTPS |
| TLS | Publicly trusted Let's Encrypt certificate; curl verification passed |
| Normal workstation DNS + HTTPS | HTTP 200 without a forced IP |
| CORS for an unapproved origin | No allow-origin header |
| Bounded authentication rate-limit test | 11 preflights allowed, 3 HTTP 429 responses; no login/payment/message actions |
| Strict database TLS inside Linux image | Authenticated; 21 matching applied migrations; zero pending/unresolved |
| Billing queue | No-op job completed and removed |
| Communications queue | No-op job completed and removed |
| Redis | Authenticated PONG; AOF enabled; noeviction; 128 MiB maxmemory |
| API and worker | Healthy, non-root node, read-only root filesystem, zero restarts |
| Redis server process | UID 999; healthy; zero restarts; no published port |
| Certificate renewal | Staging renewal and scoped deploy hook passed |
| Existing containers | All 47 original IDs present; 45 previously stable containers unchanged |
| Existing restart loops | The same two pre-existing restart loops remain; not changed by this deployment |
| Existing Nginx site files | All recorded hashes unchanged |
| Existing HTTP hosts | All 53 retain their previous HTTP status |
| Existing PM2 apps | Names, PIDs, states, and restart counts unchanged |

At the final sample, the API used about 67 MiB, the worker 60 MiB, and Redis
4.4 MiB. These are idle measurements, not capacity/load-test results. The stopped
builder retains its cache for future releases without running in the background.

The health/delivery checks used:

```sh
cd /opt/pginfo/current
docker compose --env-file .env.compose -f compose.production.yml ps
curl --fail --silent http://127.0.0.1:3109/health/ready
docker compose --env-file .env.compose -f compose.production.yml exec -T api node deploy/verify-runtime.mjs
```

External verification can be repeated with:

```powershell
curl.exe --fail --silent --show-error https://pginfo.space/health/ready
curl.exe --resolve pginfo.space:443:187.127.132.81 --fail --silent --show-error https://pginfo.space/health/ready
```

The second command verifies the deployed host with the correct TLS hostname even
while some public DNS caches retain the old IP. Do not add `-k`: certificate
verification should remain enabled.

## Everyday operation and rollback

```sh
ssh root@187.127.132.81
cd /opt/pginfo/current
docker compose --env-file .env.compose -f compose.production.yml ps
docker compose --env-file .env.compose -f compose.production.yml logs --tail=100 api worker redis
docker compose --env-file .env.compose -f compose.production.yml restart worker
```

`/opt/pginfo/current` points to `releases/20261118-01`. Shared configuration lives
in `/opt/pginfo/shared`. Keep the project name `pginfo-prod` and avoid regenerating
JWT/Redis secrets on normal updates. Back up shared configuration securely;
never print it with `cat` or rendered Compose output.

For an application update, retain this image/source, create a new release/tag,
audit pending migrations, back up the database if migrations are needed, build,
and start the new release with the same project name. For a compatible rollback,
run the previous release's Compose `up -d --no-build --wait api worker`, then
recheck health/queue delivery. Do not automatically reverse migrations or delete
Redis volumes. Never use `down -v`, global Docker pruning, or global PM2 restarts.

For a clean removal of this deployment, first stop only its API/worker, disable
only `/etc/nginx/sites-enabled/pginfo-api`, validate/reload Nginx, and preserve
the dedicated Redis volume and shared secrets until backups and data retention
have been reviewed. Do not remove shared host services or other applications.

## Remaining integration considerations

Deployment is complete. These feature/configuration limitations remain separate
from service operation:

- Resend email is disabled until real credentials and a verified sender exist.
- Browser frontend CORS origins have not been supplied; native clients can use
  the API. Configure exact browser origins before connecting a web frontend.
- Razorpay's webhook URL must be configured as
  `https://pginfo.space/api/v1/webhooks/razorpay` with the matching signing secret
  in the provider dashboard. Payment collection and actual message delivery were
  not tested with live customer actions.
- Supabase backup/PITR plan and off-host backup restore procedures still need
  owner verification; deployment did not change project-wide SSL enforcement.
- No automatic billing/communications queue producers or recurring scheduler
  exist in the current code. A running worker alone does not add that automation.
- The supplied SSH password should be rotated after key-based access is verified.

For the full architecture/environment reference and future release checklist,
see `docs/vps-deployment.md`. Private baseline and final verification snapshots
are retained on the VPS in `/root/pginfo-deployment-audit`.
