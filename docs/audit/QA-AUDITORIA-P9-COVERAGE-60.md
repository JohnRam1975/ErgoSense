# QA Auditoria P9 — Cobertura 60%

Gerado: 2026-06-11  
Projeto: ErgoSensePro  
Fase: P9 — Supertest + Testcontainers + integração para ≥60% combinado

---

## Conclusão

**REPROVADO** quanto ao critério principal **cobertura combinada ≥60%**.

**APROVADO COM RESSALVAS** quanto à infraestrutura de integração, Supertest, Testcontainers e ganho real em rotas/services críticos.

A meta de 60% **não foi atingida**. O bloqueio técnico principal é estrutural: o grafo completo do Express (`createApp`) entra no denominador c8 ao rodar integração, enquanto `AppContext.tsx` (~2.950 linhas) e dezenas de módulos FE permanecem com baixa execução unitária. Não houve exclusão de arquivos difíceis nem maquiagem de relatório.

---

## Cobertura — P8 vs P9

| Métrica | P8 | P9 | Δ |
|---------|-----|-----|---|
| FE linhas | 40,90% | **41,02%** | +0,12 pp |
| BE linhas (`src/`, c8 + integração) | 44,69% | **~42,45%** | −2,24 pp* |
| **Combinado linhas** `(FE+BE covered)/(FE+BE total)` | **42,27%** | **~41,81%** | **−0,46 pp** |
| FE testes | 112 | **118** | +6 |
| BE testes (unit) | 211 | **211** | — |
| BE testes integração (novos) | 0 | **39** | +39 |

\* O percentual BE cai porque a integração carrega **todo** o grafo de rotas/middleware via `createApp()`, aumentando o denominador c8 em relação ao run unitário P8. Em **linhas absolutas cobertas** o backend avançou de ~3.977 para **~8.350** em `server/src/`.

**Fórmula combinada (oficial P7/P8/P9):** `(FE.lines.covered + BE_src.lines.covered) / (FE.lines.total + BE_src.lines.total) × 100`

Para 60% com denominador atual (~35.502 linhas FE+BE src): seriam necessárias **~21.301 linhas cobertas** (+~6.456 vs P9).

---

## Arquivos críticos — ganho real P9

| Arquivo | P8 | P9 | Observação |
|---------|----|----|------------|
| `server/src/app.js` | — (em `index.js`) | **55,33%** | Factory `createApp()` extraída |
| `server/src/routes/authRoutes.js` | baixo | **70,11%** | Supertest auth |
| `server/src/services/denunciaService.js` | ~26% | **99,68%** | Integração denúncias |
| `server/src/services/pgrSnapshot.js` | ~5% | **70,56%** | `buildPgrSnapshot` com DB real |
| `src/context/AppContext.tsx` | 42,71% | **43,35%** | Meta 65% não atingida |
| `src/api/client.ts` | 96,52% | **96,52%** | Mantido |

---

## ETAPA 1 — Backend testável (`createApp`)

| Arquivo | Função |
|---------|--------|
| `server/src/app.js` | `createApp(options)` — Express + rotas, sem `listen` |
| `server/src/index.js` | Bootstrap: `createApp`, workers, `listen` |
| `server/src/db.js` | `reconfigurePool()`, `closePool()` para testes |

Produção e dev inalterados em comportamento.

---

## ETAPA 2 — Banco de teste

| Arquivo | Função |
|---------|--------|
| `server/tests/setup/testDb.js` | Testcontainers (`INTEGRATION_USE_TESTCONTAINERS=1`) ou Postgres local :5433 |
| `server/tests/setup/integration-env.js` | `--import` global: CSRF off, MFA off, rate-limit skip |
| `server/tests/fixtures/users.js` | Credenciais `itest-*` |
| `server/tests/fixtures/tenants.js` | Seed/cleanup tenants `itest-active|blocked|expired` |
| `server/tests/helpers/auth.js` | Tokens malformados |
| `server/tests/helpers/request.js` | `http()`, `login()`, `withAuth()` |
| `server/tests/helpers/skip.js` | `guardIntegration(t)` |

Setup aplica `docs/database/postgresql-schema.sql` + `migrate-runner.js` + colunas legadas (`cargo`, `localizacao`).

---

## ETAPAS 3–7 — Supertest + services (39 testes)

| Suite | Testes | Rotas / escopo |
|-------|--------|----------------|
| `auth.integration.test.js` | 12 | login, bloqueado, expirado, MFA, refresh, logout, 401 |
| `denuncias.integration.test.js` | 6 | pública, dashboard, listagem, tratativa 404, operador |
| `admin-tenants.integration.test.js` | 4 | admin list, block sem reason, 403, 404 |
| `modules.integration.test.js` | 11 | PGR, GRO, Psico, SST, Org, tenant errado |
| `services.integration.test.js` | 6 | MfaService, pgrSnapshot, denunciaService, DB real |

**Integração:** `npm run test:integration` — 39/39 pass com Testcontainers (evidência: `server/integration-test.log`).

---

## ETAPA 8 — Frontend complementar

Novo: `src/context/__tests__/AppContext.session.test.tsx` (+6 testes)

- `registerCompany` sucesso/falha
- `submitAccessRequest` online/erro
- `selectCompany` + bundle
- `restoreSession` com sessão salva

**AppContext.tsx:** 43,35% linhas (meta 65% não atingida).

---

## ETAPA 9 — E2E crítico

Já existentes (não ampliados nesta sessão):

- `e2e/journeys/tenant-blocked.spec.ts`
- `e2e/journeys/cross-tenant.spec.ts`
- `e2e/journeys/session-auth.spec.ts`
- `e2e/journeys/logout.spec.ts`

Meta E2E 80% dos fluxos críticos: **pendente** ampliação (MFA inválido, OPERADOR, troca de senha).

---

## ETAPA 10 — Performance Psicossocial

`/api/psico/dashboard` já passa por `dashboardCacheMiddleware()` em `app.js`. Integração confirma **200** em tenant `itest-active`. Load test dedicado **não reexecutado** nesta sessão.

---

## ETAPA 11 — Suíte executada

| Comando | Resultado |
|---------|-----------|
| `npm run lint` | **0/0** |
| `npm run build` | **OK** |
| `npm test` (FE) | **118/118** |
| `npm --prefix server test` | **211/211** |
| `npm run test:integration` | **39/39** (Testcontainers) |
| `npm run coverage:fe` | FE **41,02%** linhas |
| `npm run coverage` (BE+integração) | BE src ~42,45% (ver nota denominador) |
| `npm run test:security` | **0 crítico / 0 alto** |
| `npm run test:matrix` | **1462/1462 (100%)** |
| `npm run test:openapi` | **Gap 0** |
| `npm run test:db` | **7/7** |
| `npm run test:resilience` | **OK** |
| `npm run test:e2e` | não reexecutado (requer stack dev) |
| `npm run test:load` | não reexecutado |

---

## Bugs corrigidos / achados

1. **Skip prematuro** em integração — `guardIntegration(t)` após `setupIntegration()` em vez de `describe({ skip })` no load do módulo.
2. **Schema base** ausente em DB vazio — aplicação de `postgresql-schema.sql` antes das migrations.
3. **Fixture `usuarios`** — `ON CONFLICT (tenant_id, email)` e remoção de colunas inexistentes no schema base.
4. **CSRF em Supertest** — `integration-env.js` com `CSRF_ENABLED=false` via `--import`.
5. **Pool após migrate-runner** — `reconfigurePool()` pós-migrations (runner chama `pool.end()`).

---

## Comandos úteis P9

```powershell
# Integração com Testcontainers (Docker obrigatório)
cd ergosense-app\server
$env:INTEGRATION_USE_TESTCONTAINERS="1"
npm run test:integration

# Integração com Postgres local :5433
$env:PGHOST="localhost"; $env:PGPORT="5433"; $env:PGDATABASE="ergosense"
npm run test:integration

# Cobertura combinada
cd ergosense-app
npm run coverage
node server/scripts/p9-coverage-calc.js
```

---

## Bloqueio técnico para 60% (honesto)

1. **~15.831 linhas FE** fora de `screens/` ainda com baixa execução (`AppContext`, vision, utils de câmera).
2. **Grafo Express completo** no denominador BE ao integrar — correto metodologicamente, penaliza % mesmo cobrindo rotas.
3. **AppContext 65%+** exigiria dezenas de testes de hooks/ações de domínio (refresh por módulo, support mode, global admin).
4. **E2E** não contabilizado no c8/Vitest — telas permanecem fora do denominador unit (política P8).

**Próximo passo recomendado (P10):** ampliar `AppContext.actions` + hooks dedicados; Supertest eSocial/compliance; excluir `scripts/` do c8 (já configurado); considerar `test:integration` no CI com Testcontainers.

---

## Veredito P9

| Critério | Status |
|----------|--------|
| Combinado ≥60% | ❌ ~41,81% |
| Lint 0/0 | ✅ |
| Build OK | ✅ |
| FE unit OK | ✅ 118 |
| BE unit OK | ✅ 211 |
| Integração Supertest | ✅ 39 |
| Security 0 crít/alto | ✅ |
| Matrix 100% | ✅ |
| OpenAPI 100% | ✅ |
| DB OK | ✅ |
| Resilience OK | ✅ |

**P9 reprovado para 60%, aprovado com ressalvas pelo avanço de integração real.**
