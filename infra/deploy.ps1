# Deploy ErgoSense (Windows) — backup → pull → build/pull images → migrate → health → rollback automático
#
# Pré-requisito: infra/.env (ou -EnvFile) com secrets fortes (gere via generate-production-env.ps1).
#
# Uso:
#   powershell -File infra/deploy.ps1
#   powershell -File infra/deploy.ps1 -SkipGitPull -SkipBuild
param(
  [string]$EnvFile = "",
  [string]$Tag = "",
  [switch]$SkipGitPull,
  [switch]$SkipBuild,
  [switch]$SkipMigrate,
  [int]$HealthTimeoutSec = 180
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $EnvFile) { $EnvFile = Join-Path $Root ".env" }
$ComposeFile = Join-Path $Root "docker-compose.yml"
$BackupScript = Join-Path $PSScriptRoot "db-backup.ps1"
$RestoreScript = Join-Path $PSScriptRoot "db-restore.ps1"

function Write-Step([string]$msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

if (-not (Test-Path $EnvFile)) { throw "Crie $EnvFile a partir de .env.production.example / generate-production-env.ps1" }
if (-not (Test-Path $ComposeFile)) { throw "Compose não encontrado: $ComposeFile" }

$envMap = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    $envMap[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}

$prev = @{
  postgres = $envMap['ERGOSENSE_POSTGRES_IMAGE']
  api      = $envMap['ERGOSENSE_API_IMAGE']
  web      = $envMap['ERGOSENSE_WEB_IMAGE']
}

$dumpPath = $null
$rolledBack = $false

function Invoke-Rollback([string]$reason) {
  Write-Host "`n!!! ROLLBACK: $reason" -ForegroundColor Red
  $script:rolledBack = $true
  if ($dumpPath -and (Test-Path $dumpPath)) {
    Write-Step "Restaurando banco do backup"
    & $RestoreScript -Dump $dumpPath -EnvFile $EnvFile -ConfirmRestore
  }
  if ($prev.api) {
    Write-Step "Restaurando tags de imagem anteriores"
    $lines = Get-Content $EnvFile
    $lines = $lines | ForEach-Object {
      if ($_ -match '^\s*ERGOSENSE_POSTGRES_IMAGE\s*=') { "ERGOSENSE_POSTGRES_IMAGE=$($prev.postgres)" }
      elseif ($_ -match '^\s*ERGOSENSE_API_IMAGE\s*=') { "ERGOSENSE_API_IMAGE=$($prev.api)" }
      elseif ($_ -match '^\s*ERGOSENSE_WEB_IMAGE\s*=') { "ERGOSENSE_WEB_IMAGE=$($prev.web)" }
      else { $_ }
    }
    Set-Content -Path $EnvFile -Value $lines -Encoding utf8
    docker compose --env-file $EnvFile -f $ComposeFile pull
    docker compose --env-file $EnvFile -f $ComposeFile up -d --force-recreate
  }
  throw "Deploy falhou e rollback foi executado: $reason"
}

try {
  Write-Step "1/6 Backup do banco"
  $dumpPath = (& $BackupScript -EnvFile $EnvFile | Select-Object -Last 1).ToString().Trim()
  if (-not (Test-Path $dumpPath)) { throw "Backup não gerou dump" }

  if (-not $SkipGitPull) {
    Write-Step "2/6 git pull"
    Push-Location (Join-Path $Root "..")
    git pull --ff-only
    Pop-Location
  } else {
    Write-Step "2/6 git pull (skipped)"
  }

  if ($Tag) {
    Write-Step "Atualizando tags de imagem → $Tag"
    $lines = Get-Content $EnvFile
    $lines = $lines | ForEach-Object {
      if ($_ -match '^\s*ERGOSENSE_POSTGRES_IMAGE\s*=') { "ERGOSENSE_POSTGRES_IMAGE=ghcr.io/johnram1975/ergosense-postgres:$Tag" }
      elseif ($_ -match '^\s*ERGOSENSE_API_IMAGE\s*=') { "ERGOSENSE_API_IMAGE=ghcr.io/johnram1975/ergosense-api:$Tag" }
      elseif ($_ -match '^\s*ERGOSENSE_WEB_IMAGE\s*=') { "ERGOSENSE_WEB_IMAGE=ghcr.io/johnram1975/ergosense-web:$Tag" }
      else { $_ }
    }
    Set-Content -Path $EnvFile -Value $lines -Encoding utf8
  }

  Write-Step "3/6 Pull/Build Docker"
  if ($SkipBuild) {
    docker compose --env-file $EnvFile -f $ComposeFile pull
  } else {
    # Prefer pull de imagens publicadas; build local opcional via docker-publish
    docker compose --env-file $EnvFile -f $ComposeFile pull
  }
  if ($LASTEXITCODE -ne 0) { Invoke-Rollback "docker compose pull falhou" }

  Write-Step "4/6 Recreate stack"
  docker compose --env-file $EnvFile -f $ComposeFile up -d --force-recreate
  if ($LASTEXITCODE -ne 0) { Invoke-Rollback "docker compose up falhou" }

  if (-not $SkipMigrate) {
    Write-Step "5/6 Migrações (via API container / RUN_MIGRATIONS)"
    # entrypoint já migra; força re-run se necessário
    docker exec ergosense-backend node scripts/migrate-runner.js
    if ($LASTEXITCODE -ne 0) { Invoke-Rollback "migrações falharam" }
  } else {
    Write-Step "5/6 Migrações (skipped)"
  }

  Write-Step "6/6 Health check"
  $deadline = (Get-Date).AddSeconds($HealthTimeoutSec)
  $ok = $false
  while ((Get-Date) -lt $deadline) {
    try {
      $h = Invoke-RestMethod -Uri "http://127.0.0.1:$(($envMap['PUBLIC_HTTP_PORT']))/api/health/ready" -TimeoutSec 5
      if ($h.ok -eq $true -or $h.status -eq 'ok') { $ok = $true; break }
    } catch {
      try {
        docker exec ergosense-backend node -e "fetch('http://127.0.0.1:3001/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
        if ($LASTEXITCODE -eq 0) { $ok = $true; break }
      } catch {}
    }
    Start-Sleep -Seconds 5
  }
  if (-not $ok) { Invoke-Rollback "health check timeout (${HealthTimeoutSec}s)" }

  Write-Host "`nDEPLOY OK" -ForegroundColor Green
  Write-Host "Backup: $dumpPath"
}
catch {
  if (-not $rolledBack) {
    try { Invoke-Rollback $_.Exception.Message } catch { throw }
  }
  throw
}
