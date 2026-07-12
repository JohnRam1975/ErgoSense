# ErgoSense Production Audit - Real API Tests
$ErrorActionPreference = "Continue"
$Base = "http://localhost:3001"
$Results = @()

function Test-Api {
  param($Name, $Method, $Path, $Body=$null, $Headers=@{}, $ExpectStatus=$null)
  $uri = "$Base$Path"
  try {
    $params = @{ Uri=$uri; Method=$Method; Headers=$Headers; ContentType="application/json"; UseBasicParsing=$true; TimeoutSec=15 }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress) }
    $r = Invoke-WebRequest @params
    $status = $r.StatusCode
    $content = $r.Content
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $content = $reader.ReadToEnd()
    $reader.Close()
  }
  $pass = if ($ExpectStatus) { $status -eq $ExpectStatus } else { $status -ge 200 -and $status -lt 300 }
  $obj = [PSCustomObject]@{ Test=$Name; Method=$Method; Path=$Path; Status=$status; Pass=$pass; Response=($content.Substring(0, [Math]::Min(200, $content.Length))) }
  $script:Results += $obj
  $color = if ($pass) { "Green" } else { "Red" }
  Write-Host "[$status] $Name" -ForegroundColor $color
  return $obj
}

Write-Host "=== ERGOSENSE AUDIT - API TESTS ===" -ForegroundColor Cyan

# Health
Test-Api "Health check" GET "/api/health"
Test-Api "Root endpoint" GET "/"
Test-Api "Metrics exposed" GET "/metrics"

# FASE 2 - Auth
Test-Api "Login valido" POST "/api/auth/login" @{ email="lucas@vale.com.br"; password="ergo1234" }
Test-Api "Login invalido" POST "/api/auth/login" @{ email="lucas@vale.com.br"; password="wrong" } -ExpectStatus 401
Test-Api "Login sem campos" POST "/api/auth/login" @{} -ExpectStatus 400
Test-Api "Login SQL injection" POST "/api/auth/login" @{ email="' OR 1=1--"; password="x" } -ExpectStatus 401

# Endpoints SEM auth (deveriam exigir)
Test-Api "Tenants sem auth" GET "/api/tenants"
Test-Api "Collaborators sem auth" GET "/api/collaborators?tenantId=vale"
Test-Api "Analyses sem auth" GET "/api/analyses?tenantId=vale"
Test-Api "Reports sem auth" GET "/api/reports?tenantId=vale"
Test-Api "Sectors sem auth" GET "/api/sectors?tenantId=vale"
Test-Api "Support status sem auth" GET "/api/support/status?tenantId=vale"
Test-Api "Admin support sem auth" GET "/api/admin/support/active"

# Header spoofing (auth bypass)
$fakeHeaders = @{
  "x-ergosense-email" = "admin@ergosense.com"
  "x-ergosense-role" = "ADMIN_GLOBAL"
  "x-ergosense-name" = "Attacker"
  "x-ergosense-tenant" = "ergosense"
}
Test-Api "Spoof ADMIN_GLOBAL" GET "/api/admin/support/active" -Headers $fakeHeaders
Test-Api "Spoof access tenant A" GET "/api/collaborators?tenantId=vale" -Headers $fakeHeaders
Test-Api "Spoof access tenant B" GET "/api/collaborators?tenantId=csn" -Headers $fakeHeaders

# Tenant admin spoof
$tenantHeaders = @{
  "x-ergosense-email" = "fake@evil.com"
  "x-ergosense-role" = "ADMIN_EMPRESA"
  "x-ergosense-name" = "Fake Admin"
  "x-ergosense-tenant" = "vale"
}
Test-Api "Spoof tenant admin vale" GET "/api/collaborators?tenantId=vale" -Headers $tenantHeaders
Test-Api "Spoof tenant admin cross-tenant" GET "/api/collaborators?tenantId=csn" -Headers $tenantHeaders

# FASE 4 - Multi-tenant IDOR
Test-Api "IDOR analyses other tenant" GET "/api/analyses?tenantId=csn" -Headers $tenantHeaders
Test-Api "Create tenant sem auth" POST "/api/tenants" @{ nome="Evil Corp"; industria="Hack"; adminNome="Hacker"; adminEmail="hack@test.com"; adminPassword="1234" }

# FASE 5 - CRUD negativos
Test-Api "Create collab sem auth" POST "/api/collaborators" @{ tenantId="vale"; nome="Test"; matricula="999" }
Test-Api "Create collab invalid" POST "/api/collaborators" @{ tenantId="vale" } -Headers $tenantHeaders -ExpectStatus 400
Test-Api "Access request XSS" POST "/api/access-requests" @{ nome="<script>alert(1)</script>"; email="x@test.com"; funcao="test"; matricula="1" }
Test-Api "Delete analysis fake id" DELETE "/api/analyses/99999?tenantId=vale" -Headers $tenantHeaders -ExpectStatus 404

# FASE 8 - Security
Test-Api "XSS in sector name" POST "/api/sectors" @{ tenantId="vale"; nome="<img onerror=alert(1) src=x>" } -Headers $tenantHeaders
Test-Api "Path traversal" GET "/api/collaborators?tenantId=../../../etc/passwd" -Headers $tenantHeaders

Write-Host "`n=== RESUMO ===" -ForegroundColor Cyan
$passed = ($Results | Where-Object { $_.Pass }).Count
$failed = ($Results | Where-Object { -not $_.Pass }).Count
Write-Host "Passou: $passed | Falhou: $failed | Total: $($Results.Count)"
$Results | ConvertTo-Json -Depth 3 | Out-File "$PSScriptRoot\audit-results.json"
Write-Host "Resultados salvos em audit-results.json"
