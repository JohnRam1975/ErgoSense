<#
.SYNOPSIS
  Build e push das imagens ErgoSense para registry (Hostinger só faz pull).

.EXAMPLE
  .\scripts\docker\build-and-push.ps1 -Registry meuuser -Tag 1.0.0
  .\scripts\docker\build-and-push.ps1 -Registry ghcr.io/meuorg -Tag 1.0.0 -AlsoLatest
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Registry,

  [string]$Tag = "1.0.0",

  [switch]$AlsoLatest = $true,

  [switch]$SkipPush
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root

$Registry = $Registry.TrimEnd("/")
$images = @(
  @{ Name = "ergosense-api"; Dockerfile = "infra/docker/Dockerfile.api" },
  @{ Name = "ergosense-web"; Dockerfile = "infra/docker/Dockerfile.web" },
  @{ Name = "ergosense-postgres"; Dockerfile = "infra/docker/Dockerfile.postgres" }
)

Write-Host "Root: $Root"
Write-Host "Registry: $Registry  Tag: $Tag"

foreach ($img in $images) {
  $full = "$Registry/$($img.Name):$Tag"
  Write-Host "`n=== BUILD $full ===" -ForegroundColor Cyan
  docker build -f $img.Dockerfile -t $full .
  if ($LASTEXITCODE -ne 0) { throw "Build falhou: $($img.Name)" }

  if ($AlsoLatest) {
    docker tag $full "$Registry/$($img.Name):latest"
  }

  if (-not $SkipPush) {
    Write-Host "=== PUSH $full ===" -ForegroundColor Green
    docker push $full
    if ($LASTEXITCODE -ne 0) { throw "Push falhou: $full" }
    if ($AlsoLatest) {
      docker push "$Registry/$($img.Name):latest"
    }
  }
}

Write-Host "`nPronto. No Hostinger use:" -ForegroundColor Yellow
Write-Host "  IMAGE_REGISTRY=$Registry"
Write-Host "  IMAGE_TAG=$Tag"
Write-Host "Compose: infra/hostinger/docker-compose.yml"
