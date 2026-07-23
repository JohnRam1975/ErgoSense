# 07 — Exportações, PWA, IA e módulo V2

---

## 7.1 Exportações e compartilhamento

| Utilitário / saída | Conteúdo |
|--------------------|----------|
| `exportNr17Pdf` | Laudo/análise NR-17 (+ captura) |
| `exportSummaryReportPdf` | Relatórios da tela Reports |
| `exportV2Pdf` | Pacote multi-método V2 |
| `exportVideoErgoReport` | PDF + Excel + Word da análise por vídeo |
| `exportAetPdf` | Laudo AET |
| `exportPgrPdf` | PGR versionado |
| `exportSstPdf` | Relatório SST |
| `shareAnalysis` | Web Share / WhatsApp / e-mail |
| Stub eSocial client | XML S-2240 (offline/demo) |

PDF completo limitado pelo plano (`canExportFullPdf` — free = false).

---

## 7.2 PWA e offline

- Service Worker via `vite-plugin-pwa` (`registerSW` em `main.tsx`).  
- Banner/guia de instalação; Settings mostra status “App instalado”.  
- Fila de sync (`sync` screen + Settings “Modo offline”).  
- Análises com `synced: false` até sincronizar.  
- Health da API reflete no chrome (online/offline).

---

## 7.3 Módulo V2 (executivo / métodos / vídeo)

| ScreenId | Função |
|----------|--------|
| `v2-dashboard` | KPIs IERE/IECI, ranking setores, heatmap, tendência |
| `v2-methods` | Pacote multi-método da análise + PDF V2 |
| `v2-video` | Análise por vídeo live/upload: timeline, heatmap, exports |
| `v2-environmental` | Ruído / IBUTG / lux (NR-15 / NHO) — simulação/apoio |
| `v2-audit` | Logs locais de rastreabilidade |
| `v2-roadmap` | Backlog futuro (wearables/IoT) — informativo |

### Métodos cobertos no pacote V2 (client `src/methods`)

RULA, REBA, NIOSH, OWAS, KIM, OCRA, QEC, ROSA, Strain Index, TLV-HAL, NASA-TLX, Snook, ambientais, agente IA local de sessão (`runSessionMethods`).

---

## 7.4 AI Expert

| Superfície | Status |
|------------|--------|
| Painel em `result` (`AiExpertAnalysisPanel`) | **Em breve** (UI) |
| `psicossocial-ia` | **Em breve** |
| API `/api/ai/*` | Implementada: history, query, analyze-ergonomics, control-measures, aet, work-instruction, risk-inventory, pgr, reports, psicossocial, virtual-audit, recommendations, risk-analysis; engine specialists/run/queue |
| `GET /api/system/ai-status` | Status do provedor/config |

Filas RabbitMQ (ou fallback memória) para jobs AI/eSocial/Compliance.
