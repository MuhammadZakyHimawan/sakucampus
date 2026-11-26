#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/deploy/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "File deploy/.env belum ada. Salin dari deploy/.env.example terlebih dahulu." >&2
    exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${DOMAIN:?DOMAIN wajib diisi}"
: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN wajib diisi}"
: "${TELEGRAM_WEBHOOK_SECRET:?TELEGRAM_WEBHOOK_SECRET wajib diisi}"

curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
    --data-urlencode "url=https://${DOMAIN}/api/v1/telegram/webhook" \
    --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET}"

printf '\n'
