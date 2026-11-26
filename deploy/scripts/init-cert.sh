#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/deploy/.env"
COMPOSE_FILE="$ROOT_DIR/deploy/docker-compose.yml"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "File deploy/.env belum ada. Salin dari deploy/.env.example terlebih dahulu." >&2
    exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${DOMAIN:?DOMAIN wajib diisi}"
: "${ADMIN_EMAIL:?ADMIN_EMAIL wajib diisi}"

COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

"${COMPOSE[@]}" up -d nginx
"${COMPOSE[@]}" run --rm --entrypoint certbot certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "$ADMIN_EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

"${COMPOSE[@]}" up -d --force-recreate nginx
