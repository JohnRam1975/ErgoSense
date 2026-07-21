# ErgoSense — Auditoria Enterprise (Etapa 1)

**Data:** 2026-06-12  
**Escopo:** Arquitetura completa pré-evolução enterprise  
**Baseline operacional:** TESTE-OPERACIONAL R3 — nota 88/100

---

## 1. Arquitetura atual (pré-enterprise)

| Camada | Tecnologia | Estado |
|--------|------------|--------|
| Frontend | React 18 + Vite + TypeScript | 80 telas (`ScreenId`), E2E 80/80 |
| API | Node.js 22 + Express | ~196 rotas REST |
| Banco | PostgreSQL 16 | Multi-tenant por `tenant_id` |
| Auth | JWT access + refresh HTTP-only + CSRF | RBAC por perfil |
| Cache | Map local (`riskCriteriaService`) | Parcial |
| Redis | ioredis opcional | Rate limit apenas |
| Filas | `setInterval` (`complianceScheduler`) | Síncrono |
| IA | `AIExpertService` monolítico | Multi-provider |
| Observabilidade | `/metrics` Prometheus básico | Sem tracing |
| Docs API | Inexistente | — |
| MFA | Inexistente | — |
| Infra | Docker Compose + K8s base + CI | Parcial |

---

## 2. Backend — módulos mapeados

- **Auth:** login, refresh, logout, refresh tokens DB
- **RBAC:** `ADMIN_GLOBAL`, `ADMIN_EMPRESA`, `ERGONOMISTA`, `OPERADOR` + permissões granulares
- **Multi-tenant:** JWT + `tenantGuard` + suporte autorizado
- **Módulos SST:** GRO, PGR, AET, Psicossocial, SST, eSocial, Compliance, Denúncias, Org, Inventário NR-01
- **IA:** 16 endpoints `/api/ai/expert/*`
- **Segurança:** `security_audit_log`, `login_attempts`, rate limit memória/Redis

---

## 3. Gaps identificados (prioridade)

| ID | Gap | Prioridade | Status pós-implementação |
|----|-----|------------|--------------------------|
| G1 | Cache distribuído dashboards | P0 | ✅ `CacheService` + middleware |
| G2 | Rate limit multi-instância | P0 | ✅ Redis + tenant key |
| G3 | Sessões cluster | P0 | ✅ `SessionService` Redis |
| G4 | RabbitMQ filas | P0 | ✅ `QueueService` + 11 filas |
| G5 | OpenAPI 100% | P1 | ✅ 196 paths gerados |
| G6 | Métricas expandidas | P1 | ✅ latência, cache, filas, pool |
| G7 | Grafana dashboards | P1 | ✅ Executivo + Operacional |
| G8 | Tracing | P1 | ✅ OpenTelemetry-lite |
| G9 | MFA TOTP | P1 | ✅ setup/enable/verify |
| G10 | AI Engine specialists | P1 | ✅ 9 especialistas |
| G11 | PgBouncer | P2 | 📋 Documentado (Compose/K8s) |
| G12 | Cobertura 90% unit | P2 | 95 testes (baseline 83→95) |
| G13 | Integração 100% endpoints | P2 | Scaffold + OpenAPI |
| G14 | E2E 100% telas | — | ✅ 80/80 (já existia) |

---

## 4. Banco de dados

- **Migrations:** 20+ scripts modulares + `migrate-enterprise.js` (MFA, audit trail, queue_jobs)
- **Índices performance:** `migrate-performance-indexes.js` existente
- **Isolamento:** FK + queries com `tenant_id`

---

## 5. APIs — inventário

Gerado automaticamente: `npm run openapi:generate` → **196 paths** documentados.

Principais grupos:
- Auth (6), MFA (4), AI Expert (16), AI Engine (3)
- GRO (17), PGR (12), AET (35), Psico (21), SST (25), eSocial (17), Compliance (21)

---

## 6. Segurança — matriz

| Controle | Antes | Depois |
|----------|-------|--------|
| JWT + refresh | ✅ | ✅ |
| CSRF | ✅ | ✅ |
| Rate limit distribuído | Parcial | ✅ Redis |
| MFA TOTP | ❌ | ✅ |
| Audit DB | ✅ | ✅ + SIEM JSON stdout |
| IDOR tenant | ✅ | ✅ |
| Brute force login | ✅ | ✅ + Redis |

---

## 7. Multi-tenant

- Resolução via JWT (não spoofável)
- `ADMIN_GLOBAL` com suporte autorizado e audit trail
- Cache/filas keyed por `tenant_id`

---

## 8. Recomendações operacionais

1. Executar `npm run migrate:enterprise` antes de MFA em produção
2. Ativar `REDIS_ENABLED=true`, `RABBITMQ_ENABLED=true` no Compose cloud
3. Definir `MFA_ENCRYPTION_KEY` e `METRICS_TOKEN` em secrets K8s
4. Para 5000 usuários: escalar API `replicas: 3+`, PgBouncer, Redis cluster

---

**Próximo documento:** `ENTERPRISE-R4-FINAL.md` — evidências pós-implementação
