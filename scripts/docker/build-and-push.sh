#!/usr/bin/env bash
# Build + push imagens ErgoSense (Hostinger só faz pull)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

REGISTRY="${1:?uso: $0 <registry> [tag]}"
TAG="${2:-1.0.0}"
REGISTRY="${REGISTRY%/}"

build_push() {
  local name="$1" df="$2"
  local full="${REGISTRY}/${name}:${TAG}"
  echo "=== BUILD ${full} ==="
  docker build -f "$df" -t "$full" .
  docker tag "$full" "${REGISTRY}/${name}:latest"
  echo "=== PUSH ${full} ==="
  docker push "$full"
  docker push "${REGISTRY}/${name}:latest"
}

build_push ergosense-api infra/docker/Dockerfile.api
build_push ergosense-web infra/docker/Dockerfile.web
build_push ergosense-postgres infra/docker/Dockerfile.postgres

echo
echo "Hostinger env:"
echo "  IMAGE_REGISTRY=${REGISTRY}"
echo "  IMAGE_TAG=${TAG}"
