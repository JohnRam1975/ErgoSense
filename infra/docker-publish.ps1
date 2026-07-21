# Publica imagens ErgoSense no GitHub Container Registry (GHCR) — grátis.
# Mesmo fluxo do FinCare (scripts/docker-publish.ps1).
#
# Uso (na raiz do repo):
#   powershell -File infra/docker-publish.ps1
#   powershell -File infra/docker-publish.ps1 -Tag v1.0.0
#   powershell -File infra/docker-publish.ps1 -SkipPush   # só build local

param(
  [string]$Registry = "ghcr.io",
  [string]$Owner = "johnram1975",
  [string]$Tag = "latest",
  [switch]$AlsoLatest = $true,
  [switch]$SkipPush
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

$images = @(
  @{ Name = "ergosense-postgres"; Dockerfile = "infra/Dockerfile.postgres" },
  @{ Name = "ergosense-api"; Dockerfile = "infra/Dockerfile.api" },
  @{ Name = "ergosense-web"; Dockerfile = "infra/Dockerfile.web" }
)

Write-Host "Root: $Root"
Write-Host "Registry: $Registry/$Owner  Tag: $Tag"

if (-not $SkipPush) {
  Write-Host ""
  Write-Host "=== Login GHCR ===" -ForegroundColor Cyan
  $token = gh auth token
  if (-not $token) { throw "gh auth token vazio. Rode: gh auth login" }
  $user = (gh api user --jq ".login")
  $token | docker login $Registry -u $user --password-stdin
  if ($LASTEXITCODE -ne 0) { throw "docker login falhou" }
}

foreach ($img in $images) {
  $full = "$Registry/$Owner/$($img.Name):$Tag"
  Write-Host ""
  Write-Host "=== BUILD $full ===" -ForegroundColor Cyan
  docker build -f $img.Dockerfile -t $full .
  if ($LASTEXITCODE -ne 0) { throw "Build falhou: $($img.Name)" }

  if ($AlsoLatest -and $Tag -ne "latest") {
    docker tag $full "$Registry/$Owner/$($img.Name):latest"
  }

  if (-not $SkipPush) {
    Write-Host "=== PUSH $full ===" -ForegroundColor Green
    docker push $full
    if ($LASTEXITCODE -ne 0) { throw "Push falhou: $full" }
    if ($AlsoLatest -and $Tag -ne "latest") {
      docker push "$Registry/$Owner/$($img.Name):latest"
    }
  }
}

Write-Host ""
Write-Host "OK" -ForegroundColor Yellow
Write-Host "ERGOSENSE_POSTGRES_IMAGE=$Registry/$Owner/ergosense-postgres:$Tag"
Write-Host "ERGOSENSE_API_IMAGE=$Registry/$Owner/ergosense-api:$Tag"
Write-Host "ERGOSENSE_WEB_IMAGE=$Registry/$Owner/ergosense-web:$Tag"
Write-Host ""
Write-Host "Deixe os packages Public em:"
Write-Host "https://github.com/users/$Owner/packages"
Write-Host "Compose: infra/docker-compose.yml"
