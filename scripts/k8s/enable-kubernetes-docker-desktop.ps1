# Habilita Kubernetes no Docker Desktop e faz deploy do ErgoSense
# Requer: Docker Desktop instalado e rodando
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$SettingsStore = "$env:APPDATA\Docker\settings-store.json"

Write-Host "=== Habilitar Kubernetes (Docker Desktop) ===" -ForegroundColor Cyan

function Stop-DockerDesktopProcesses {
  $names = @(
    "Docker Desktop",
    "com.docker.backend",
    "com.docker.build",
    "docker-sandbox"
  )
  foreach ($n in $names) {
    Get-Process -Name $n -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 3
}

function Set-KubernetesEnabledInSettings {
  $extra = @{
    KubernetesEnabled    = $true
    KubernetesMode       = "kind"
    KubernetesNodesCount = 1
  }
  if (Test-Path $SettingsStore) {
    $json = Get-Content $SettingsStore -Raw | ConvertFrom-Json
    foreach ($k in $extra.Keys) {
      Add-Member -InputObject $json -NotePropertyName $k -NotePropertyValue $extra[$k] -Force
    }
    $json | ConvertTo-Json -Depth 5 | Set-Content $SettingsStore -Encoding UTF8
    Write-Host "settings-store.json atualizado." -ForegroundColor Green
  } else {
    $extra | ConvertTo-Json | Set-Content $SettingsStore -Encoding UTF8
  }
}

# 1. Status atual
docker desktop kubernetes status 2>&1 | Out-Host

$status = docker desktop kubernetes status 2>&1 | Out-String
if ($status -match "State:\s+running") {
  Write-Host "Kubernetes ja esta rodando." -ForegroundColor Green
} else {
  Write-Host "Kubernetes desligado. Tentando habilitar via configuracao..." -ForegroundColor Yellow
  Stop-DockerDesktopProcesses
  Set-KubernetesEnabledInSettings

  $dockerExe = Join-Path ${env:ProgramFiles} "Docker\Docker\Docker Desktop.exe"
  if (Test-Path $dockerExe) {
    Start-Process $dockerExe
    Write-Host "Docker Desktop reiniciado. Aguardando Kubernetes (ate 8 min)..." -ForegroundColor Cyan
  } else {
    Write-Host "Abra o Docker Desktop manualmente." -ForegroundColor Yellow
  }

  $deadline = (Get-Date).AddMinutes(8)
  $ok = $false
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 15
    $s = docker desktop kubernetes status 2>&1 | Out-String
    Write-Host "  $($s.Trim().Split("`n")[2..4] -join ' | ')"
    if ($s -match "State:\s+running") {
      $ok = $true
      break
    }
    if ($s -match "State:\s+failed|Error:") {
      break
    }
  }

  if (-not $ok) {
    Write-Host ""
    Write-Host "NAO foi possivel ligar o Kubernetes automaticamente." -ForegroundColor Red
    Write-Host "Clique UMA vez em Docker Desktop > Kubernetes > Create cluster" -ForegroundColor Yellow
    Write-Host "Depois rode: .\scripts\k8s\deploy-docker-desktop.ps1" -ForegroundColor Yellow
    exit 1
  }
}

# 2. kubectl context
kubectl config use-context docker-desktop 2>$null
if ($LASTEXITCODE -ne 0) {
  kubectl config get-contexts
  throw "Contexto docker-desktop nao encontrado. Aguarde o cluster terminar de subir."
}

kubectl get nodes
if ($LASTEXITCODE -ne 0) { throw "Cluster ainda nao responde." }

# 3. Deploy ErgoSense
& "$Root\scripts\k8s\deploy-docker-desktop.ps1"
