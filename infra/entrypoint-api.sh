#!/bin/sh
set -e

echo "[ergosense-api] starting (NODE_ENV=${NODE_ENV:-production})"

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[ergosense-api] running migrations..."
  node scripts/migrate-runner.js
  echo "[ergosense-api] migrations done"
fi

if [ -n "${SEED_GLOBAL_ADMIN_EMAIL:-}" ] && [ -n "${SEED_GLOBAL_ADMIN_PASSWORD:-}" ]; then
  echo "[ergosense-api] seeding global admin..."
  node scripts/seed-global-admin.js || echo "[ergosense-api] seed skipped/failed (non-fatal)"
fi

exec node src/index.js