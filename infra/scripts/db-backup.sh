#!/usr/bin/env bash
# Backup Postgres do stack ErgoSense (Docker).
# Uso: ./infra/scripts/db-backup.sh [destino_dir]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/.env}"
OUT_DIR="${1:-$ROOT/infra/backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CONTAINER="${DB_CONTAINER:-ergosense-db}"

mkdir -p "$OUT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERR: env não encontrado: $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
DB="${POSTGRES_DB:-ergosense}"
USER="${POSTGRES_USER:-postgres}"

DUMP="$OUT_DIR/ergosense-predeploy-$STAMP.dump"
META="$OUT_DIR/ergosense-predeploy-$STAMP.meta.json"

echo "[backup] dumping $DB from $CONTAINER → $DUMP"
docker exec "$CONTAINER" pg_dump -U "$USER" -d "$DB" -Fc -f /tmp/ergosense.dump
docker cp "$CONTAINER:/tmp/ergosense.dump" "$DUMP"
docker exec "$CONTAINER" rm -f /tmp/ergosense.dump

BYTES=$(wc -c < "$DUMP" | tr -d ' ')
if [[ "$BYTES" -lt 1000 ]]; then
  echo "ERR: dump muito pequeno ($BYTES bytes)" >&2
  exit 1
fi

cat > "$META" <<EOF
{
  "createdAt": "$STAMP",
  "container": "$CONTAINER",
  "database": "$DB",
  "dump": "$(basename "$DUMP")",
  "bytes": $BYTES,
  "images": {
    "postgres": "${ERGOSENSE_POSTGRES_IMAGE:-}",
    "api": "${ERGOSENSE_API_IMAGE:-}",
    "web": "${ERGOSENSE_WEB_IMAGE:-}"
  }
}
EOF

ln -sfn "$(basename "$DUMP")" "$OUT_DIR/latest.dump" 2>/dev/null || cp "$DUMP" "$OUT_DIR/latest.dump"
ln -sfn "$(basename "$META")" "$OUT_DIR/latest.meta.json" 2>/dev/null || cp "$META" "$OUT_DIR/latest.meta.json"

echo "[backup] OK bytes=$BYTES"
echo "$DUMP"
