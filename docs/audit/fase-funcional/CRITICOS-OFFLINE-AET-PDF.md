# Críticos — Offline, AET automática, PDF AET/SST/PGR

**Data:** 2026-07-23  
**Relatório canônico (veredito F1–F10):** [`FASE-FUNCIONAL-2026-07-23.md`](FASE-FUNCIONAL-2026-07-23.md)

## Implementado

1. **AET automática** — `aetAutoFromAnalysis.js` após `POST /api/analyses` (idempotente; resposta com `aetProcessId` / `aetCreated` / `aetReportGenerated`).
2. **Offline** — `synced: false` até API OK; fila `ergosense_offline_queue`; `pendingSync` + sync dedupe.
3. **PDFs** — `buildAetPdf` / `buildPgrPdf` / `buildSstPdf` + Vitest integrity **3/3**.

## Testes deste complemento

| Suite | Resultado |
|-------|-----------|
| `smoke-aet-auto.mjs` | PASS |
| Vitest PDF integrity | 3/3 |
| Playwright `criticos-offline-aet-pdf.spec.ts` | 3/3 |

```powershell
node ergosense-app/server/scripts/smoke-aet-auto.mjs
cd ergosense-app
npx vitest run src/utils/__tests__/exportPdfIntegrity.test.ts
$env:E2E_BASE_URL='http://127.0.0.1:8090'; $env:E2E_SKIP_WEBSERVER='1'
npx playwright test e2e/criticos-offline-aet-pdf.spec.ts
```

**Nota:** container Docker precisa do código atualizado (rebuild de imagem para persistir).
