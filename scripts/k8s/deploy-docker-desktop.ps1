# Deploy ErgoSense no Kubernetes do Docker Desktop
# Aparece em: Docker Desktop > Kubernetes > namespace ergosense
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Overlay = Join-Path $Root "k8s\overlays\docker-desktop"
$SecretsFile = Join-Path $Overlay "secrets.env"

Write-Host "=== ErgoSense -> Docker Desktop Kubernetes ===" -ForegroundColor Cyan

# 1. Verificar kubectl e contexto
if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
  throw "kubectl nao encontrado. Instale Kubernetes no Docker Desktop: Settings > Kubernetes > Enable"
}
$ctx = kubectl config current-context 2>&1
Write-Host "Contexto atual: $ctx"
if ($ctx -notmatch "docker-desktop|docker-for-desktop|desktop-linux") {
  Write-Warning "Contexto nao parece Docker Desktop. Em Docker Desktop: Settings > Kubernetes > Enable"
  Write-Warning "Depois: kubectl config use-context docker-desktop"
}

# 2. secrets.env
if (-not (Test-Path $SecretsFile)) {
  Copy-Item (Join-Path $Overlay "secrets.env.example") $SecretsFile
  Write-Host "Criado secrets.env - ajuste senhas se quiser." -ForegroundColor Yellow
}

# 3. Build imagens locais (mesmo daemon do K8s do Docker Desktop)
Write-Host "Build imagens..." -ForegroundColor Cyan
docker build -f "$Root\infra\docker\Dockerfile.api" -t ergosense/api:local "$Root"
if ($LASTEXITCODE -ne 0) { throw "Falha build API" }
docker build -f "$Root\infra\docker\Dockerfile.web" -t ergosense/web:local "$Root"
if ($LASTEXITCODE -ne 0) { throw "Falha build Web" }

# Imagens locais -> no containerd do no kind (Docker Desktop Kubernetes)
Write-Host "Carregando imagens no cluster..." -ForegroundColor Cyan
$KindDir = Join-Path $Root ".tools\kind"
$KindExe = Join-Path $KindDir "kind.exe"
if (-not (Test-Path $KindExe)) {
  New-Item -ItemType Directory -Force -Path $KindDir | Out-Null
  Invoke-WebRequest -Uri "https://kind.sigs.k8s.io/dl/v0.27.0/kind-windows-amd64" -OutFile $KindExe -UseBasicParsing
}
$kindClusters = & $KindExe get clusters 2>&1 | Where-Object { $_ -and $_ -notmatch "error" }
$clusterName = ($kindClusters | Select-Object -First 1)
if (-not $clusterName) { $clusterName = "kind" }
& $KindExe load docker-image ergosense/api:local ergosense/web:local --name $clusterName
if ($LASTEXITCODE -ne 0) {
  $node = docker ps --format "{{.Names}}" | Where-Object { $_ -match "control-plane" } | Select-Object -First 1
  if ($node) {
    docker save ergosense/api:local | docker exec -i $node ctr -n k8s.io images import -
    docker save ergosense/web:local | docker exec -i $node ctr -n k8s.io images import -
  } else {
    Write-Warning "Nao foi possivel importar imagens automaticamente. Rode: kind load docker-image ergosense/api:local --name <cluster>"
  }
}

# 4. Validar e aplicar (kustomize build + pipe — apply -k nao aceita --load-restrictor)
Write-Host "Validando manifestos..." -ForegroundColor Cyan
kubectl kustomize $Overlay --load-restrictor LoadRestrictionsNone | kubectl apply --dry-run=client -f -
if ($LASTEXITCODE -ne 0) { throw "Manifestos invalidos" }

Write-Host "Aplicando no cluster..." -ForegroundColor Cyan
kubectl kustomize $Overlay --load-restrictor LoadRestrictionsNone | kubectl apply -f -
if ($LASTEXITCODE -ne 0) { throw "kubectl apply falhou" }

# 6. Aguardar pods
Write-Host "Aguardando pods (ate 5 min)..." -ForegroundColor Cyan
$deployments = @(
  "deployment/ergosense-postgres",
  "deployment/ergosense-redis",
  "deployment/ergosense-api",
  "deployment/ergosense-web"
)
foreach ($d in $deployments) {
  kubectl rollout status $d -n ergosense --timeout=300s
}

Write-Host ""
Write-Host "OK - Abra Docker Desktop > Kubernetes" -ForegroundColor Green
Write-Host "  Namespace: ergosense" -ForegroundColor Green
Write-Host "  Deployments: ergosense-api, ergosense-web, ergosense-postgres, ergosense-redis" -ForegroundColor Green
Write-Host ""
Write-Host "Acesso web (LoadBalancer):" -ForegroundColor Cyan
kubectl get svc ergosense-web-lb -n ergosense
Write-Host "  ou: kubectl port-forward -n ergosense svc/ergosense-web 8080:80" -ForegroundColor Gray
Write-Host ""
kubectl get pods,svc,ingress -n ergosense
