# Backup Postgres do stack ErgoSense (Docker).
# Uso: powershell -File infra/scripts/db-backup.ps1 [-OutDir path]
param(
  [string]$OutDir = "",
  [string]$EnvFile = "",
  [string]$Container = "ergosense-db"
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
if (-not $EnvFile) { $EnvFile = Join-Path $Root "infra\.env" }
if (-not $OutDir) { $OutDir = Join-Path $Root "infra\backups" }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

if (-not (Test-Path $EnvFile)) { throw "env não encontrado: $EnvFile" }

$envMap = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    $envMap[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}

$DB = if ($envMap['POSTGRES_DB']) { $envMap['POSTGRES_DB'] } else { 'ergosense' }
$USER = if ($envMap['POSTGRES_USER']) { $envMap['POSTGRES_USER'] } else { 'postgres' }
$Stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$Dump = Join-Path $OutDir "ergosense-predeploy-$Stamp.dump"
$Meta = Join-Path $OutDir "ergosense-predeploy-$Stamp.meta.json"

Write-Host "[backup] dumping $DB from $Container → $Dump"
docker exec $Container pg_dump -U $USER -d $DB -Fc -f /tmp/ergosense.dump
if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou" }
docker cp "${Container}:/tmp/ergosense.dump" $Dump
docker exec $Container rm -f /tmp/ergosense.dump | Out-Null

$Bytes = (Get-Item $Dump).Length
if ($Bytes -lt 1000) { throw "dump muito pequeno ($Bytes bytes)" }

$metaObj = [ordered]@{
  createdAt = $Stamp
  container = $Container
  database  = $DB
  dump      = (Split-Path $Dump -Leaf)
  bytes     = $Bytes
  images    = @{
    postgres = $envMap['ERGOSENSE_POSTGRES_IMAGE']
    api      = $envMap['ERGOSENSE_API_IMAGE']
    web      = $envMap['ERGOSENSE_WEB_IMAGE']
  }
}
$metaObj | ConvertTo-Json | Set-Content -Path $Meta -Encoding utf8
Copy-Item $Dump (Join-Path $OutDir 'latest.dump') -Force
Copy-Item $Meta (Join-Path $OutDir 'latest.meta.json') -Force

Write-Host "[backup] OK bytes=$Bytes"
Write-Output $Dump
