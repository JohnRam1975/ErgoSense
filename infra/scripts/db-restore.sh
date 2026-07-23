#!/usr/bin/env bash
# Restaura Postgres a partir de dump -Fc gerado por db-backup.sh
# Uso: ./infra/scripts/db-restore.sh [caminho.dump]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/.env}"
CONTAINER="${DB_CONTAINER:-ergosense-db}"
DUMP="${1:-$ROOT/infra/backups/latest.dump}"

if [[ ! -f "$DUMP" ]]; then
  echo "ERR: dump não encontrado: $DUMP" >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERR: env não encontrado: $ENV_FILE" >&2
  exit 1
fi

set -a; source "$ENV_FILE"; set +a
DB="${POSTGRES_DB:-ergosense}"
USER="${POSTGRES_USER:-postgres}"

echo "[restore] ATENÇÃO: recria o banco $DB a partir de $DUMP"
if [[ "${CONFIRM_RESTORE:-}" != "yes" ]]; then
  echo "Defina CONFIRM_RESTORE=yes para continuar." >&2
  exit 1
fi

docker cp "$DUMP" "$CONTAINER:/tmp/ergosense-restore.dump"
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-}" "$CONTAINER" \
  psql -U "$USER" -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB' AND pid <> pg_backend_pid();"
docker exec "$CONTAINER" psql -U "$USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $DB;"
docker exec "$CONTAINER" psql -U "$USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $DB OWNER $USER;"
docker exec "$CONTAINER" pg_restore -U "$USER" -d "$DB" --no-owner --no-acl /tmp/ergosense-restore.dump || true
docker exec "$CONTAINER" rm -f /tmp/ergosense-restore.dump

TABLES=$(docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -t -A -c "SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema='public';")
echo "[restore] OK public_tables=$TABLES"
