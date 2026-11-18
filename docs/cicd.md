# Automated backend releases

Repository: https://github.com/pginfo-online/pginfo-manage-backend-application

Production: https://pginfo.space — VPS `187.127.132.81`.

## Normal updates

Commit and push your backend changes to `main`. GitHub Actions automatically:

1. Installs the frozen dependencies with Node 22 and pnpm 12.15.0.
2. Checks formatting, lint, TypeScript, unit tests, and compilation.
3. Applies every checked-in migration to a disposable CI PostgreSQL database and
   verifies HTTP liveness and database readiness.
4. Tests deployment command restrictions, archive isolation, migration guards,
   and automatic application rollback.
5. Builds a Linux/amd64 Docker image from the exact commit.
6. Starts a second isolated PostgreSQL/Redis/API/worker stack with that image,
   applies migrations, and exercises both queues using no-op jobs.
7. Transfers the tested image to the VPS through a restricted deployment key.
8. Audits the production database with strict TLS, replaces only PgInfo API and
   worker containers, verifies health and queue delivery, then updates `current`.
9. Checks public HTTPS from the GitHub runner with the correct hostname and VPS IP.

Pull requests run the checks and container smoke tests, without production access.
Pushing does not require SSH, uploading local files, changing DNS, or rebuilding
anything on the VPS. The VPS uses the exact image tested by Actions.

```powershell
git status
git diff
git add <changed-source-files>
git commit -m "Describe your update"
git push origin main
```

Follow the run at:
https://github.com/pginfo-online/pginfo-manage-backend-application/actions/workflows/ci.yml

Both **Checks** and **Deploy production** must be green. A failed check leaves the
current application running. There may be a brief PgInfo interruption while its
two containers are replaced; this is not a zero-downtime deployment topology.

## Database changes

The pipeline always tests migration SQL against disposable databases first.
An ordinary production push refuses deployment if there are pending migrations.
It does not silently change the live database.

For a schema release:

1. Review the SQL and confirm compatibility with both the new and previous app.
2. Verify a recent restorable production backup/snapshot and its recovery plan.
3. In Actions, select **Backend CI and production deployment → Run workflow**.
4. Select `main` and enable **apply_migrations** only after the checks above.

This rebuilds/tests the selected main commit, applies migrations once, then
deploys the application. Failed/unresolved migrations and old migration checksum
changes always block deployment. Never use reset, development migration commands,
or schema pushes against production. Application rollback does not reverse SQL.

## Secrets and access boundaries

The GitHub **production** environment permits only branch `main` and contains:

| Setting | Location / purpose |
| --- | --- |
| `VPS_DEPLOY_KEY` | Environment secret; dedicated Ed25519 key, not the root login |
| `VPS_KNOWN_HOSTS` | Environment secret; host key pinned from authenticated SSH |
| `VPS_HOST` | Environment variable: 187.127.132.81 |
| `VPS_USER` | Environment variable: pginfo-deploy |
| `VPS_PORT` | Environment variable: 22 |

Supabase, Razorpay, Cloudinary, Meta, JWT, and Redis secrets remain exclusively
in `/opt/pginfo/shared/.env.production` and the root-only shared secret directory.
Never commit `.env.production`, `.env.compose`, private keys, or Redis passwords.
CI uses only disposable test credentials. Docker build contexts exclude secrets.

The deployment SSH key has a forced command and disables PTY/forwarding. Its
account has no Docker group membership, writable home, general shell, or
unrestricted sudo access. The root-owned gateway accepts only validated receive,
deploy, and status commands for PgInfo. Uploaded archives cannot name other
application images, use filesystem traversal, or replace the runtime topology.

The VPS runs a fixed root-owned Compose policy from
`/opt/pginfo/deployment/compose.production.yml`. Application images run as UID/GID
1000, with a read-only filesystem, dropped capabilities, no new privileges,
resource limits, and the existing loopback-only port. Runtime health/audit tools
are baked into each image. Redis remains the same running container and volume.
Nginx, TLS, other Docker projects, and PM2 are not modified by application deploys.

The GitHub workflow and VPS controller both prevent concurrent production
rollouts. Active deployments are not canceled by a newer push. All third-party
Actions are pinned to full commit hashes; the workflow token has contents-read
permission and no package/repository write permission. No registry password or
self-hosted runner is installed on the shared VPS.

## Release history, rollback, and maintenance

Every image/release uses `<40-character-commit>-<workflow-run-id>-<attempt>`.
Directories and image tags are immutable. `/opt/pginfo/current` changes only after
the new API, worker, database readiness, and queue delivery pass. Metadata in
`release.json` records the previous release. Audit events are root-only in
`/opt/pginfo/state/deployments.jsonl`.

If API/worker activation or queue verification fails, the controller restores the
previous application release and verifies HTTPS readiness. Actions stays red so
the failure is visible. If rollback itself fails, the log explicitly requires
administrator action. No automatic database downgrade is attempted.

Administrator commands:

```sh
ssh root@187.127.132.81
/usr/local/sbin/pginfo-ci status
cd /opt/pginfo/current
docker compose --env-file .env.compose -f compose.production.yml logs --tail=100 api worker
```

For a manual app rollback, inspect the previous path in `release.json`, verify
schema compatibility, then run that release's Compose `up -d --no-build --no-deps
--wait api worker`, recheck health, and change `current` to that directory. Keep
the Redis volume. Never run global Docker pruning or global PM2 restart commands.

Actions artifacts expire after three days; the VPS keeps successful images for
rollback and removes the uploaded image bundle after successful deployment.
Monitor disk use and retain a reviewed set of previous PgInfo images. Remove only
specific unused PgInfo images after confirming rollback retention; never prune
unrelated projects. Failed upload/release bundles may require administrator cleanup.

Changing the controller, gateway, runtime topology, DNS, or TLS requires an
administrator-reviewed server update. Pushing an edited controller file does not
install it as root. To rotate the CI key, install a replacement restricted public
key on the deployment account and replace the encrypted environment secret,
verify deployment, then revoke the old public key. Never share the root password
with Actions.

## References

- [GitHub deployment environments and concurrency](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments)
- [Docker image builds in GitHub Actions](https://docs.docker.com/build/ci/github-actions/)
