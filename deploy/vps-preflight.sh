#!/usr/bin/env bash
# Read-only inventory. Store output privately; nginx output may include internal paths.
set -euo pipefail
printf '\n== OS and capacity ==\n'
id
uname -a
cat /etc/os-release
uptime
free -h
df -h /
printf '\n== Listening ports ==\n'
ss -lntup
printf '\n== Existing services ==\n'
systemctl --type=service --state=running --no-pager
printf '\n== Container inventory ==\n'
if command -v docker >/dev/null; then
    docker version
    docker compose version
    docker compose ls
    docker ps --format '{{.ID}} {{.Names}} {{.Image}} {{.Status}} {{.Ports}}'
    docker network ls
    docker stats --no-stream
fi
printf '\n== Reverse proxy ==\n'
if command -v nginx >/dev/null; then nginx -t; fi
printf '\n== Firewall ==\n'
if command -v ufw >/dev/null; then ufw status verbose; fi
printf '\n== Existing PgInfo paths ==\n'
for path in /opt/pginfo /srv/pginfo /etc/nginx/sites-enabled/pginfo-api; do
    if [ -e "$path" ]; then ls -ld "$path"; fi
done
printf '\nPreflight only. No system settings or services were changed.\n'
