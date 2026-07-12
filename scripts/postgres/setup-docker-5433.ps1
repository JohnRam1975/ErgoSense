# ErgoSense — criar banco na mesma instância do warehouse (Docker, porta 5433)
$ErrorActionPreference = "Stop"
$Psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$env:PGPASSWORD = "!Mamao@melancia#vaca1975Come%peixe"
$Port = 5433

Write-Host "Porta $Port (Docker / pgAdmin PostgreSQL 17)..." -ForegroundColor Cyan
& $Psql -U postgres -h localhost -p $Port -f "$Root\scripts\postgres\02-init-ergosense-docker.sql"

Write-Host "Schema legado (app atual)..." -ForegroundColor Cyan
& $Psql -U postgres -h localhost -p $Port -d ergosense -f "$Root\docs\database\postgresql-schema-full.sql"

Write-Host "Dados iniciais..." -ForegroundColor Cyan
& $Psql -U postgres -h localhost -p $Port -d ergosense -f "$Root\docs\database\postgresql-seed.sql"

Write-Host "OK - banco ergosense criado na porta 5433 (pgAdmin)." -ForegroundColor Green
