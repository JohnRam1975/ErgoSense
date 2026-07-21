# Auditoria PROMPT UNIVERSAL — ErgoSense

**Data:** 2026-06-11  
**Documentos analisados:** `PROMPT UNIVERSAL.docx`, `PROMPT UNIVERSAL DE CLEAN CODE E ARQUITETURA PROFISSIONAL.docx`  
**Extração:** `docs/audit/prompt-universal-extract.txt`

---

## 1. Identificação do sistema

| Atributo | Valor |
|----------|-------|
| Produto | ErgoSense — plataforma de ergonomia ocupacional |
| Segmento | Mineração / Indústria pesada / SST / NR-17 / NR-01 |
| Modelo | SaaS por assinatura, multi-empresa |
| Stack | React 19 + Vite · Express 4 · PostgreSQL 17 · IA generativa |
| Estágio | MVP avançado / produção piloto |

---

## 2. Decisão arquitetural automática (Padrões 1–12)

### Padrões aplicáveis

| Padrão | Aplicável? | Justificativa |
|--------|------------|---------------|
| **1 — SaaS Multi-Tenant** | ✅ Principal | `tenant_id` em todas as tabelas; planos; auditoria; JWT por tenant |
| **5 — Sistema Industrial** | ✅ Domínio | Mineração, SST, CAPA, indicadores, campo com QR/câmera |
| **7 — Sistema com IA** | ✅ Módulo | AI Expert + LLM Gateway + contexto tenant + audit JSONL |
| **9 — HealthTech (parcial)** | ⚠️ Referência | Dados de saúde ocupacional → LGPD, consentimento, auditoria |
| **11 — Monolito Modular** | ✅ Estrutura atual | Express monolito + módulos de rota; equipe pequena |
| **12 — Cloud Native** | ✅ Infra | Docker, K8s, CI/CD, `/metrics`, health probes |

### Padrões **não** aplicáveis (evitar overengineering)

- **Microserviços (10):** escala atual não justifica; monolito modular é adequado.
- **Marketplace (4), Fintech (8), IoT puro (6):** fora do escopo do produto.

### Arquitetura recomendada (consolidada)

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend SPA (React) — Presentation                        │
│  MediaPipe/ONNX local · AppContext · api/client             │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + JWT + tenantId
┌──────────────────────────▼──────────────────────────────────┐
│  API Gateway (Ingress/K8s) → Express Monolito Modular         │
│  ├── auth/ (JWT, RBAC, sanitize)                              │
│  ├── middleware/ (tenant, rate limit, CSRF, security)       │
│  ├── routes/ (AET, GRO, PGR, psico, risk, AI expert…)       │
│  └── services/ (domínio, compliance, eSocial, AI)           │
└──────────┬───────────────────────────────┬────────────────────┘
           │                               │
    PostgreSQL (shared, tenant_id)   LLM Providers (OpenAI/Anthropic/…)
           │                               │
    security_audit_log              ai-expert-audit/*.jsonl
```

**Vantagens:** time-to-market, isolamento tenant sólido, IA desacoplada via `AIProviderService`, path para microserviços futuro.

**Riscos:** `AppContext.tsx` (~3.830 lin) e `index.js` (~1.110 lin) concentram lógica; API sem envelope único; índices DB incompletos em deploys antigos.

---

## 3. Revisão obrigatória (checklist PROMPT UNIVERSAL)

### Clean Code — ⚠️ Parcial

| Critério | Status | Evidência |
|----------|--------|-----------|
| Nomes significativos | ✅ | Domínio em PT (`colaboradores`, `analises`, `aetRoutes`) |
| Métodos pequenos | ❌ | `AppContext.loadTenantData`, handlers em `index.js` |
| DRY | ⚠️ | Resolução de tenant triplicada; `mapCollaborator` repetido |
| Comentários | ✅ | Apenas onde necessário (migrações, IA, segurança) |

### SOLID — ⚠️ Parcial

| Princípio | Status | Ação recomendada |
|-----------|--------|------------------|
| SRP | ❌ | Extrair `AnalysisService`, `CollaboratorService` de `index.js` |
| OCP | ⚠️ | Métodos ergonômicos extensíveis; rotas acopladas a SQL |
| LSP/I | N/A | Poucas hierarquias de classe |
| DIP | ⚠️ | `AIProviderService` ok; rotas dependem direto de `pool` |

### Clean Architecture — ⚠️ Parcial

- **Presentation:** `src/screens/`, componentes React ✅
- **Application:** parcial em `services/` backend; frontend tudo em `AppContext` ❌
- **Domain:** regras NR-17, RULA, compliance em `services/` e `methods/` ✅
- **Infrastructure:** `db.js`, `redis.js`, migrations ✅
- **Problema:** regras de negócio ainda em `index.js` e rotas grandes

### DDD — ⚠️ Parcial

Organização por módulo de rota (`aetRoutes`, `groRoutes`, `psicoRoutes`) — bom. Falta pastas de domínio explícitas no frontend.

### Segurança — ✅ Forte (pós-auditoria extrema)

| Controle | Implementado |
|----------|--------------|
| JWT + refresh httpOnly | ✅ |
| RBAC granular | ✅ |
| CSRF | ✅ |
| Rate limiting (Redis/memória) | ✅ |
| Sanitização XSS | ✅ |
| bcrypt/pgcrypto | ✅ |
| Auditoria LOGIN/TENANT | ✅ |
| POST /api/tenants fechado | ✅ |

**Gaps:** CORS `*` em dev; sem validação schema (Zod/Joi); secrets default em dev.

### Performance — ⚠️ Melhorado nesta auditoria

- Índices compostos `tenant_id` → `migrate-performance-indexes.js`
- N+1 em dashboards globais (subqueries por tenant)
- Base64 de mídia no PostgreSQL — limitante de escala

### Escalabilidade — ✅ Preparado

Multi-tenant, Docker, K8s HPA, Redis opcional, Prometheus `/metrics`.

### Testes — ⚠️ Melhorado nesta auditoria

| Tipo | Cobertura |
|------|-----------|
| Unit frontend (vitest) | 7 arquivos — engines ergonômicos |
| Unit backend | 11 arquivos — segurança, AET, compliance, IA |
| Smoke / campo | `test:security:smoke`, `test:field` (17/17) |
| E2E automatizado | ❌ ausente |
| CI server tests | ✅ adicionado `npm test` no workflow |

**Meta 80%:** não atingida globalmente; domínio crítico (segurança, risco) coberto.

### Logs — ✅ Adequado

JSON stdout, `security_audit_log`, `auditoria_suporte`, AI audit JSONL. `LOG_LEVEL` não wired.

### Banco de dados — ⚠️ Melhorado

22 migrações manuais; sem version table. Índices de performance adicionados via script idempotente.

### Frontend — ✅ Responsivo / ⚠️ A11y

Breakpoints 480/768/1024px, safe areas, print. A11y: `aria-*` parcial; **corrigido:** `focus-visible`, `prefers-reduced-motion`.

### API — ⚠️ Padronização iniciada

Envelope `{ success, message, data }` definido em `server/src/utils/apiResponse.js`. Adoção incremental — rate limit já migrado.

### DevOps — ✅ Presente

`.github/workflows/ci.yml`, `infra/docker/`, `k8s/base/`, observability stack.

---

## 4. Ações executadas nesta auditoria

| # | Ação | Arquivo |
|---|------|---------|
| 1 | Envelope API padronizado | `server/src/utils/apiResponse.js` |
| 2 | Testes do envelope | `server/src/__tests__/apiResponse.unit.test.js` |
| 3 | Rate limit em PT + envelope | `server/src/middleware/rateLimit.js` |
| 4 | Índices performance tenant | `server/scripts/migrate-performance-indexes.js` |
| 5 | CI executa testes server | `.github/workflows/ci.yml` |
| 6 | Script `npm test` unificado | `server/package.json` |
| 7 | A11y focus + reduced motion | `src/styles/global.css` |

## 4b. Roadmap completo — implementado em 2026-06-12

| # | Item roadmap | Status | Detalhe |
|---|--------------|--------|---------|
| 1 | Extrair services de `index.js` | ✅ | `collaboratorService.js`, `analysisService.js`, `tenantService.js`; `index.js` 1017→321 linhas |
| 2 | Fragmentar `AppContext.tsx` | ✅ | `fetchTenantDataBundle`, `applyTenantDataBundle`, `useCollaboratorActions`, `useAetActions`, `contextTypes.ts` |
| 3 | Adotar `apiResponse` | ✅ | Core routes, tenants, auth (erros), rate limit; client unwrap `data` |
| 4 | Validação Zod | ✅ | `validation/schemas.js` + middleware; login, tenant, colaborador, setor, análise |
| 5 | Migration runner | ✅ | `migrate-runner.js` + tabela `schema_migrations` |
| 6 | E2E Playwright | ✅ | `e2e/ergonomista-journey.spec.ts` + `playwright.config.ts` |
| 7 | Storage S3/MinIO | ✅ | `storageService.js` + coluna `storage_key` + `STORAGE_DRIVER=s3\|minio` |

**Testes:** 82 unitários backend · build frontend OK · `npm run test:e2e` disponível

---

## 5. Evolução futura (opcional)

| Item | Descrição |
|------|-----------|
| Fragmentar mais hooks | `useGroActions`, `usePgrActions`, `useAuthActions` |
| Adotar envelope em todas as rotas modulares | AET, GRO, PGR, etc. |
| CI E2E | `npx playwright install` + job no workflow |
| Storage MinIO no compose | `infra/docker/docker-compose.cloud.yml` |

---

## 6. Conclusão

O ErgoSense **atende o perfil SaaS Multi-Tenant + Industrial + IA** definido no PROMPT UNIVERSAL, implementado como **monolito modular cloud-native** — decisão correta para o estágio atual.

**Pontos fortes:** multi-tenancy auditado, RBAC, IA desacoplada, infra K8s/Docker, testes de domínio crítico.

**Pontos a evoluir:** concentração de código em 2 arquivos gigantes, envelope API inconsistente (em migração), cobertura E2E.

**Veredicto:** produto **apto para piloto industrial** com ressalvas de manutenibilidade. As correções desta auditoria endereçam Performance (DB), Testes (CI), API (envelope), Acessibilidade e DevOps — alinhados à revisão obrigatória do PROMPT UNIVERSAL.

---

*Gerado conforme metodologia PROMPT UNIVERSAL — Arquitetura de Software + Clean Code Profissional.*
