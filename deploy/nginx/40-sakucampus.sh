#!/bin/sh
set -eu

if [ -z "${DOMAIN:-}" ]; then
    echo "DOMAIN environment variable is required" >&2
    exit 1
fi

CERT_FILE="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

if [ -f "$CERT_FILE" ]; then
    envsubst '${DOMAIN}' < /etc/nginx/sakucampus-templates/app.conf.template > /etc/nginx/conf.d/app.conf
    CHECKSUM="$(sha256sum "$CERT_FILE" | awk '{print $1}')"

    (
        while :; do
            sleep 300
            NEW_CHECKSUM="$(sha256sum "$CERT_FILE" 2>/dev/null | awk '{print $1}' || true)"

            if [ -n "$NEW_CHECKSUM" ] && [ "$NEW_CHECKSUM" != "$CHECKSUM" ]; then
                nginx -s reload || true
                CHECKSUM="$NEW_CHECKSUM"
            fi
        done
    ) &
else
    envsubst '${DOMAIN}' < /etc/nginx/sakucampus-templates/bootstrap.conf.template > /etc/nginx/conf.d/app.conf
fi
