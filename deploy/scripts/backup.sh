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

: "${POSTGRES_USER:?POSTGRES_USER wajib diisi}"
: "${POSTGRES_DB:?POSTGRES_DB wajib diisi}"

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/deploy/backups}"
mkdir -p "$BACKUP_DIR"
OUTPUT="$BACKUP_DIR/sakucampus-$(date -u +%Y%m%dT%H%M%SZ).dump"

COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

"${COMPOSE[@]}" exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$OUTPUT"

echo "Backup dibuat: $OUTPUT"
