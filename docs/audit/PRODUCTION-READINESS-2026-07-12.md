# Auditoria de Prontidão para Produção — ErgoSense

**Data:** 2026-07-12  
**Escopo:** sistema completo (web Node + React, infra, mobile, Spring scaffold)  
**Runtime oficial de produção:** `ergosense-app/` (React/Vite) + `ergosense-app/server/` (Express/Postgres)

---

## Veredito executivo

| Pergunta | Resposta |
|----------|----------|
| Está 100% pronto para produção em escala? | **Não** |
| Pode ir a piloto/homologação controlada? | **Sim, condicional** (após checklist P0) |
| Prontidão geral estimada | **~70%** |
| Nota sugerida | **7,0 / 10** (homologação) · **5,5 / 10** (SaaS escala) |

**Nenhum bloco está 100% absoluto** para produção em escala. O núcleo Node está **parcial avançado**: auth, multi-tenant em nível de aplicação, 15 módulos de negócio, OpenAPI/matrix, security smoke e CI são fortes. Bloqueiam escala: backup/DR, storage default no Postgres, reset de senha, eSocial gov.br em MOCK, e-mail stub, cobertura ~46%.

> Limite metodológico: inventário estrutural + docs QA (P7–P10) + verificação de stubs/mocks/secrets. Não é revisão literal de cada uma das ~35k linhas FE+BE, nem pentest externo.

---

## 1. Mapa do sistema

| Camada | Pasta | Papel | Status prod |
|--------|-------|-------|-------------|
| Web FE | `ergosense-app/src` | React 19 + Vite 8 · ~88 screens · AppContext | Parcial |
| API | `ergosense-app/server` | Express · 19 route files · ~54 services · 255 rotas | Parcial avançado |
| DB | Postgres 16/17 | Schema + 20+ migrations | Parcial |
| Infra | `infra/docker`, `k8s/` | Compose cloud + K8s overlay | Parcial |
| CI | `.github/workflows/ci.yml` | Lint→unit→integ→e2e→docker | Parcial avançado |
| Mobile | `mobile/` | Flutter scaffold | **Falta** |
| Spring | `backend/` | Sync scaffold | **N/A** (não é runtime) |

### Escala do código (aprox.)

| Métrica | Valor |
|---------|------:|
| FE `src` TS/TSX (sem testes) | ~164 arquivos |
| BE `server/src` JS (sem testes) | ~108 arquivos |
| Funções `api*` no client | ~198 |
| Rotas inventariadas | 255 |
| Telas `*Screen` | ~88 |
| Linhas FE+BE no denominador coverage | ~35.502 |

---

## 2. O que está mais perto de “pronto”

| Item | Evidência | Observação |
|------|-----------|------------|
| Contrato API / OpenAPI | 0 gaps documentados | Excelente para integração |
| Matrix de endpoints | 1462 checks (P7 100%) | **Revalidar** antes do go-live (P10 viu 99%) |
| Security smoke/advanced | 0 crítico / 0 alto | Checks definidos — não = pentest |
| Integração Supertest | 67/67 (P10) | Auth, denúncias, eSocial, Compliance, services |
| Unit FE/BE | 167 + 211 | Verde |
| Lint / Build | OK | CI + local |
| Auth JWT + MFA TOTP | Código + testes | Falta reset de senha |
| Tenant isolation app-level | tenantGuard + security 403 | Sem RLS no schema runtime |
| Denúncias | Service ~99% P9 | Melhor módulo BE em coverage |

---

## 3. Classificação por área (camadas)

### A) Autenticação / MFA / sessão — **PARCIAL (~85%)**

**Existe:** login, refresh cookie + CSRF, logout, bloqueio por tentativas, MFA TOTP + backup codes, SessionService (Redis opcional), JWT Bearer obrigatório (sem confiança em headers spoofáveis).

**Falta para 100%:**
- Recuperação / troca de senha (forgot/reset) — **inexistente**
- E2E MFA completo
- Hardening: secrets sem default `dev-*-change-in-production` em prod

### B) Multi-tenant / RBAC — **PARCIAL (~80%)**

**Existe:** `tenantGuard`, `resolveOperationalTenant`, RBAC, admin global + support mode, testes IDOR→403.

**Falta:** RLS no schema em uso (`postgresql-schema.sql` comenta RLS; RLS só em schema SaaS paralelo não aplicado).

### C) Banco — **PARCIAL (~75%)**

**Existe:** schema full, migrate-runner, `migrate:all`, `test:db` 7/7, migrations CI.

**Falta:** backup/restore automatizado, DR runbook, rollback de migration, política de retenção LGPD operacional.

### D) Módulos de negócio — todos **PARCIAL**

| Módulo | Est. | Pronto | Parcial / falta |
|--------|-----:|--------|-----------------|
| Análise ergonômica | 75% | Captura, RULA/REBA/OWAS/NIOSH, sync API | Mídia no PG; E2E completo |
| Colaboradores | 70% | CRUD + consent LGPD | Guards FE; coverage screens |
| Organização | 70% | Árvore org NR-01 | Zod; E2E |
| Inventário riscos | 70% | Rotas + telas NR-01 | Integ dedicada |
| GRO | 65% | Ciclo + indicadores | E2E ciclo completo |
| PGR | 70% | Snapshot/versões API | E2E assinatura |
| Psicossocial | 70% | Questionários + form público + LGPD | Load burst; jornadas |
| Denúncias | 85% | CRUD + integração NR-01 + testes densos | Retenção LGPD ops |
| AET | 65% | Workflow + cadastros | Integ dedicada |
| SST | 65% | APR/EPI/EPC/NC/CAPA/treinamentos | E2E/coverage |
| eSocial | 55% | XML/validação/MOCK + 12 integ | **gov.br HTTP real + ICP** |
| Compliance | 70% | Dashboard/scan/alertas + 13 integ | Feeds reais MTE/DOU |
| Admin / onboarding | 75% | Requests, ativação, tenants | E2E admin |
| Support mode | 70% | Authorize/revoke + audit | SIEM contínuo |
| AI Expert | 60% | Orquestração + 9 specialists | Exige `AI_PROVIDER`; 503 sem chave |

### E) Frontend — **PARCIAL (~65%)**

**Existe:** AppContext (66,47% linhas P10), ~88 telas, lazy load, offline localStorage, roteamento App.tsx.

**Falta:**
- Componentes `ProtectedRoute` / `PermissionGuard` (guards só no BE + condicionais App)
- Coverage screens/vision baixa (combinado puxado para baixo)
- Fila de sync offline durable (não é WorkManager/outbox robusto)

### F) API — **PARCIAL (~85%)**

**Existe:** OpenAPI 0 gaps, error handler central, Zod em auth/core/onboarding.

**Falta:** Zod uniforme em GRO/PGR/SST/AET/…; exemplos OpenAPI completos.

### G) Segurança — **PARCIAL (~85%)**

**Existe:** security headers, rate limit (Redis-aware), sanitize, audit logs, MFA.

**Falta:** password reset, DSR LGPD (export/erase), Secrets Manager, métricas autenticadas obrigatórias em prod.

### H) Observabilidade — **PARCIAL (~70%)**

**Existe:** `/health`, Prometheus metrics, Grafana dashboards no Compose, X-Trace-Id.

**Falta:** OpenTelemetry ponta a ponta, alertas/on-call, testes com Redis/storage off.

### I) Infra — **PARCIAL (~65%)**

**Existe:** `docker-compose.cloud.yml` (Postgres, Redis, RabbitMQ, MinIO, API, Web, gateway, Prometheus, Grafana), Dockerfiles, K8s base + overlay Docker Desktop, CI amplo.

**Falta:**
- `k8s/base/secret-api.yaml` com `CHANGE_ME`
- Manifests RabbitMQ/MinIO ausentes no k8s base (ConfigMap já referencia)
- PgBouncer + Postgres gerenciado
- CORS `*` no compose cloud (não usar em prod)

### J) Qualidade — **PARCIAL (~55% se incluir coverage)**

| Gate | Status |
|------|--------|
| Lint/build/unit | OK |
| Integração | 67/67 |
| OpenAPI | 0 gaps |
| Security | 0 crít/alto |
| Coverage combinada | **45,81%** (meta 60% falhou) |
| Matrix | Revalidar |
| E2E críticos | ~40% |

### K) Mobile Flutter — **FALTA (~5%)**

Scaffold / placeholder. Não entregar como produto.

### L) Backend Spring — **N/A**

Não é o runtime. Tratar como experimento separado.

### M) Storage / Redis / RabbitMQ / MinIO — **PARCIAL (~60%)**

Wire-up no Compose e services com fallback. Default `STORAGE_DRIVER=database` **inaceitável** em escala.

### N) E-mail — **FALTA (~10%)**

`emailNotificationService.js` = stub (stdout/SIEM). Onboarding/ativação sem SMTP real.

---

## 4. Cobertura (P10)

| Métrica | P9 | P10 |
|---------|-----|-----|
| FE linhas | 41,02% | **49,99%** |
| BE `src/` | ~42,45% | **42,45%** |
| Combinado | ~41,81% | **45,81%** |
| AppContext | 43,35% | **66,47%** |
| Meta 60% | REPROVADO | REPROVADO |

Para 60% com denominador atual (~35.502 linhas): faltam **~5.036 linhas cobertas**.

---

## 5. Bloqueios priorizados

### P0 — bloqueia escala / risco de dados

1. **Backup/DR ausente**
2. **Storage default database** → forçar MinIO/S3 + migrar mídia
3. **Reset/forgot password inexistente**

### P1 — bloqueia “enterprise / legal”

4. Cobertura combinada &lt; 60%
5. eSocial gov.br MOCK (não obrigação legal real)
6. E-mail SMTP stub
7. Revalidar matrix 1462/1462
8. E2E fluxos críticos (MFA, OPERADOR, tenant expirado)
9. RLS (defesa em profundidade)

### P2 — roadmap / não bloqueia piloto Node

10. Mobile Flutter
11. Spring backend
12. Zod em todos os módulos
13. Guards FE dedicados
14. Load burst dashboard (500)
15. Feeds Compliance reais

### P3 — checklist go-live ops

- Secrets Manager (nunca `CHANGE_ME` em cluster)
- `REDIS_ENABLED`, `RABBITMQ_ENABLED`, `STORAGE_DRIVER=minio`
- `METRICS_TOKEN`, JWT/MFA secrets sem defaults de dev
- `AI_PROVIDER` se AI Expert for requisito do piloto
- Confirmar HSTS/CSP em `NODE_ENV=production`

---

## 6. Decisão por cenário

| Cenário | Decisão |
|---------|---------|
| Piloto fechado, 1–N tenants, MinIO+Redis, backup manual, MFA on | **Pode** após P0 |
| SaaS multi-tenant escala + LGPD pleno + eSocial legal | **Não** até P0+P1 |
| App mobile nativo como entregável | **Não** (scaffold) |

---

## 7. Inventário técnico resumido

### Backend routes (`server/src/routes/`)

auth, mfa, core, tenant, tenantOnboarding, riskInventory, riskCriteria, gro, pgr, psico, aet, sst, esocial, compliance, org, denuncia, aiExpert, system, openapi

### Frontend screens (grupos)

Main, Analysis, Video, Utility, Admin, Support, TenantOnboarding, RiskInventory, RiskCriteria, GRO, PGR, Psicossocial, AET, SST, eSocial, Compliance, Org, Denuncia, V2

### Stubs / mocks críticos (evidência)

| Arquivo | Problema |
|---------|----------|
| `services/emailNotificationService.js` | SMTP stub |
| `services/esocialGovbrAdapter.js` | Default MOCK; HTTP SOAP incompleto |
| `services/esocialUtils.js` | “integração futura” |
| `config/env.js` | Defaults `dev-*-change-in-production` |
| `k8s/base/secret-api.yaml` | `CHANGE_ME` |
| `src/services/esocialExport.ts` | XML stub offline FE |

---

## 8. Recomendação de caminho até produção

### Semana 1 (P0)
1. Backup automatizado Postgres (snapshot + restore testado)
2. `STORAGE_DRIVER=minio` + migração de blobs
3. Forgot/reset password + e-mail SMTP real (mesmo que só reset)

### Semana 2–3 (P1 parcial)
4. Revalidar matrix + security + e2e MFA
5. Subir coverage combinada (screens + services DB-heavy)
6. Hardening secrets/K8s

### Antes de “eSocial legal”
7. Adapter HTTP gov.br + certificado ICP + ambiente homologação oficial

### Fora do caminho crítico Node
8. Flutter / Spring = projetos separados com roadmap próprio

---

## 9. Fontes

- `docs/audit/QA-AUDITORIA-P10-COVERAGE-60.md`
- `docs/audit/QA-AUDITORIA-P9-COVERAGE-60.md`
- `docs/audit/QA-AUDITORIA-100-FINAL.md`
- `docs/audit/endpoints/*`, `docs/audit/openapi/*`, `docs/audit/security/*`
- `infra/docker/README.md`, `.github/workflows/ci.yml`
- Inventário FS `ergosense-app/`, `server/src/`, `k8s/`, `mobile/`, `backend/`

---

**Conclusão em uma frase:** o ErgoSense Node está **maduro para homologação e piloto controlado**, mas **não está 100% pronto para produção SaaS em escala** enquanto backup, storage externo, reset de senha, eSocial real e cobertura/qualidade estrutural não fecharem.
