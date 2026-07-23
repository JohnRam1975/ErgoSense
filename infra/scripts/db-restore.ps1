# Restaura Postgres a partir de dump -Fc gerado por db-backup.ps1
# Uso: powershell -File infra/scripts/db-restore.ps1 [-Dump path] -ConfirmRestore
param(
  [string]$Dump = "",
  [string]$EnvFile = "",
  [string]$Container = "ergosense-db",
  [switch]$ConfirmRestore
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
if (-not $EnvFile) { $EnvFile = Join-Path $Root "infra\.env" }
if (-not $Dump) { $Dump = Join-Path $Root "infra\backups\latest.dump" }

if (-not (Test-Path $Dump)) { throw "dump não encontrado: $Dump" }
if (-not (Test-Path $EnvFile)) { throw "env não encontrado: $EnvFile" }
if (-not $ConfirmRestore -and $env:CONFIRM_RESTORE -ne "yes") {
  throw "Passe -ConfirmRestore ou CONFIRM_RESTORE=yes"
}

$envMap = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    $envMap[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}
$DB = if ($envMap['POSTGRES_DB']) { $envMap['POSTGRES_DB'] } else { 'ergosense' }
$USER = if ($envMap['POSTGRES_USER']) { $envMap['POSTGRES_USER'] } else { 'postgres' }

Write-Host "[restore] recriando $DB a partir de $Dump"
docker cp $Dump "${Container}:/tmp/ergosense-restore.dump"
docker exec $Container psql -U $USER -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB' AND pid <> pg_backend_pid();" | Out-Null
docker exec $Container psql -U $USER -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $DB;"
docker exec $Container psql -U $USER -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $DB OWNER $USER;"
docker exec $Container pg_restore -U $USER -d $DB --no-owner --no-acl /tmp/ergosense-restore.dump
# pg_restore pode retornar 1 com warnings
docker exec $Container rm -f /tmp/ergosense-restore.dump | Out-Null

$Tables = docker exec $Container psql -U $USER -d $DB -t -A -c "SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema='public';"
Write-Host "[restore] OK public_tables=$Tables"
