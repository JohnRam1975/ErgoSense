# QA Auditoria P10 — Cobertura 60%

Gerado: 2026-06-11  
Projeto: ErgoSensePro  
Fase: P10 — AppContext + eSocial/Compliance + CI Integration

---

## Conclusão

**REPROVADO** quanto ao critério principal **cobertura combinada ≥60%**.

**APROVADO COM RESSALVAS** quanto a:
- **AppContext.tsx ≥65%** (66,47% linhas — meta atingida)
- Integração Supertest **67/67** (100% pass)
- OpenAPI **0 gaps**
- Security **0 crítico / 0 alto**
- Lint / Build / unit FE+BE OK
- CI com job `api-integration` (Postgres service)

A meta de **60% combinado não foi atingida** (45,81%). O ganho real foi de **+4,00 pp** vs P9. Não houve exclusão de arquivos difíceis do coverage nem alteração de regra de negócio para passar testes.

**Nota QA sugerida: 7,2 / 10** — infraestrutura e testes de integração maduros; gap estrutural FE (screens/vision) + denominador BE (`createApp` completo) impedem 60% sem fase dedicada a módulos de baixa cobertura.

---

## Cobertura — P9 vs P10

| Métrica | P9 | P10 | Δ |
|---------|-----|-----|---|
| FE linhas | 41,02% | **49,99%** | **+8,97 pp** |
| BE linhas (`server/src/`, c8 unit) | ~42,45% | **42,45%** | — |
| **Combinado linhas** `(FE+BE covered)/(FE+BE total)` | **~41,81%** | **45,81%** | **+4,00 pp** |
| FE testes unit | 118 | **167** | +49 |
| BE testes unit | 211 | **211** | — |
| BE integração Supertest | 39 | **67** | +28 |

**Fórmula combinada (oficial P7–P10):**  
`(FE.lines.covered + BE_src.lines.covered) / (FE.lines.total + BE_src.lines.total) × 100`

Script: `cd ergosense-app/server && node scripts/p9-coverage-calc.js`

| Detalhe P10 | Valor |
|-------------|-------|
| FE linhas cobertas | 7.915 / 15.831 |
| BE `src/` cobertas | 8.350 / 19.671 |
| Total combinado | 16.265 / 35.502 |

Para 60% com denominador atual: seriam **~21.301 linhas cobertas** (+~5.036 vs P10).

---

## AppContext.tsx — antes / depois

| Métrica | P9 | P10 |
|---------|-----|-----|
| Linhas | 43,35% (1.278/2.950) | **66,47%** (1.961/2.950) |
| Branches | ~63% | **55,02%** |
| Funções (rollup Vitest) | ~43% | 43,47% |

**Justificativa técnica para funções baixas:** Vitest agrega dezenas de `useCallback` internos como poucas funções de alto nível no relatório v8; a métrica **linhas** é a referência acordada P9/P10.

### Novos arquivos de teste FE (P10)

| Arquivo | Testes | Foco |
|---------|--------|------|
| `src/context/__tests__/AppContext.domains.test.tsx` | 22 | Auth 401/403, offline, eSocial, Compliance, suporte |
| `src/context/__tests__/AppContext.modules.test.tsx` | 21 | SST, PGR, transmissão eSocial, captureAnalysis, denúncias, psico |
| `src/context/hooks/__tests__/useCollaboratorActions.test.ts` | 3 | Hook colaborador online/offline/erro |
| `src/__tests__/App.route.test.tsx` | 3 | Roteamento App.tsx, redirect activate-account |

Cenários AppContext cobertos (checklist P10):

- [x] login sucesso / 401 / 403 / MFA / verifyMfa
- [x] refresh token (restoreSession) / logout / sessão expirada (restore false)
- [x] usuário sem tenant (login offline)
- [x] tenant ativo (selectCompany + bundle)
- [x] tenant bloqueado (403 login)
- [x] permissões via integração BE (operador → 403 admin)
- [x] localStorage / limpeza sessão
- [x] estados loading (splash, dbConnected) / toast warn|success|info
- [x] API offline + retry paths aplicáveis
- [x] eSocial mutations + transmissão
- [x] Compliance scan, alertas, relatórios
- [x] captureAnalysis (com e sem colaborador)

---

## ETAPA 2 — Hooks e guards

**Não existem** componentes `ProtectedRoute`, `PermissionGuard`, `TenantGuard` no FE — guards de tenant/permissão são **middleware BE** + roteamento em `App.tsx`.

| Artefato | Cobertura P10 |
|----------|----------------|
| `useCollaboratorActions` | 3 testes unit |
| `App.tsx` roteamento | 98,95% linhas (`App.route.test.tsx`) |
| Tenant errado → 403 | Integração eSocial/Compliance/admin |
| Operador sem permissão → 403 | Integração admin-tenants, eSocial POST |
| Fallback offline | AppContext.domains + modules |

---

## ETAPA 3 — Supertest eSocial (12 testes)

Arquivo: `server/tests/integration/esocial.integration.test.js`

| Rota | Método | Cenários |
|------|--------|----------|
| `/api/esocial/dashboard` | GET | 200, 401 |
| `/api/esocial/config` | GET, PUT | 200, payload |
| `/api/esocial/eventos` | GET, POST | 200, 400 payload inválido |
| `/api/esocial/eventos/:id` | GET | 404 |
| `/api/esocial/eventos/:id/validar` | POST | 404 |
| `/api/esocial/historico` | GET | 200 |
| — | — | 403 operador, tenant errado |

*Pendência menor:* `assinar` e `enviar` cobertos indiretamente via services unit + rotas matrix; integração dedicada POST assinar/enviar pode ser P11.

---

## ETAPA 4 — Supertest Compliance (13 testes)

Arquivo: `server/tests/integration/compliance.integration.test.js`

| Rota | Cenários |
|------|----------|
| dashboard, fontes, normas, alertas, detecções | 200 + schema básico |
| historico, relatorios, agendamento | 200 |
| scan | 200, 400 payload |
| fontes PUT inexistente | 404 |
| — | 401, 403 operador, tenant errado |

---

## ETAPA 5 — Services DB-heavy

Expandido `server/tests/integration/services.integration.test.js`:

- `MfaService` — token inválido
- `ensureEsocialConfig` — DB real
- `buildComplianceDashboard` — DB real
- `buildPgrSnapshot`, `ensureEmpresaUnidade` (P9 mantidos)

Fix P10: restaurado `import { ensureEmpresaUnidade } from '../../src/services/orgUtils.js'`.

---

## ETAPA 6 — CI com integração

Arquivo: `.github/workflows/ci.yml`

| Item | Status |
|------|--------|
| Job `api-integration` | Postgres 16 service :5432 |
| `npm run test:integration` | Sim |
| Cache npm | `package-lock.json` FE + server |
| Timeout | 30 min job |
| Artifact logs em falha | `integration-logs` upload |
| Testcontainers local | `INTEGRATION_USE_TESTCONTAINERS=1` (dev) |

CI falha se: integração falhar, lint/build/unit falhar (jobs upstream).

---

## ETAPA 7 — Suíte executada (evidências)

| Comando | Resultado P10 |
|---------|----------------|
| `npm run lint` | OK |
| `npm run build` | OK |
| `npm test` | **167/167** pass (1 unhandled teardown `window` — não bloqueante) |
| `npm --prefix server test` | **211/211** pass |
| `npm --prefix server run test:integration` | **67/67** pass (~868 s, Testcontainers) |
| `npm run coverage` | FE 49,99% + BE c8 gerado |
| `node server/scripts/p9-coverage-calc.js` | Combinado **45,81%** |
| `npm run test:security` | **0 crít / 0 alto** |
| `npm run test:openapi` | **0 gaps** |
| `npm run test:db` | **7/7** pass |
| `npm run test:matrix` | **Não reexecutado nesta sessão** — última execução local: 1450/1462 (99%) |
| `npm run test:e2e` | Não reexecutado (tempo) |
| `npm run test:load` | Não reexecutado |
| `npm run test:resilience` | Não reexecutado |

---

## Ganho real por área

| Área | Ganho |
|------|-------|
| `AppContext.tsx` | **+23,12 pp** linhas (43,35% → 66,47%) |
| FE total | **+8,97 pp** |
| Combinado | **+4,00 pp** |
| Integração BE | +28 testes (eSocial + Compliance + services) |

---

## Pendências P11

1. Combinado 60% — priorizar screens (`*Screens.tsx`), `vision/`, `utils/nr17.ts` (~4% FE) ou ampliar c8 integração com `--coverage` no job CI.
2. Matrix endpoints — revalidar 1462/1462 (última run 99%).
3. E2E / load / resilience — reexecutar em pipeline noturno.
4. Integração eSocial: POST `assinar` + `enviar` dedicados.
5. Corrigir teardown Vitest (`window is not defined` pós-`AppContext.test.tsx`).
6. Guards FE dedicados — avaliar extrair de `App.tsx` se produto exigir `PermissionGuard` como componente.

---

## Bugs reais encontrados

| ID | Severidade | Descrição | Status |
|----|------------|-----------|--------|
| P10-001 | Baixa | `services.integration.test.js` perdeu import `ensureEmpresaUnidade` | **Corrigido** |
| P10-002 | Baixa | TS em testes novos (`cron`, GRO args, tipos SST/PGR) | **Corrigido** |
| P10-003 | Info | Vitest unhandled `window` após teardown AppContext | Aberto |

---

## Critério de sucesso P10 — checklist

| Critério | Status |
|----------|--------|
| Combinado sobe de forma real | ✅ +4 pp (não 60%) |
| AppContext ≥65% | ✅ 66,47% |
| Integração 100% pass | ✅ 67/67 |
| Matrix 100% | ⚠️ Não revalidado (99% última run) |
| OpenAPI 0 gaps | ✅ |
| Lint/build/unit OK | ✅ |
| Security 0 crít/alto | ✅ |

**Veredito P10: REPROVADO (meta 60%) / APROVADO PARCIAL (AppContext + integração eSocial/Compliance + CI)**
