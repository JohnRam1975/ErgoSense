# ErgoSense — setup PostgreSQL local (Windows)
$ErrorActionPreference = "Stop"
$Psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$env:PGPASSWORD = "@joaoC1975"

Write-Host "Criando banco ergosense..." -ForegroundColor Cyan
& $Psql -U postgres -h localhost -f "$Root\scripts\postgres\01-init-database.sql"

Write-Host "Aplicando schema..." -ForegroundColor Cyan
& $Psql -U ergosense -h localhost -d ergosense -f "$Root\docs\database\postgresql-schema-full.sql"

Write-Host "Aplicando dados iniciais..." -ForegroundColor Cyan
& $Psql -U ergosense -h localhost -d ergosense -f "$Root\docs\database\postgresql-seed.sql"

Write-Host "OK — Banco ergosense pronto." -ForegroundColor Green
Write-Host "Usuario: ergosense | Senha: @joaoC1975 | DB: ergosense | Porta: 5432"
