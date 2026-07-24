#!/usr/bin/env bash
# Gera infra/.env.production com secrets seguros (openssl/node).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.env.production"
DOMAIN="${DOMAIN:-https://ergosense.dejohn.com.br}"
TAG="${IMAGE_TAG:-20260723-forgotfix}"

if [[ -f "$OUT" && "${FORCE:-}" != "1" ]]; then
  echo "Já existe $OUT — use FORCE=1 para regenerar" >&2
  exit 1
fi

gen() { openssl rand -base64 48 | tr '+/' '-_' | tr -d '=\n'; }

JWT_A=$(gen); JWT_R=$(gen); MFA_E=$(gen); MFA_P=$(gen)
METRICS=$(gen); PG=$(gen); MINIO=$(gen); SEED=$(gen); SK=$(gen)

cat > "$OUT" <<EOF
# ErgoSense — PRODUÇÃO (NÃO COMMITAR)
# Gerado em $(date -u +%Y-%m-%dT%H:%M:%SZ)

ERGOSENSE_POSTGRES_IMAGE=ghcr.io/johnram1975/ergosense-postgres:$TAG
ERGOSENSE_API_IMAGE=ghcr.io/johnram1975/ergosense-api:$TAG
ERGOSENSE_WEB_IMAGE=ghcr.io/johnram1975/ergosense-web:$TAG

PUBLIC_HTTP_PORT=8088
APP_PUBLIC_URL=$DOMAIN
CORS_ORIGINS=$DOMAIN

NODE_ENV=production
POSTGRES_DB=ergosense
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$PG

MINIO_ROOT_USER=ergosense
MINIO_ROOT_PASSWORD=$MINIO
STORAGE_DRIVER=minio
STORAGE_BUCKET=ergosense-media

JWT_ACCESS_SECRET=$JWT_A
JWT_REFRESH_SECRET=$JWT_R
MFA_ENCRYPTION_KEY=$MFA_E
MFA_PENDING_SECRET=$MFA_P
SECRET_KEY=$SK
METRICS_TOKEN=$METRICS

MFA_ENABLED=true
CSRF_ENABLED=true
TRUST_PROXY=true
RATE_LIMIT_SKIP_DEV=false
TENANT_ENFORCE=true
RUN_MIGRATIONS=true
LOG_LEVEL=info

REDIS_ENABLED=true
SESSION_REDIS_ENABLED=true

SEED_GLOBAL_ADMIN_EMAIL=ergosense@dejohn.com.br
SEED_GLOBAL_ADMIN_PASSWORD=$SEED
PURGE_DEMO_TENANTS=true
SUPPORT_CONTACT_EMAIL=ergosense.suporte@dejohn.com.br

AI_PROVIDER=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
EOF

cat > "$ROOT/.env.admin-credentials.local" <<EOF
# Credencial admin global (gitignored). Guarde em local seguro.
SEED_GLOBAL_ADMIN_EMAIL=ergosense@dejohn.com.br
SEED_GLOBAL_ADMIN_PASSWORD=$SEED
E2E_GLOBAL_EMAIL=ergosense@dejohn.com.br
E2E_GLOBAL_PASSWORD=$SEED
EOF

echo "Gerado: $OUT"
echo "Admin global (guarde agora — nao aparece de novo no git):"
echo "  email: ergosense@dejohn.com.br"
echo "  senha: $SEED"
echo "Copia local: $ROOT/.env.admin-credentials.local"
