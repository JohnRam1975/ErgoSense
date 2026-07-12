# Cluster Kubernetes local via kind (funciona sem clicar Create cluster no Docker Desktop)
# Os containers aparecem no Docker Desktop > Containers
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$KindDir = Join-Path $Root ".tools\kind"
$KindExe = Join-Path $KindDir "kind.exe"
$ClusterName = "ergosense"

New-Item -ItemType Directory -Force -Path $KindDir | Out-Null

if (-not (Test-Path $KindExe)) {
  Write-Host "Baixando kind..." -ForegroundColor Cyan
  $ver = "v0.27.0"
  $zip = Join-Path $env:TEMP "kind-windows-amd64.zip"
  Invoke-WebRequest -Uri "https://kind.sigs.k8s.io/dl/$ver/kind-windows-amd64" -OutFile $KindExe -UseBasicParsing
}

docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Docker nao esta rodando. Abra o Docker Desktop." }

$existing = & $KindExe get clusters 2>&1
if ($existing -match $ClusterName) {
  Write-Host "Cluster '$ClusterName' ja existe." -ForegroundColor Green
} else {
  Write-Host "Criando cluster kind '$ClusterName'..." -ForegroundColor Cyan
  & $KindExe create cluster --name $ClusterName --wait 5m
}

kubectl config use-context "kind-$ClusterName"
kubectl get nodes

Write-Host ""
Write-Host "Cluster pronto. Deploy ErgoSense..." -ForegroundColor Cyan
$env:KIND_CLUSTER = $ClusterName
& "$Root\scripts\k8s\deploy-kind.ps1"
