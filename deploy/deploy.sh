#!/usr/bin/env bash
# Runs on the server. Pulls the ref, rebuilds, brings the stack up and waits for
# the app to say it is healthy before declaring success.
set -euo pipefail

REF="${1:-main}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3300/healthz}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-300}"

cd "$(dirname "$0")/.."

COMPOSE="docker compose"
command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1 && COMPOSE="docker-compose"

[ -f .env ] || { echo "No .env - copy .env.example and fill it in."; exit 1; }
# exported so compose can interpolate ${…} in docker-compose.yml
set -a; . ./.env; set +a

: "${NUXT_SESSION_PASSWORD:?NUXT_SESSION_PASSWORD is empty - the session cookie cannot be sealed}"

git fetch --prune --tags origin
git checkout -B "$REF" "origin/$REF"
git reset --hard "origin/$REF"

$COMPOSE build --pull app
$COMPOSE up -d

echo "waiting for $HEALTH_URL"
deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
until curl -fsS "$HEALTH_URL" >/dev/null 2>&1; do
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "never became healthy; last 60 lines:"
    $COMPOSE logs --tail 60 app
    exit 1
  fi
  sleep 3
done

echo "healthy"
docker image prune -f
