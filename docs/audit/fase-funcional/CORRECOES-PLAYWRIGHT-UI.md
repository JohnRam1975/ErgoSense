# Correções + cobertura Playwright (câmera / PDF / PWA / V2)

**Data:** 2026-07-23  
**Ambiente:** Docker `http://127.0.0.1:8090`  
**Relatório canônico (veredito F1–F10):** [`FASE-FUNCIONAL-2026-07-23.md`](FASE-FUNCIONAL-2026-07-23.md)

## Correções API (harness)

Script: `ergosense-app/server/scripts/fase-funcional-fixes.mjs`

| Gap anterior | Correção |
|--------------|----------|
| Inventário NR-01 400 | Payload completo: evidência + exposição + vínculo AET/análise → **HTTP 201** |
| Rate limit 429 | Retry/backoff no harness; autônomo validado |
| Denúncia pública | `type=ASSEDIO_MORAL`, `modality=ANONIMA`, `lgpdConsent=true` |
| Análise 400 | Campo `activity` obrigatório → **HTTP 201** |
| Autônomo 409 | CPF aleatório válido (evita colisão em re-runs) → **HTTP 201** |
| Bridge E2E no Docker | Login não exige mais `__ERGOSENSE_E2E__` (opcional); UI via menu |

Última validação fixes: **8/8 PASS** (`FIX_EXIT=0`).

## Playwright — spec deste complemento

Arquivo: `e2e/cobertura-camera-pdf-pwa-v2.spec.ts` → **5/5**  
(Com `criticos-offline-aet-pdf.spec.ts` = **8/8** no relatório canônico.)

| Teste | Status |
|-------|--------|
| Câmera: video + pose ready + skeleton | PASS |
| PDF: Exportar PDF ou banner de plano | PASS |
| PWA: settings instalar/instalado | PASS |
| V2: dashboard, métodos, ambientais, roadmap, vídeo | PASS |
| Placeholders Em breve (psico-ia + eSocial) | PASS |

```powershell
$env:E2E_BASE_URL='http://127.0.0.1:8090'
$env:E2E_SKIP_WEBSERVER='1'
$env:E2E_EMAIL='auditor@ergosense.test'
$env:E2E_PASSWORD='AuditTest!2026'
cd ergosense-app
npx playwright test e2e/cobertura-camera-pdf-pwa-v2.spec.ts
node server/scripts/fase-funcional-fixes.mjs
```
