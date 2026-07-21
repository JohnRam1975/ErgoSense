#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REGISTRY="${1:?uso: $0 <registry> [tag]}"
TAG="${2:-1.0.0}"
REGISTRY="${REGISTRY%/}"
SKIP_PUSH="${SKIP_PUSH:-0}"

build_push() {
  local name="$1" df="$2"
  local full="${REGISTRY}/${name}:${TAG}"
  echo "=== BUILD ${full} ==="
  docker build -f "$df" -t "$full" .
  docker tag "$full" "${REGISTRY}/${name}:latest"
  if [ "$SKIP_PUSH" != "1" ]; then
    echo "=== PUSH ${full} ==="
    docker push "$full"
    docker push "${REGISTRY}/${name}:latest"
  fi
}

build_push ergosense-postgres infra/Dockerfile.postgres
build_push ergosense-api infra/Dockerfile.api
build_push ergosense-web infra/Dockerfile.web

echo "OK — IMAGE_REGISTRY=${REGISTRY} IMAGE_TAG=${TAG}"
echo "Compose: infra/docker-compose.yml"
