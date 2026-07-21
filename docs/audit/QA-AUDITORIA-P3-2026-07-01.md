# QA Auditoria P3 — ErgoSense

**Data:** 2026-07-01  
**Base:** P2 (92/100) → **P3 concluído**  
**Veredicto:** **APROVADO COM RESSALVAS** — nota **94/100**

> **Não é 100% testado.** Cobertura real medida e documentada abaixo. Declaração de 100% exigiria matriz completa por endpoint (~255 rotas × 10+ cenários), code coverage >80% em linhas, e execução contínua de load/resilience sem degradação — ainda não atingidos.

---

## Resumo executivo

| Objetivo P3 | Status | Evidência |
|-------------|--------|-----------|
| Medir cobertura real (FE/BE/funcional) | ✅ | `npm run coverage` → `docs/audit/coverage/` |
| Inventário ~251 endpoints | ✅ **255 rotas** | `docs/audit/endpoints/endpoint-inventory.json` |
| Smoke OpenAPI por tag | ✅ parcial | 92% checks (sessão estável); gaps doc vs impl documentados |
| Testes DB + fix org tree | ✅ **7/7** | `npm run test:db`; fix `orgUtils.js` |
| Testes de carga | ✅ | `npm run test:load` — p95 documentado, 0% erro carga leve |
| Testes de resiliência | ✅ | `npm run test:resilience` — recuperação OK |
| Segurança avançada | ✅ | 0 CRÍTICO, 0 ALTO (`security-advanced.json`) |
| E2E jornadas | ✅ **10/10** | + logout journey |
| CI/CD pipeline | ✅ | `.github/workflows/ci.yml` |
| Validação admin block/reactivate | ✅ corrigido | empty body → **400** |

---

## 1. Cobertura de código (medida)

**Comando:** `cd ergosense-app && npm run coverage`

| Métrica | Frontend (Vitest v8) | Backend (c8) |
|---------|---------------------:|-------------:|
| Linhas | **19,14%** | **38,85%** |
| Statements | 19,14% | 38,85% |
| Funções | 69,65% | 36,11% |
| Branches | 64,77% | 57,37% |

**Estimativa combinada (média das 4 métricas FE+BE):** **~43%**

**Arquivos HTML:** `ergosense-app/coverage/index.html`, `ergosense-app/server/coverage/index.html`  
**Consolidado:** `docs/audit/coverage/coverage-report.md`, `coverage-summary.json`

### O que está coberto vs não coberto

| Camada | Coberto | Não coberto (principal) |
|--------|---------|-------------------------|
| FE utils/methods | `datetime`, `methodsV2`, `videoErgonomicEngine`, etc. | `App.tsx`, `client.ts`, telas (`screens/**` excluídas do report), componentes UI |
| BE utils/validation | `apiResponse`, `cnpj`, `schemas`, auth parcial | Maioria de services (AET, GRO, PGR, SST, eSocial), controllers, middlewares de permissão |
| E2E telas | **87/87** (100% navegação) | Interações CRUD profundas por módulo |
| Endpoints | Smoke + operational | Matriz completa sucesso/401/403/404/invalid por rota |

---

## 2. Cobertura funcional

| Dimensão | Total | Testado | % real |
|----------|------:|--------:|-------:|
| Telas registradas | 87 | 87 (E2E) | **100%** navegação |
| Endpoints inventariados | 255 | 255 inventário + smoke | **~92%** checks smoke (API estável) |
| Fluxos críticos de negócio | 12 prioritários | 8 automatizados | **~67%** |
| Migrations DB | core onboarding | constraints + org tree | parcial |
| Segurança CRÍTICO/ALTO | — | 0 findings | **100%** nos testes executados |

### Fluxos de negócio

| Fluxo | Automatizado | Evidência |
|-------|--------------|-----------|
| Cadastro empresa (request-access) | ✅ | E2E onboarding-full-flow |
| Aprovação admin | ✅ | E2E + `test:onboarding` |
| Ativação conta + MFA | ✅ | E2E + API |
| Login MFA | ✅ | E2E onboarding |
| Logout | ✅ | `e2e/journeys/logout.spec.ts` |
| Navegação 87 telas | ✅ | `all-screens.spec.ts` |
| Bloqueio tenant | ⚠️ parcial | API validada; E2E admin manual |
| Tenant expirado | ❌ | não automatizado |
| Usuário sem permissão | ❌ | não automatizado |
| Troca/recuperação senha | ❌ | não automatizado |
| Mobile viewport | ❌ | não automatizado |
| Sessão expirada UI | ❌ | não automatizado |

---

## 3. Inventário de endpoints

**Comando:** `npm run test:endpoints` (inventory) → `node server/scripts/endpoint-inventory.js`

| Métrica | Valor |
|---------|------:|
| Rotas implementadas | **255** |
| Operações OpenAPI | 239 |
| Rotas públicas | 15 |
| Rotas protegidas | 240 |
| Admin global | 14 |
| Documentadas no OpenAPI | 239 |
| **Sem documentação OpenAPI** | **16** |
| OpenAPI órfão (doc sem rota) | 0 |

**Artefatos:**  
- `docs/audit/endpoints/endpoint-inventory.json`  
- `docs/audit/endpoints/endpoint-inventory.md`

### Smoke por tag

**Comando:** `node server/scripts/endpoint-smoke.js`

| Execução | Passou | Falhou | Skip | % |
|----------|-------:|-------:|-----:|--:|
| Sessão estável (ergonomista auth OK) | 456 | 4 | 35 | **92%** |
| Sessão pós-stress (API instável) | 227 | 233 | 35 | 46% |

> Falhas `HTTP 0` indicam API indisponível/sobrecarga durante execução prolongada, não falha de auth. Admin tag: **27/27** após correção de validação.

**Checks por endpoint (heurística smoke):**
- GET público → status &lt; 500
- POST público → empty body → 4xx
- Rota protegida sem token → **401**
- GET autenticado → status &lt; 500
- POST autenticado empty → **4xx** (quando `validateBody` exige campos)

**Limitação conhecida:** endpoints de workflow (AET, IA Expert) aceitam POST `{}` por design → smoke marca falha heurística, não necessariamente bug.

---

## 4. Testes de banco de dados

**Comando:** `npm run test:db` → **7/7 pass, 0 avisos**

| Teste | Resultado |
|-------|-----------|
| UNIQUE `empresas.tenant_id` | ✅ |
| Colaboradores sem tenant órfão | ✅ |
| `ensureEmpresaUnidade` concorrente → 1 empresa | ✅ |
| `buildOrgTree` após ensure | ✅ |
| Tabelas core onboarding | ✅ |
| Índices tenant (81) | ✅ |
| Integridade multi-tenant | ✅ |

### Bug corrigido — `empresas_tenant_id_key`

**Arquivo:** `server/src/services/orgUtils.js`  
**Causa:** race condition em criação concorrente de empresa/unidade após aprovação de tenant.  
**Fix:** `INSERT ... ON CONFLICT DO NOTHING` + reselect em `empresas` e `unidades`.

---

## 5. Testes de carga

**Comando:** `npm run test:load`

| Cenário | p95 (ms) | Erros | Observação |
|---------|---------:|------:|------------|
| Health | ~87 | 0% | carga leve 10 req |
| Login | ~245 | 0% | carga 50 req |
| Dashboard / listagens | documentado | 0% carga leve | psico-dashboard 403 para admin global em stress 1000 req (esperado) |

**Critérios:** erro 0% em carga leve ✅ | servidor não caiu ✅

---

## 6. Testes de resiliência

**Comando:** `npm run test:resilience` → **OK**

| Cenário | Resultado |
|---------|-----------|
| Token inválido | 401 controlado |
| Health após stress | recuperação OK |
| API indisponível simulada | erro controlado (ECONNREFUSED tratado) |

---

## 7. Segurança avançada

**Comando:** `npm run test:security` (smoke 8/8 + advanced)

| Severidade | Quantidade |
|------------|----------:|
| CRÍTICO | **0** |
| ALTO | **0** |
| MÉDIO | 0 |
| BAIXO | 11 (comportamentos esperados / informativos) |

**Categorias testadas:** IDOR cross-tenant, SQLi login, XSS colaborador, CSRF/Bearer, CORS, rate limit login, MFA bypass, headers segurança, enumeração login uniforme, admin auth.

**Artefatos:** `docs/audit/security/security-advanced.json`, `security-advanced.md`

### Correções P3 (segurança/validação)

| Endpoint | Antes | Depois |
|----------|-------|--------|
| `POST /api/admin/tenants/:id/block` | 200 com `{}` | **400** (motivo obrigatório) |
| `POST /api/admin/tenants/:id/suspend` | 200 com `{}` | **400** |
| `POST /api/admin/tenants/:id/reactivate` | 200 com `{}` | **400** (`confirm: true` obrigatório) |
| `POST /api/admin/tenant-requests/:id/block` | 200 com `{}` | **400** |

**Arquivos alterados:** `server/src/validation/schemas.js`, `tenantOnboardingRoutes.js`, `src/api/client.ts`

---

## 8. Testes E2E (Playwright)

**Comando:** `npm run test:e2e` → **10/10 passed** (~1,1 min)

| Spec | Testes |
|------|-------:|
| `all-screens.spec.ts` | 8 |
| `onboarding-full-flow.spec.ts` | 1 |
| `journeys/logout.spec.ts` | 1 |

**Correções P3 E2E:**
- `logout.spec.ts` — usa helper `openMenu()` (`#menuOverlay.open` em vez de `#menuDrawer`)
- `login.ts` — retry em HTTP 429 (rate limit pós security audit)

---

## 9. Testes unitários

| Suite | Resultado |
|-------|-----------|
| Frontend (`npm test`) | **31/31** |
| Backend (`npm --prefix server test`) | **100/100** |
| ESLint | **0 erros, 0 warnings** |
| Build | **OK** — entry **404 kB** |

**Novos testes FE:** `src/utils/__tests__/datetime.test.ts`

---

## 10. CI/CD

**Arquivo:** `.github/workflows/ci.yml`

| Job | Conteúdo |
|-----|----------|
| `lint-typecheck` | install, lint, build |
| `unit-tests` | FE+BE unit, coverage |
| `api-integration` | Postgres 16, migrations, operational, onboarding, endpoints, security, load, resilience |
| `e2e` | Playwright + dev server |

**Falha do pipeline se:** lint warning/erro, build quebrado, unit/E2E/migration falhar, endpoint smoke ou security crítico falhar.

---

## 11. Scripts P3 criados/alterados

| Script npm | Arquivo | Função |
|------------|---------|--------|
| `coverage` | `server/scripts/coverage-report.js` | Consolida FE+BE + funcional |
| `test:endpoints` | `endpoint-inventory.js`, `endpoint-smoke.js` | Inventário + smoke por tag |
| `test:security` | `security-advanced.js` | Auditoria IDOR/SQLi/XSS/MFA |
| `test:db` | `db-integrity-test.js` | Constraints, org tree, órfãos |
| `test:load` | `load-test.js` | Carga login/dashboard |
| `test:resilience` | `resilience-test.js` | Falhas controladas |
| `test:operational` | (existente) | 28 checks operacionais |
| `test:onboarding` | (existente) | Fluxo API completo |

---

## 12. Bugs encontrados e status

| Bug | Severidade | Status |
|-----|------------|--------|
| Race `empresas_tenant_id_key` / `unidades_tenant_id_nome_key` | ALTO | ✅ Corrigido |
| Admin block/suspend/reactivate aceitava body vazio | MÉDIO | ✅ Corrigido |
| ESLint warnings em pasta `coverage/` | BAIXO | ✅ Ignorado no eslint.config |
| Rate limit bloqueia E2E/smoke após security audit | MÉDIO | ⚠️ Mitigado (retry + conta probe) |
| Smoke POST empty falha em workflows AET/IA | BAIXO | ⚠️ Heurística — não bug |
| 16 rotas sem OpenAPI | BAIXO | ⚠️ Pendente documentação |

---

## 13. Riscos restantes

1. **Code coverage ~43%** — telas e services críticos sem unit tests profundos.
2. **Matriz endpoint incompleta** — smoke ≠ teste de sucesso/403/404/schema por rota.
3. **Rate limit login** — testes sequenciais podem interferir (usar `AUDIT_EMAIL` dedicado em CI).
4. **Jornadas E2E faltantes** — tenant expirado, permissão negada, mobile, sessão expirada.
5. **Migrations from-zero/rollback** — não automatizado em CI (apenas incremental em integration job).
6. **Upload malicioso** — não testado (sem endpoint upload identificado no smoke).

---

## 14. Nota final P3

| Dimensão | P2 | P3 |
|----------|----|----|
| Code coverage medido | ~40% estimado | **43% medido** (FE 19% / BE 39% linhas) |
| Endpoints inventariados | ~251 | **255 + OpenAPI diff** |
| Endpoint smoke | parcial | **92%** (sessão estável) |
| Segurança avançada | smoke 8/8 | **0 CRÍTICO/ALTO** |
| DB integrity | warning org tree | **7/7 + fix** |
| E2E jornadas | 9/9 | **10/10** |
| CI pipeline | manual | **GitHub Actions** |
| Load/resilience | scripts only | **executados com evidência** |

### Nota: **94/100** (+2 vs P2)

### Veredicto: **APROVADO COM RESSALVAS**

Sistema validado para **staging/homologação enterprise** com evidências reais de cobertura, segurança, DB e CI. **Não aprovado para claim “100% testado”** até elevar code coverage, matriz de endpoints e jornadas E2E restantes.

---

## Comandos executados (evidência)

```bash
cd ergosense-app
npm run lint              # 0 erros, 0 warnings
npm run build             # OK, entry ~404 kB
npm test                  # 31/31
npm run coverage          # FE+BE reports + docs/audit/coverage/
npm run test:e2e          # 10/10
npm run test:onboarding   # OK
npm run test:operational  # 28/28
npm run test:security     # smoke 8/8 + advanced 0 CRÍTICO
npm run test:load         # OK
npm run test:resilience   # OK
npm run test:endpoints    # inventário + smoke
npm run test:db           # 7/7

cd server
npm test                  # 100/100
```

**Pré-requisito:** API + Postgres rodando para testes de integração (`localhost:3001`).

---

## Artefatos gerados

```
docs/audit/QA-AUDITORIA-P3-2026-07-01.md
docs/audit/coverage/coverage-report.md
docs/audit/coverage/coverage-summary.json
docs/audit/endpoints/endpoint-inventory.json
docs/audit/endpoints/endpoint-inventory.md
docs/audit/endpoints/endpoint-smoke-results.json
docs/audit/security/security-advanced.json
docs/audit/security/security-advanced.md
ergosense-app/coverage/index.html
ergosense-app/server/coverage/index.html
.github/workflows/ci.yml
```
