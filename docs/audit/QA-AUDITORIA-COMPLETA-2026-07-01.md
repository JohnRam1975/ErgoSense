# Auditoria QA Completa — ErgoSense

**Data:** 2026-07-01  
**Executor:** bateria automatizada + inspeção estática + correções aplicadas  
**Ambiente:** Windows · Node 22 · Postgres `localhost:5433` · API `:3001` · Vite `:5173`

---

## Veredicto final

| Item | Resultado |
|------|-----------|
| **Status geral** | **APROVADO COM RESSALVAS** |
| **Nota técnica** | **82 / 100** |
| **Cobertura real estimada** | **~38%** do sistema (não 100%) |

> **100% linha-a-linha não foi atingível** nesta sessão — o projeto tem ~251 endpoints, 87 telas, 54 services e ~174 arquivos frontend. A cobertura abaixo reflete o que foi **executado com evidência**, não suposição.

---

## Comandos executados (evidência)

| Comando | Resultado |
|---------|-----------|
| `cd ergosense-app/server && npm test` | **100/100 pass** |
| `cd ergosense-app && npm test` | **27/27 pass** |
| `cd ergosense-app && npm run build` | **OK** (após correção TS) |
| `cd ergosense-app && npm run lint` | **FALHOU** — 56 problemas (48 erros) |
| `cd ergosense-app/server && npm run test:security:smoke` | **8/8 pass** |
| `cd ergosense-app/server && npm run test:operational` | **28/28 pass**, 1 aviso |
| `cd ergosense-app && npm run test:e2e` | **5/5 pass** (~27s, 80 telas) |
| `npm run migrate:all` + enterprise + tenant-onboarding | **OK** (25+2 migrations) |

---

## Cobertura por camada

| Camada | Testado | Total | % | Evidência |
|--------|---------|-------|---|-----------|
| Telas UI (navegação E2E) | 80 | 87 | **92%** | Playwright `all-screens.spec.ts` |
| Telas admin onboarding | parcial | 7 | **~40%** | Fora do loop principal E2E |
| Testes unitários backend | 100 asserts | ~251 endpoints | **~35%** lógica crítica | Node `--test` |
| Testes unitários frontend | 7 arquivos | ~174 src files | **~4%** | Vitest (só `utils/`) |
| Smoke operacional API | 28 checks | 12 módulos | **~12%** endpoints | `operational-audit.js` |
| Segurança smoke | 8 checks | auth/RBAC/IDOR/SQLi | **100%** checks | `security-smoke-test.js` |
| Lint / qualidade estática | falhou | 56 issues | **0%** gate | ESLint |
| Build produção | OK | — | **100%** | `tsc + vite build` |
| Migrations DB | 27 scripts | 27 | **100%** | `schema_migrations` + runner |
| Performance carga | 50 VUs | health | **OK** | avg 102ms |

**Cobertura global ponderada: ~38%** (média entre telas, serviços testados, endpoints exercitados e qualidade estática).

---

## 1. Estrutura do projeto

```
ERGOSENSE/
├── ergosense-app/          # Frontend React + API Express (principal)
│   ├── src/                # 174 arquivos TS/TSX
│   ├── server/src/         # routes, services, middleware, auth
│   ├── e2e/                # Playwright
│   └── dist/               # build produção
├── docs/                   # schemas SQL, audits, arquitetura
├── infra/docker/           # stack cloud (Postgres, Redis, RabbitMQ, Grafana)
├── k8s/                    # manifests Kubernetes
└── rodar_local.md          # guia local
```

**Stack ativa:** React 19 + Vite 8 + Express 4 + PostgreSQL 17 + JWT + RBAC + MFA (backend).

---

## 2. Inventário de módulos (resumo)

| Módulo | Objetivo | Arquivos-chave | Riscos |
|--------|----------|----------------|--------|
| **Auth / JWT / MFA** | Login, refresh, MFA TOTP | `authRoutes.js`, `MfaService.js`, `jwt.js` | Rate limit off em dev |
| **Tenant onboarding** | Solicitação → aprovação → ativação | `tenantRequestService.js`, `TenantOnboardingScreens.tsx` | Migration obrigatória |
| **Core (colab/análises)** | CRUD operacional | `coreRoutes.js`, `analysisService.js` | IDOR mitigado (403) |
| **Inventário NR-01** | Riscos ocupacionais | `riskInventoryRoutes.js` | Evidências obrigatórias |
| **GRO / PGR** | Ciclo e programa | `groRoutes.js`, `pgrRoutes.js` | Depende Postgres |
| **Psicossocial** | COPSOQ, campanhas, LGPD | `psicoRoutes.js` | Crash se tabela ausente |
| **Denúncia** | Canal anônimo | `denunciaService.js` | 8 unit tests OK |
| **AET** | Análise ergonômica NR-17 | `aetRoutes.js`, `aetCorporateService.js` | 35 endpoints |
| **SST** | APR, EPI, NC, CAPA | `sstRoutes.js` | 25 endpoints |
| **eSocial** | S-2210/2220/2240 | `esocial*.js` | XML + ICP testados |
| **Compliance** | Varredura regulatória | `complianceMonitor.js` | Exige API+DB online |
| **AI Expert** | 9 especialistas SST | `aiEngine/`, `AIExpertService.js` | Chaves só no servidor |
| **Org structure** | Unidade→Posto | `orgRoutes.js` | Tree API OK |
| **Enterprise** | Redis, queue, cache | `cache/`, `queue/` | Redis opcional local |

---

## 3. Bugs encontrados e correções

### Corrigidos nesta auditoria

| ID | Severidade | Problema | Arquivo | Correção |
|----|------------|----------|---------|----------|
| B-01 | **CRÍTICO** | Login HTTP 500 — coluna `pendente_ativacao` inexistente | `authRoutes.js` + DB | Migrations aplicadas; `migrate-runner.js` atualizado |
| B-02 | **ALTO** | Build falha — `showToast(..., 'error')` tipo inválido | `TenantOnboardingScreens.tsx:109` | Trocado `'error'` → `'warn'` (6 ocorrências) |
| B-03 | **ALTO** | `migrate:all` não incluía enterprise/onboarding | `migrate-runner.js:38` | Adicionados `migrate-enterprise.js` e `migrate-tenant-onboarding.js` |
| B-04 | **CRÍTICO** | SyntaxError try sem catch | `tenantRequestService.js:201` | Removido `try` interno duplicado (sessão anterior) |

### Pendentes (não corrigidos — requerem escopo maior)

| ID | Severidade | Problema | Arquivo | Impacto | Solução |
|----|------------|----------|---------|---------|---------|
| B-05 | **ALTO** | ESLint 48 erros bloqueiam CI qualidade | `AppContext.tsx`, `VideoErgonomicScreen.tsx`, etc. | Débito técnico, regressões | Corrigir refs-in-render, unused vars |
| B-06 | **MÉDIO** | Rate limit login inativo em `development` | `rateLimit.js` | Brute force local | Ativar em staging; testar com `NODE_ENV=production` |
| B-07 | **MÉDIO** | E2E não cobre 7 telas admin onboarding | `e2e/all-screens.spec.ts` | Regressão silenciosa | Adicionar ScreenIds ao loop |
| B-08 | **MÉDIO** | Bundle JS 1.96 MB (>500 kB) | `dist/assets/index-*.js` | LCP lento mobile | Code-splitting ONNX/MediaPipe |
| B-09 | **MÉDIO** | Servidor crasha se rota psico acessada sem migration | `psicoRoutes.js:199` | Downtime total | try/catch + health de migrations |
| B-10 | **BAIXO** | OpenAPI 196 paths vs ~251 handlers | `openapi.json` | Docs incompletas | Regenerar `npm run openapi:generate` |
| B-11 | **BAIXO** | Playwright browsers não instalados por padrão | `package.json` postinstall | E2E falha em máquina nova | `npx playwright install` no README |

---

## 4. Segurança

| Check | Status | Evidência |
|-------|--------|-----------|
| Endpoints sem auth → 401 | ✅ | smoke 4/4 |
| JWT spoof headers → 401 | ✅ | smoke |
| Cross-tenant IDOR → 403 | ✅ | smoke + operational |
| SQL injection login → 400 | ✅ | smoke + operational |
| XSS campanha sanitizado | ✅ | operational HTTP 201 |
| CSRF em logout | ✅ | código `csrfProtection` |
| Senhas bcrypt | ✅ | seed + login |
| Chaves IA no servidor | ✅ | `aiConfig.unit.test.js` |
| CORS configurável | ⚠️ | `CORS_ORIGINS` em `.env.example` |
| Rate limit produção | ⚠️ | desligado em dev (aviso operational) |
| `/metrics` aberto | ⚠️ | token opcional via `METRICS_TOKEN` |

**Falhas de segurança críticas:** nenhuma reproduzida após migrations.

---

## 5. Banco de dados

| Check | Status |
|-------|--------|
| 27 migrations aplicadas | ✅ |
| 138 índices `idx_*` | ✅ |
| Usuários duplicados por tenant | ✅ nenhum |
| `psico_respostas` órfãs | ✅ nenhuma |
| Constraints FK (amostra operational) | ✅ |
| `pendente_ativacao`, `security_audit_log`, `compliance_*` | ✅ após migrate |

**Risco produção:** ambiente novo sem `npm run migrate:all` → login 500 (mitigado com fix no runner).

---

## 6. Frontend

| Aspecto | Status |
|---------|--------|
| 80 telas navegáveis E2E | ✅ |
| Build produção | ✅ |
| Modo demo sem API | ✅ (localStorage) |
| Compliance varredura | ⚠️ exige Postgres |
| Lint | ❌ 48 erros |
| Responsividade | ⚠️ não testado automated (manual) |
| Bundle ONNX/WASM 24 MB | ⚠️ performance mobile |

---

## 7. Testes criados / alterados

| Ação | Arquivo |
|------|---------|
| Corrigido tipo toast | `src/screens/TenantOnboardingScreens.tsx` |
| Runner migrations completo | `server/scripts/migrate-runner.js` |
| Guia local atualizado | `rodar_local.md` |

**Testes pendentes recomendados:**
- E2E: fluxo `request-access → approve → activate → login`
- Unit: `tenantRequestService.approveTenantRequest` (transação)
- Integration: `POST /api/compliance/scan` com DB
- Frontend: testes de `AppContext` login/dbConnected

---

## 8. Plano de correção por prioridade

### P0 — Imediato (feito)
1. ✅ Aplicar migrations
2. ✅ Corrigir build TS onboarding
3. ✅ Incluir migrations no runner

### P1 — Esta semana
1. Corrigir 48 erros ESLint (refs-in-render, unused)
2. E2E: incluir 7 telas admin onboarding
3. Tratamento de erro em rotas públicas psico (evitar crash)

### P2 — Próximo sprint
1. Code-splitting bundle principal
2. Rate limit ativo em staging
3. Cobertura integration para top 50 endpoints
4. `postinstall`: `playwright install chromium`

### P3 — Backlog
1. Testes responsivos (viewports)
2. Load test 500/1000 VUs autenticados
3. UI MFA no frontend
4. OpenAPI sync com handlers

---

## 9. Módulos testados vs não testados

### Testados (com evidência)
Auth, Core colaboradores, Psico dashboard, GRO, PGR, AET, Inventário, Compliance, Denúncia, SST, eSocial, Org, 80 telas E2E, utils ergonômicos, eSocial XML/ICP, RBAC, CNPJ onboarding, cache/MFA/queue enterprise.

### Não testados / cobertura insuficiente
- CRUD completo de cada endpoint (~220 rotas)
- Fluxo MFA end-to-end UI
- Transmissão real gov.br eSocial
- Redis/RabbitMQ em cluster multi-réplica
- Flutter mobile / Spring backend scaffold
- Responsividade tablet/mobile sistemática
- Acessibilidade WCAG
- SMTP real (e-mails onboarding)

---

## 10. Conclusão

O ErgoSense está **funcional para piloto controlado** após migrations aplicadas: login, módulos principais, segurança básica e navegação UI validados automaticamente.

**Não está pronto para claim "100% testado"** — lint falha, ~62% dos endpoints sem teste HTTP, 7 telas fora do E2E principal, e bundle/performance mobile precisam trabalho.

**Para evolução segura:** manter `migrate:all` no setup, rodar bateria `npm test` + `test:operational` + `test:e2e` antes de cada release, e executar plano P1.

---

*Relatório gerado com execução real de comandos em 2026-07-01. Evidências JSON nos outputs dos scripts.*
