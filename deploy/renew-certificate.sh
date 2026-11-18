#!/bin/sh
# Reload only after this backend certificate renews; leave other lineages alone.
set -eu
if [ "${RENEWED_LINEAGE:-}" = /etc/letsencrypt/live/pginfo.space ]; then
    /usr/sbin/nginx -t
    /bin/systemctl reload nginx
fi
