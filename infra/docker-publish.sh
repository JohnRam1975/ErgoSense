#!/usr/bin/env bash
# Publica imagens ErgoSense no GHCR (mesmo padrão FinCare).
# Uso: ./infra/docker-publish.sh [tag]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REGISTRY="${REGISTRY:-ghcr.io}"
OWNER="${OWNER:-johnram1975}"
TAG="${1:-latest}"
SKIP_PUSH="${SKIP_PUSH:-0}"

if [ "$SKIP_PUSH" != "1" ]; then
  echo "=== Login GHCR ==="
  TOKEN="$(gh auth token)"
  USER="$(gh api user --jq .login)"
  echo "$TOKEN" | docker login "$REGISTRY" -u "$USER" --password-stdin
fi

build_push() {
  local name="$1" df="$2"
  local full="${REGISTRY}/${OWNER}/${name}:${TAG}"
  echo "=== BUILD ${full} ==="
  docker build -f "$df" -t "$full" .
  if [ "$SKIP_PUSH" != "1" ]; then
    echo "=== PUSH ${full} ==="
    docker push "$full"
  fi
}

build_push ergosense-postgres infra/Dockerfile.postgres
build_push ergosense-api infra/Dockerfile.api
build_push ergosense-web infra/Dockerfile.web

echo "OK"
echo "ERGOSENSE_POSTGRES_IMAGE=${REGISTRY}/${OWNER}/ergosense-postgres:${TAG}"
echo "ERGOSENSE_API_IMAGE=${REGISTRY}/${OWNER}/ergosense-api:${TAG}"
echo "ERGOSENSE_WEB_IMAGE=${REGISTRY}/${OWNER}/ergosense-web:${TAG}"
echo "Deixe packages Public: https://github.com/users/${OWNER}/packages"
