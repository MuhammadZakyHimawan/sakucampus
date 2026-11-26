#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/deploy/.env"
COMPOSE_FILE="$ROOT_DIR/deploy/docker-compose.yml"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "File deploy/.env belum ada. Salin dari deploy/.env.example terlebih dahulu." >&2
    exit 1
fi

COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

"${COMPOSE[@]}" build backend frontend nginx
"${COMPOSE[@]}" up -d --remove-orphans

HEALTHY=false
for _ in {1..30}; do
    if "${COMPOSE[@]}" exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready', timeout=2).read()" >/dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    sleep 2
done

if [[ "$HEALTHY" != true ]]; then
    echo "Backend tidak lolos health check /health/ready setelah deploy." >&2
    exit 1
fi

"${COMPOSE[@]}" exec -T backend alembic current
