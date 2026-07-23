#!/usr/bin/env bash
# Deploy ErgoSense — backup → pull → imagens → migrate → health → rollback automático
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"
COMPOSE="$ROOT/docker-compose.yml"
SKIP_GIT_PULL="${SKIP_GIT_PULL:-0}"
SKIP_MIGRATE="${SKIP_MIGRATE:-0}"
TAG="${TAG:-}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"
DUMP=""
PREV_PG=""; PREV_API=""; PREV_WEB=""

step() { echo -e "\n=== $* ==="; }

die_rollback() {
  local reason="$1"
  echo -e "\n!!! ROLLBACK: $reason" >&2
  if [[ -n "$DUMP" && -f "$DUMP" ]]; then
    step "Restaurando banco"
    CONFIRM_RESTORE=yes ENV_FILE="$ENV_FILE" "$ROOT/scripts/db-restore.sh" "$DUMP"
  fi
  if [[ -n "$PREV_API" ]]; then
    step "Restaurando tags de imagem"
    sed -i.bak \
      -e "s|^ERGOSENSE_POSTGRES_IMAGE=.*|ERGOSENSE_POSTGRES_IMAGE=$PREV_PG|" \
      -e "s|^ERGOSENSE_API_IMAGE=.*|ERGOSENSE_API_IMAGE=$PREV_API|" \
      -e "s|^ERGOSENSE_WEB_IMAGE=.*|ERGOSENSE_WEB_IMAGE=$PREV_WEB|" \
      "$ENV_FILE"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE" pull
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE" up -d --force-recreate
  fi
  exit 1
}

[[ -f "$ENV_FILE" ]] || { echo "Crie $ENV_FILE"; exit 1; }

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
PREV_PG="${ERGOSENSE_POSTGRES_IMAGE:-}"
PREV_API="${ERGOSENSE_API_IMAGE:-}"
PREV_WEB="${ERGOSENSE_WEB_IMAGE:-}"

step "1/6 Backup do banco"
DUMP="$("$ROOT/scripts/db-backup.sh")"
[[ -f "$DUMP" ]] || die_rollback "backup falhou"

if [[ "$SKIP_GIT_PULL" != "1" ]]; then
  step "2/6 git pull"
  git -C "$REPO" pull --ff-only || die_rollback "git pull falhou"
else
  step "2/6 git pull (skipped)"
fi

if [[ -n "$TAG" ]]; then
  step "Atualizando tags → $TAG"
  sed -i.bak \
    -e "s|^ERGOSENSE_POSTGRES_IMAGE=.*|ERGOSENSE_POSTGRES_IMAGE=ghcr.io/johnram1975/ergosense-postgres:$TAG|" \
    -e "s|^ERGOSENSE_API_IMAGE=.*|ERGOSENSE_API_IMAGE=ghcr.io/johnram1975/ergosense-api:$TAG|" \
    -e "s|^ERGOSENSE_WEB_IMAGE=.*|ERGOSENSE_WEB_IMAGE=ghcr.io/johnram1975/ergosense-web:$TAG|" \
    "$ENV_FILE"
fi

step "3/6 Pull imagens"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE" pull || die_rollback "pull falhou"

step "4/6 Recreate stack"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE" up -d --force-recreate || die_rollback "up falhou"

if [[ "$SKIP_MIGRATE" != "1" ]]; then
  step "5/6 Migrações"
  docker exec ergosense-backend node scripts/migrate-runner.js || die_rollback "migrações falharam"
else
  step "5/6 Migrações (skipped)"
fi

step "6/6 Health check"
deadline=$((SECONDS + HEALTH_TIMEOUT))
ok=0
while (( SECONDS < deadline )); do
  if docker exec ergosense-backend node -e "fetch('http://127.0.0.1:3001/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    ok=1; break
  fi
  sleep 5
done
(( ok == 1 )) || die_rollback "health timeout"

echo -e "\nDEPLOY OK"
echo "Backup: $DUMP"
