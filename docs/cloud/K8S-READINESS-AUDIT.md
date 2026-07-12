# ErgoSense — Auditoria Cloud-Native e Preparação Kubernetes

**Data:** 2026-06-03  
**Escopo:** ERGOSENSE monorepo (ergosense-app, backend Spring, docs, infra)  
**Objetivo:** Continuar em Docker Compose; estar pronto para K8s sem reescrita.

---

## FASE 1 — Auditoria de arquitetura

### Estrutura atual

| Componente | Localização | Estado |
|------------|-------------|--------|
| Web MVP | `ergosense-app/` (React + Vite) | Produção demo |
| API Node | `ergosense-app/server/` | **API ativa** |
| Backend Java | `backend/` (Spring Boot) | Scaffold, não é o runtime principal |
| Compose legado | `backend/docker-compose.yml` | Só Postgres + MinIO (porta 5432) |
| Compose cloud | `infra/docker/docker-compose.cloud.yml` | **Novo — stack completo** |
| Banco | PostgreSQL (5433 Docker / 5432 nativo) | Schema legado `usuarios`, `analises` |
| Schema SaaS v1 | `docs/database/ergosense-saas-schema-v1.sql` | Não aplicado no app |
| K8s manifests | `k8s/base/` | Gerados, não aplicados |
| CI | `.github/workflows/ci.yml` | Novo |

### Acoplamentos e riscos identificados

| # | Problema | Impacto K8s / escala | Severidade |
|---|----------|----------------------|------------|
| 1 | Fotos em `imagem_base64` no PostgreSQL | PVC gigante, pods stateful implicitamente, backup lento | **Crítico** |
| 2 | Sem Redis em produção Node | Rate limit e sessão não compartilham entre réplicas | Alto |
| 3 | Auth por header `x-user` (demo), sem JWT central | Impossível escalar seguramente | Alto |
| 4 | Duas instâncias PostgreSQL (5432 vs 5433) | Confusão operacional (já ocorreu) | Médio |
| 5 | API monolítica em `index.js` (~800 linhas) | Escala horizontal OK, manutenção difícil | Médio |
| 6 | Spring Boot paralelo não integrado | Duplicidade de stack | Baixo |
| 7 | Frontend `VITE_API_URL` fixo no build | Requer rebuild por ambiente ou proxy único | Médio |
| 8 | Sem fila de jobs (IA/vídeo) | Processamento síncrono bloqueia API | Alto |
| 9 | Tenant por `tenant_id` VARCHAR em SQL | OK para MT, falta RLS no legado | Médio |
| 10 | Logs não estruturados historicamente | Corrigido parcialmente (JSON em boot) | Baixo |

### O que já é compatível com Kubernetes

- API **stateless** (sem sessão em disco local)
- Configuração via **variáveis de ambiente** (`src/config/env.js`)
- **Health probes** `/health/live`, `/health/ready`, `/health`
- **Métricas** `/metrics` (formato Prometheus)
- **SIGTERM** graceful shutdown
- **Dockerfiles** multi-stage / non-root
- **Nginx** upstream para múltiplas réplicas API
- **Compose** com `--scale api=N`

### Gargalos de escala (10M+ registros)

| Área | Gargalo | Mitigação planejada |
|------|---------|---------------------|
| `fotos_analise.imagem_base64` | Tamanho linha + I/O | MinIO/S3 + URL |
| `pontos_corporais` (futuro) | Volume por vídeo | Particionamento mensal + TTL |
| `analises` | Índice tenant + data | Índices compostos (já parcial) |
| Conexões PG | Pool por pod | PgBouncer / RDS Proxy |
| PDF client-side | CPU no browser | Job assíncrono + storage |

---

## FASE 2 — Containerização

### Backend (Node)

| Critério | Status |
|----------|--------|
| Stateless | ✅ |
| Sem disco local | ✅ (exceto se gravar uploads — ainda DB) |
| Logs stdout | ✅ JSON estruturado no boot |
| Healthcheck Docker | ✅ |
| Usuário non-root | ✅ UID 1001 |

Arquivo: `infra/docker/Dockerfile.api`

### Frontend

| Critério | Status |
|----------|--------|
| Build Vite produção | ✅ |
| Nginx alpine | ✅ |
| Cache assets | ✅ `spa.conf` |
| API via proxy `/api` | ✅ `proxy.conf` |

Arquivo: `infra/docker/Dockerfile.web`

### PostgreSQL

- Volume `pgdata` no Compose
- Backup: script cron + `pg_dump` (ver `infra/docker/scripts/backup-postgres.sh` — criar em ops)
- Em K8s: usar **RDS / Cloud SQL** ou operador + PVC

### Redis

- AOF habilitado no Compose
- Health `redis-cli ping`
- Uso previsto: cache, rate limit global, filas BullMQ

---

## FASE 3 — Escalabilidade horizontal

```
1 réplica → 3 → 10 → 50
```

| Requisito | Pronto? | Observação |
|-----------|---------|------------|
| Múltiplas instâncias API | ✅ | `docker compose --scale api=3` |
| Sessão compartilhada | ⚠️ | Ativar Redis + JWT |
| Cache compartilhado | ⚠️ | Redis |
| Filas | ❌ | Adicionar BullMQ + worker deployment |
| Uploads compartilhados | ❌ | MinIO obrigatório antes de 10+ réplicas |

**Sem alteração de código** para escalar réplicas: **sim**, desde que Redis + object storage estejam ativos.

---

## FASE 4 — Load balancing

`infra/docker/nginx/proxy.conf`:

- `upstream ergosense_api` com `least_conn`
- `max_fails=3 fail_timeout=30s`
- `proxy_next_upstream` para failover
- Gateway na porta `8080`

Comando:

```powershell
docker compose -f infra/docker/docker-compose.cloud.yml up -d --scale api=3
```

---

## FASE 5 — Observabilidade

| Ferramenta | Arquivo | Porta |
|------------|---------|-------|
| Prometheus | `infra/docker/observability/prometheus/prometheus.yml` | 9090 |
| Grafana | provisioning em `observability/grafana/` | 3000 |
| postgres-exporter | compose service | 9187 |
| redis-exporter | compose service | 9121 |
| API metrics | `/metrics` | — |

Dashboards Grafana: configurar manualmente ou importar JSON (pasta `dashboards/json` — próxima iteração).

---

## FASE 6 — Health checks

| Endpoint | Probe K8s | Função |
|----------|-----------|--------|
| `GET /health/live` | liveness | Processo vivo |
| `GET /health/ready` | readiness | Postgres + Redis |
| `GET /health` | agregado | Status geral |
| `GET /api/health` | legado | Compatibilidade |

Implementação: `ergosense-app/server/src/health.js`

---

## FASE 7 — Configuração externa

Centralizado em `ergosense-app/server/src/config/env.js`.

| Tipo | Exemplos |
|------|----------|
| ConfigMap (K8s) | PGHOST, REDIS_URL, STORAGE_DRIVER |
| Secret (K8s) | PGPASSWORD, STORAGE_SECRET_KEY, JWT |
| Compose `.env` | `infra/docker/.env.example` |

**Nada crítico deve permanecer hardcoded** — revisar `index.js` gradualmente.

---

## FASE 8 — Multitenancy

| Aspecto | Atual | Meta 5000 tenants |
|---------|-------|-------------------|
| Isolamento | `tenant_id` em queries | RLS PostgreSQL (schema SaaS) |
| Auth | Header demo | JWT + tenant claim |
| Limites plano | Não enforce | Tabela `tenants.limite_usuarios` |
| Suporte cross-tenant | `supportAuth.js` | Audit + tempo limitado ✅ |

Escala 100 → 5000 empresas: exige **connection pooling**, **read replicas**, **object storage**, **sharding opcional** por `tenant_id` hash.

---

## FASE 9 — Storage

| Tipo | Hoje | Futuro |
|------|------|--------|
| Fotos | BYTEA/base64 PG | MinIO/S3 |
| PDF laudo | Client-side download | S3 + URL assinada |
| Vídeo | Não persistido servidor | S3 + pipeline IA |

Abstração: `ergosense-app/server/src/storage/index.js`  
Env: `STORAGE_DRIVER=database|minio|s3`

---

## FASE 10 — Banco de dados

| Item | Legado | SaaS v1 |
|------|--------|---------|
| PK | BIGSERIAL | UUID |
| Índices | Básicos | Completos no script SaaS |
| Particionamento | Não | `pontos_corporais` por mês (futuro) |
| Backup | Manual | `pg_dump` diário + WAL em prod |
| Réplica | Não | Read replica RDS |
| 10M+ rows | Risco em fotos | Mover mídia para S3 |

---

## FASE 11 — Segurança

| Controle | Status |
|----------|--------|
| HTTPS | Ingress TLS (K8s) / reverse proxy |
| Security headers | ✅ `middleware/security.js` |
| Rate limiting | ✅ in-memory (Redis global pendente) |
| Brute force login | ⚠️ implementar no auth real |
| Auditoria | ✅ `audit_log`, `auditoria_suporte` |
| Logs estruturados | ✅ parcial |

---

## FASE 12 — CI/CD

Pipeline: `.github/workflows/ci.yml`

1. Build + test web  
2. Check API syntax  
3. Build imagens Docker (push em `main`)  
4. `kubectl apply --dry-run` manifests  

Deploy automático (staging/prod): adicionar jobs com secrets registry + kubectl/helm.

---

## FASE 13 — Kubernetes (gerado, não aplicado)

Pasta: `k8s/base/`

- Namespace, ConfigMap, Secret  
- Deployment + Service (api, web)  
- Ingress TLS  
- HPA 2–50 réplicas  
- PVC Postgres/Redis (referência; preferir managed DB em prod)

Validar: `kubectl apply -k k8s/base --dry-run=client`

---

## FASE 14 — Roadmap

### 1. Situação atual

- MVP web + API Node funcionais em dev  
- PostgreSQL Docker 5433 com schema legado  
- Sem stack Compose unificada até este documento  
- Sem K8s em execução  

### 2. O que está correto

- Multitenancy lógico por `tenant_id`  
- API sem estado de arquivo local  
- Documentação arquitetural rica (`docs/ARCHITECTURE.md`)  
- Schema SaaS modelado  
- MinIO previsto no backend Java compose  

### 3. O que precisa melhorar

1. Migrar mídia para object storage  
2. JWT + Redis obrigatório em multi-réplica  
3. Filas para IA/vídeo  
4. Unificar PostgreSQL (uma instância oficial)  
5. Modularizar API Node (routes/services)  
6. Aplicar schema SaaS ou ETL  

### 4. O que impede Kubernetes hoje

| Bloqueador | Esforço |
|------------|---------|
| Base64 no banco | 2–3 semanas |
| Auth demo | 1–2 semanas |
| Sem registry CI/CD imagens | 3 dias |
| Secrets management | 2 dias |
| Worker IA separado | 2 semanas |

### 5. Plano de evolução

| Fase | Entrega | Duração estimada |
|------|---------|------------------|
| **A** | Compose cloud + health + metrics | ✅ Feito |
| **B** | MinIO upload + remover base64 | 2 sem |
| **C** | Redis sessão + rate limit global | 1 sem |
| **D** | JWT + refresh token | 2 sem |
| **E** | Worker filas (BullMQ) | 2 sem |
| **F** | Staging K8s (1 cluster) | 1 sem |
| **G** | HPA + observabilidade completa | 1 sem |
| **H** | Prod multi-AZ | 2 sem |

### 6. Prioridades

1. **P0** — Object storage (bloqueia escala)  
2. **P0** — Auth produção  
3. **P1** — Redis + filas  
4. **P1** — CI/CD push imagens  
5. **P2** — K8s staging  
6. **P2** — Schema SaaS migração  

### 7. Esforço total estimado

| Cenário | Pessoa-semana |
|---------|---------------|
| Mínimo viável K8s | 6–8 |
| Produção enterprise (5000 tenants) | 20–30 |

### 8. Custo estimado (cloud mensal)

| Escala | AWS/Azure aproximado |
|--------|----------------------|
| Dev/Staging | USD 150–400 |
| 100 tenants, 500 users | USD 800–1.500 |
| 1000 tenants | USD 3.000–6.000 |
| 5000 tenants | USD 12.000–25.000+ |

*Inclui: 3× API pods, RDS, ElastiCache, S3, ALB, observabilidade.*

---

## Como usar hoje (Docker Compose)

```powershell
cd c:\Users\Djohn\Desktop\SOFTWARE\ERGOSENSE\infra\docker
copy .env.example .env
# Edite POSTGRES_PASSWORD e MINIO_ROOT_PASSWORD
docker compose -f docker-compose.cloud.yml up -d --build
# Escalar API:
docker compose -f docker-compose.cloud.yml up -d --scale api=3
```

Acesso:

- App: http://localhost:8080  
- Grafana: http://localhost:3000  
- Prometheus: http://localhost:9090  

---

## Arquivos entregues nesta iniciativa

```
infra/docker/
  docker-compose.cloud.yml
  Dockerfile.api
  Dockerfile.web
  .env.example
  nginx/proxy.conf
  nginx/spa.conf
  observability/prometheus/prometheus.yml
  observability/grafana/provisioning/...

ergosense-app/server/src/
  config/env.js
  health.js
  metrics.js
  redis.js
  storage/index.js
  middleware/security.js

k8s/base/*.yaml
.github/workflows/ci.yml
docs/cloud/K8S-READINESS-AUDIT.md
```

---

*ErgoSense — Cloud-Native Readiness v1.0*
