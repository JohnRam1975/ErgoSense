# Gera infra/.env.production com secrets criptograficamente seguros (Node crypto).
# Não sobrescreve se o arquivo já existir, salvo -Force.
param(
  [switch]$Force,
  [string]$Domain = "https://ergosense.dejohn.com.br",
  [string]$ImageTag = "20260722-apifix"
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Out = Join-Path $Root ".env.production"
$Example = Join-Path $Root ".env.production.example"

if ((Test-Path $Out) -and -not $Force) {
  throw "$Out já existe. Use -Force para regenerar (rotaciona todos os secrets)."
}

function New-Secret([int]$Bytes = 48) {
  $b = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  # base64url
  return ([Convert]::ToBase64String($b) -replace '\+','-' -replace '/','_' -replace '=','')
}

$jwtA = New-Secret
$jwtR = New-Secret
$mfaE = New-Secret
$mfaP = New-Secret
$metrics = New-Secret
$pg = New-Secret 36
$minio = New-Secret 36
$seed = New-Secret 24
$secretKey = New-Secret

@"
# ErgoSense — PRODUÇÃO (NÃO COMMITAR)
# Gerado em $((Get-Date).ToUniversalTime().ToString('o'))
# Domínio/imagens: revise antes do deploy.

ERGOSENSE_POSTGRES_IMAGE=ghcr.io/johnram1975/ergosense-postgres:$ImageTag
ERGOSENSE_API_IMAGE=ghcr.io/johnram1975/ergosense-api:$ImageTag
ERGOSENSE_WEB_IMAGE=ghcr.io/johnram1975/ergosense-web:$ImageTag

PUBLIC_HTTP_PORT=8088
APP_PUBLIC_URL=$Domain
CORS_ORIGINS=$Domain

NODE_ENV=production
POSTGRES_DB=ergosense
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$pg

MINIO_ROOT_USER=ergosense
MINIO_ROOT_PASSWORD=$minio
STORAGE_DRIVER=minio
STORAGE_BUCKET=ergosense-media

JWT_ACCESS_SECRET=$jwtA
JWT_REFRESH_SECRET=$jwtR
MFA_ENCRYPTION_KEY=$mfaE
MFA_PENDING_SECRET=$mfaP
SECRET_KEY=$secretKey
METRICS_TOKEN=$metrics

MFA_ENABLED=true
CSRF_ENABLED=true
TRUST_PROXY=true
RATE_LIMIT_SKIP_DEV=false
TENANT_ENFORCE=true
RUN_MIGRATIONS=true
LOG_LEVEL=info

REDIS_ENABLED=true
SESSION_REDIS_ENABLED=true

SEED_GLOBAL_ADMIN_EMAIL=ergosense@dejohn.com.br
SEED_GLOBAL_ADMIN_PASSWORD=$seed
PURGE_DEMO_TENANTS=true
SUPPORT_CONTACT_EMAIL=ergosense.suporte@dejohn.com.br

AI_PROVIDER=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
"@ | Set-Content -Path $Out -Encoding utf8

$credOut = Join-Path $Root ".env.admin-credentials.local"
@"
# Credencial admin global (gitignored). Guarde em local seguro.
SEED_GLOBAL_ADMIN_EMAIL=ergosense@dejohn.com.br
SEED_GLOBAL_ADMIN_PASSWORD=$seed
E2E_GLOBAL_EMAIL=ergosense@dejohn.com.br
E2E_GLOBAL_PASSWORD=$seed
"@ | Set-Content -Path $credOut -Encoding utf8

Write-Host "Gerado: $Out"
Write-Host "Admin global (guarde agora — nao aparece de novo no git):"
Write-Host "  email: ergosense@dejohn.com.br"
Write-Host "  senha: $seed"
Write-Host "Copia local: $credOut"
Write-Host "Próximo: copie para infra/.env no servidor OU use como --env-file no deploy."
if (Test-Path $Example) { Write-Host "Template sem secrets: $Example" }
