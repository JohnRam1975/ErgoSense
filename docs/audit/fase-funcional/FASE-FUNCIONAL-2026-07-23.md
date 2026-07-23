# Teste Funcional ErgoSense (F1–F10)

**Atualizado:** 2026-07-23 · **Ambiente:** http://127.0.0.1:8090  
**Prompt:** [`prompt-teste-funcional-ergosense.md`](../../../prompt-teste-funcional-ergosense.md)

Relatório único desta pasta. Detalhe dos checks: [`fase-funcional-summary.json`](fase-funcional-summary.json).  
Complementos: [Playwright/UI](CORRECOES-PLAYWRIGHT-UI.md) · [Offline/AET/PDF](CRITICOS-OFFLINE-AET-PDF.md) · [índice](../README.md)

## Veredito

| Métrica | Valor |
|---------|-------|
| Checks API | 127 (114 PASS · 0 WARN · 0 FAIL · 13 BLOCKED UI) |
| Fluxos F1–F10 | **10/10 PASS** (estrito) |
| Playwright | 8/8 |
| Vitest PDF | 3/3 |
| Smoke AET automática | PASS |
| Bugs FAIL | nenhum |

## Fluxos

| Fluxo | PASS | WARN | FAIL | BLOCKED | Veredito |
|-------|------|------|------|---------|----------|
| F1 Onboarding/tenant | 15 | 0 | 0 | 0 | PASS |
| F2 Análise/RBAC | 11 | 0 | 0 | 2 | PASS |
| F3 NR-01 inventário/GRO/PGR | 17 | 0 | 0 | 0 | PASS |
| F4 Psicossocial | 10 | 0 | 0 | 1 | PASS |
| F5 Denúncia | 5 | 0 | 0 | 0 | PASS |
| F6 AET/SST | 12 | 0 | 0 | 1 | PASS |
| F7 Compliance | 9 | 0 | 0 | 0 | PASS |
| F8 Suporte | 5 | 0 | 0 | 1 | PASS |
| F9 Admin tenants | 7 | 0 | 0 | 0 | PASS |
| F10 V2 | 1 | 0 | 0 | 5 | PASS |

## BLOCKED (API harness = UI)

| ID | Motivo |
|----|--------|
| F2 camera-ui, pdf-share-ui | browser / export client |
| F4 psico-ia-ui | ComingSoon |
| F6 pdf-aet-sst-ui | export client |
| F8 support-bar-ui | browser |
| F10 v2-*-ui (5) | browser / localStorage |
| TX pwa-offline-ui, exports-ui, coming-soon-ui | browser |

Fora do harness (não FAIL): limite free 10 análises/mês; matriz RBAC 100%.

## Artefatos

| Arquivo | Conteúdo |
|---------|----------|
| `fase-funcional-summary.json` | checks SETUP / F1–F10 / TX |
| `CORRECOES-PLAYWRIGHT-UI.md` | fixes harness + Playwright UI |
| `CRITICOS-OFFLINE-AET-PDF.md` | AET auto, offline, PDFs |
