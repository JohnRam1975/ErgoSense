# Deploy ErgoSense em cluster kind (contexto kind-ergosense)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Overlay = Join-Path $Root "k8s\overlays\docker-desktop"
$Ctx = if ($env:KIND_CLUSTER) { "kind-$($env:KIND_CLUSTER)" } else { "kind-ergosense" }

kubectl config use-context $Ctx
if ($LASTEXITCODE -ne 0) { throw "Contexto $Ctx nao encontrado. Rode install-kind-cluster.ps1 primeiro." }

if (-not (Test-Path (Join-Path $Overlay "secrets.env"))) {
  Copy-Item (Join-Path $Overlay "secrets.env.example") (Join-Path $Overlay "secrets.env")
}

Write-Host "Build imagens..." -ForegroundColor Cyan
docker build -f "$Root\infra\docker\Dockerfile.api" -t ergosense/api:local "$Root"
docker build -f "$Root\infra\docker\Dockerfile.web" -t ergosense/web:local "$Root"

# kind precisa carregar imagens no cluster
$KindExe = Join-Path $Root ".tools\kind\kind.exe"
if (Test-Path $KindExe) {
  & $KindExe load docker-image ergosense/api:local --name ergosense
  & $KindExe load docker-image ergosense/web:local --name ergosense
}

kubectl kustomize $Overlay --load-restrictor LoadRestrictionsNone | kubectl apply -f -
kubectl rollout status deployment/ergosense-postgres -n ergosense --timeout=300s
kubectl rollout status deployment/ergosense-redis -n ergosense --timeout=120s
kubectl rollout status deployment/ergosense-api -n ergosense --timeout=300s
kubectl rollout status deployment/ergosense-web -n ergosense --timeout=120s

Write-Host "OK - kubectl get all -n ergosense" -ForegroundColor Green
kubectl get all -n ergosense
Write-Host "Acesso: kubectl port-forward -n ergosense svc/ergosense-web 8080:80" -ForegroundColor Cyan
