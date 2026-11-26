#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/deploy/.env"
COMPOSE_FILE="$ROOT_DIR/deploy/docker-compose.yml"
BACKUP_FILE="${1:?Usage: bash deploy/scripts/restore.sh <file.dump>}"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "File deploy/.env belum ada. Salin dari deploy/.env.example terlebih dahulu." >&2
    exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "File backup tidak ditemukan: $BACKUP_FILE" >&2
    exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${POSTGRES_USER:?POSTGRES_USER wajib diisi}"
: "${POSTGRES_DB:?POSTGRES_DB wajib diisi}"

read -r -p "Restore akan menimpa database. Ketik RESTORE untuk lanjut: " CONFIRM
if [[ "$CONFIRM" != "RESTORE" ]]; then
    echo "Dibatalkan."
    exit 1
fi

COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

"${COMPOSE[@]}" stop backend nginx
"${COMPOSE[@]}" exec -T db pg_restore --clean --if-exists --no-owner --no-privileges \
    -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$BACKUP_FILE"
"${COMPOSE[@]}" up -d backend nginx
