# Compat: redireciona para docker-publish.ps1 (GHCR, padrão FinCare)
param(
  [string]$Registry = "ghcr.io",
  [string]$Owner = "johnram1975",
  [string]$Tag = "latest",
  [switch]$AlsoLatest = $true,
  [switch]$SkipPush
)

& "$PSScriptRoot\docker-publish.ps1" -Registry $Registry -Owner $Owner -Tag $Tag -AlsoLatest:$AlsoLatest -SkipPush:$SkipPush
