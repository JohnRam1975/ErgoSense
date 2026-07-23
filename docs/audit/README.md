# Auditorias e testes — índice canônico

Use este índice para evitar relatórios duplicados. **Fonte de verdade funcional do produto:** [`docs/funcional/README.md`](../funcional/README.md).

## Atual (citar estes)

| Tema | Documento |
|------|-----------|
| Teste funcional F1–F10 (2026-07-23) | [`fase-funcional/FASE-FUNCIONAL-2026-07-23.md`](fase-funcional/FASE-FUNCIONAL-2026-07-23.md) |
| Playwright / UI correções | [`fase-funcional/CORRECOES-PLAYWRIGHT-UI.md`](fase-funcional/CORRECOES-PLAYWRIGHT-UI.md) |
| Offline + AET auto + PDF | [`fase-funcional/CRITICOS-OFFLINE-AET-PDF.md`](fase-funcional/CRITICOS-OFFLINE-AET-PDF.md) |
| QA rollup P7 (critérios 100%) | [`QA-AUDITORIA-100-FINAL.md`](QA-AUDITORIA-100-FINAL.md) |
| Critérios de aceite QA | [`QA-CRITERIOS-100-POR-CENTO.md`](QA-CRITERIOS-100-POR-CENTO.md) |
| Production readiness | [`PRODUCTION-READINESS-2026-07-12.md`](PRODUCTION-READINESS-2026-07-12.md) |
| Fase 5 APIs | [`fase5/FASE5-APIS-2026-07-23.md`](fase5/FASE5-APIS-2026-07-23.md) |
| Fase 6 desempenho | [`fase6/FASE6-DESEMPENHO-2026-07-23.md`](fase6/FASE6-DESEMPENHO-2026-07-23.md) · fix [`FASE6-FIX-500VUS`](fase6/FASE6-FIX-500VUS-2026-07-23.md) |
| Fase 7 Docker | [`fase7/FASE7-DOCKER-2026-07-23.md`](fase7/FASE7-DOCKER-2026-07-23.md) |
| Fase 10 qualidade | [`fase10/FASE10-QUALIDADE-2026-07-23.md`](fase10/FASE10-QUALIDADE-2026-07-23.md) |
| Matrix endpoints (ao vivo) | [`endpoints/ENDPOINT-MATRIX-2026-07-01.md`](endpoints/ENDPOINT-MATRIX-2026-07-01.md) |
| OpenAPI gaps (ao vivo) | [`openapi/OPENAPI-GAP-2026-07-01.md`](openapi/OPENAPI-GAP-2026-07-01.md) |
| Segurança avançada (ao vivo) | [`security/security-advanced.md`](security/security-advanced.md) |
| Teste operacional (R3) | [`TESTE-OPERACIONAL-2026-06-12-R3.md`](TESTE-OPERACIONAL-2026-06-12-R3.md) |
| Enterprise R4 | [`ENTERPRISE-R4-FINAL.md`](ENTERPRISE-R4-FINAL.md) |
| Cobertura (medido) | [`coverage/coverage-report.md`](coverage/coverage-report.md) · progresso P8–P10 |
| Cobertura (plano 100%) | [`coverage/COVERAGE-FINAL-100.md`](coverage/COVERAGE-FINAL-100.md) — plano; não confundir com o report medido |

## Histórico (trilha; não repetir veredito)

- QA fases: `QA-AUDITORIA-P1` … `P4`, `P4-CONTINUACAO`, `P8`/`P9`/`P10-COVERAGE-60`
- `AUDITORIA-EXTREMA-2026-06-11.md` — baseline extreme (supersedido para *readiness* pelo PRODUCTION-READINESS)
- `ENTERPRISE-AUDIT.md` — planejamento; final = R4
- `PROMPT-UNIVERSAL-2026-06-11.md` — auditoria do prompt de arquitetura (propósito distinto)
- E2E / DB / resilience: `e2e/`, `db/`, `resilience/`

## Removidos por duplicação (2026-07-23)

Relatórios curtos ou superseded foram apagados; use os canônicos acima:

- `fase-funcional/RESULTADO-EXECUTIVO.md` → FASE-FUNCIONAL  
- `fase-funcional/BUGS.md` → seção Bugs do FASE-FUNCIONAL  
- `TESTE-OPERACIONAL` R1/R2 → R3  
- `QA-AUDITORIA-COMPLETA` / `QA-AUDITORIA-FINAL` (P5/P6) → `QA-AUDITORIA-100-FINAL`  
- `PRODUCTION-AUDIT-2026-06-05` → AUDITORIA-EXTREMA / PRODUCTION-READINESS  
- Snapshots `*-FINAL-100` (matrix/openapi/security/load) → arquivos *live* + FASE6  

Prompt de teste funcional (não é auditoria): [`prompt-teste-funcional-ergosense.md`](../../prompt-teste-funcional-ergosense.md).
