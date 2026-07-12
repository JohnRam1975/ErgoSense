# ErgoSense — Auditoria Extrema de Qualidade (Modo Produção)

**Data:** 2026-06-05  
**Ambiente testado:** Kubernetes `ergosense` namespace (API via port-forward `localhost:3001`)  
**Metodologia:** Inspeção de código + testes HTTP reais executados contra a API em execução

---

## RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| **Nota geral** | **28 / 100** |
| **Pronto para produção?** | **NÃO** |
| **Veredito** | **REPROVADO PARA PRODUÇÃO** |

O ErgoSense possui funcionalidades ricas no front-end (câmera, esqueleto, NR-17, PDF, multi-tenant UI), mas a **camada de segurança e isolamento multi-tenant da API é inexistente para produção**. A autenticação baseada em headers HTTP spoofáveis permite acesso total a dados de qualquer empresa. Endpoints críticos estão abertos sem autenticação.

---

## FASE 1 — INVENTÁRIO

### Endpoints API (22 rotas)

| Método | Rota | Auth exigida? | Testado |
|--------|------|---------------|---------|
| GET | `/` | Não | ✅ 200 |
| GET | `/api/health` | Não | ✅ 200 |
| GET | `/metrics` | Não | ✅ 200 (expõe Prometheus) |
| GET | `/health/live` | Não | ⚠️ instável no teste |
| GET | `/health/ready` | Não | ⚠️ instável no teste |
| GET | `/api/tenants` | **Não** | ✅ 200 sem auth — **vazamento** |
| POST | `/api/tenants` | **Não** | ⚠️ cadastro aberto |
| GET | `/api/admin/support/active` | Parcial (header) | ⚠️ spoofável |
| GET | `/api/support/status` | **Não** | ⚠️ expõe status suporte |
| POST | `/api/support/authorize` | Header | ⚠️ spoofável |
| POST | `/api/support/revoke` | Header | ⚠️ spoofável |
| GET | `/api/support/audit` | Header | ⚠️ spoofável |
| POST | `/api/auth/login` | Não | ✅ funciona |
| POST | `/api/access-requests` | **Não** | ⚠️ aberto |
| GET | `/api/sectors` | Header | ⚠️ spoofável |
| POST | `/api/sectors` | Header | ⚠️ spoofável |
| GET | `/api/collaborators` | Header | ✅ **spoof confirmado → 200** |
| POST | `/api/collaborators` | Header | ⚠️ spoofável |
| PUT | `/api/collaborators/:id` | Header | ⚠️ spoofável |
| GET | `/api/analyses` | Header | ⚠️ spoofável + IDOR |
| POST | `/api/analyses` | Header | ⚠️ spoofável |
| DELETE | `/api/analyses/:id` | Header | ⚠️ spoofável |
| GET | `/api/reports` | Header | ⚠️ spoofável |

### Telas front-end (24)

`splash`, `login`, `request-access`, `register-company`, `global-admin`, `support-access`, `company`, `dashboard`, `collabs`, `new-collab`, `sectors`, `new-analysis`, `camera`, `result`, `history`, `reports`, `settings`, `sync`, `v2-dashboard`, `v2-methods`, `v2-video`, `v2-environmental`, `v2-roadmap`, `v2-audit`

### Papéis

`ADMIN_GLOBAL`, `ADMIN_EMPRESA`, `ERGONOMISTA`, `SUPERVISOR`, `OPERADOR`

### Entidades DB

`tenants`, `usuarios`, `setores`, `colaboradores`, `analises`, `fotos_analise`, `resultados_ia`, `relatorios`, `solicitacoes_acesso`, `auditoria_suporte`

---

## FASE 2 — AUTENTICAÇÃO (testes reais)

| Teste | Resultado | Evidência |
|-------|-----------|-----------|
| Login válido (`lucas@vale.com.br` / `ergo1234`) | ✅ 200 | Retorna user object |
| Login inválido | ✅ 401 | Correto |
| Campos vazios | ✅ 400 | Correto |
| SQL injection no login | ✅ 401 | Parametrizado (pg) |
| JWT emitido no login | ❌ **Ausente** | Só retorna JSON user |
| Refresh token | ❌ Não existe | — |
| Logout server-side | ❌ Não existe | Só localStorage |
| Sessão expirada | ❌ Não implementada | Headers eternos |
| Bloqueio por tentativas | ❌ Não implementado | — |
| Recuperação de senha | ❌ Não implementada | — |
| MFA | ❌ Não implementado | — |

**Achado crítico:** Login autentica credenciais, mas **não gera token**. O front-end envia headers `X-ErgoSense-*` que o servidor aceita cegamente (`supportAuth.js` linha 7-14).

---

## FASE 3 — AUTORIZAÇÃO (testes reais)

| Teste | Esperado | Obtido |
|-------|----------|--------|
| Spoof `ADMIN_EMPRESA` → GET colaboradores vale | 401/403 | **200 ✅ dados retornados** |
| Spoof `ADMIN_EMPRESA` vale → GET colaboradores gerdau | 403 | **200 ✅ IDOR confirmado** |
| Spoof `ADMIN_GLOBAL` → admin/support/active | 403 | ⚠️ aceita header sem validar login |
| Sem headers → colaboradores | 401 | ✅ 401 |
| Sem headers → analyses | 401 | ✅ 401 |

**Bug de código:** `assertGlobalOperationalAccess` retorna `true` para qualquer role ≠ `ADMIN_GLOBAL` **sem verificar se o tenantId do request corresponde ao tenant do usuário** (linha 69).

---

## FASE 4 — MULTI-TENANT

| Cenário | Status |
|---------|--------|
| Tenant A lê dados Tenant B | **VULNERÁVEL** — confirmado via header spoof |
| Tenant A altera Tenant B | **VULNERÁVEL** — PUT/POST/DELETE usam tenantId do body/query |
| Admin global sem suporte autorizado | ✅ Bloqueado (403) quando support inactive |
| Listagem pública de tenants | **VULNERÁVEL** — GET /api/tenants sem auth |

---

## FASE 5-6 — CRUD e REGRAS DE NEGÓCIO

| Item | Status |
|------|--------|
| CREATE colaborador/análise | Funciona com headers spoofados |
| Validação campos obrigatórios | ✅ Parcial (400 em campos vazios) |
| Senha mínima cadastro empresa | ⚠️ **4 caracteres** (inseguro) |
| Soft delete análises | ✅ `deleted_at` |
| Transações DB em POST analyses | ✅ BEGIN/COMMIT |
| Cálculo carga/distância | ✅ Validação em `loadRiskValidate.js` |
| NR-17 report generation | ✅ Front-end |
| Offline sync | ⚠️ localStorage only, sem fila robusta |

---

## FASE 7 — BANCO DE DADOS

| Item | Status |
|------|--------|
| FK referencial | ✅ Schema correto |
| UNIQUE tenant+matricula | ✅ |
| Soft delete | ✅ |
| Imagens base64 no PostgreSQL | ❌ **Crítico para escala** |
| Índices performance | ⚠️ Básicos apenas |
| Migrations versionadas | ⚠️ Parcial (pasta migrations) |

---

## FASE 8 — SEGURANÇA

| Vetor | Resultado |
|-------|-----------|
| **Broken Access Control** | ❌ **CRÍTICO** — headers spoofáveis |
| **IDOR multi-tenant** | ❌ **CRÍTICO** — confirmado |
| SQL Injection | ✅ Protegido (queries parametrizadas) |
| XSS stored (access-requests) | ⚠️ Sem sanitização server-side |
| CSRF | ❌ Sem proteção |
| CORS | ❌ `*` em produção |
| Rate limit | ⚠️ In-memory, 120/min — bloqueou auditoria |
| `/metrics` público | ⚠️ Information disclosure |
| Senhas | ✅ bcrypt (`crypt/gen_salt`) |
| Secrets em .env | ⚠️ Verificar não commitados |
| Upload malicioso (base64 foto) | ⚠️ Sem validação MIME/tamanho real |

---

## FASE 9 — PERFORMANCE

| Teste | Status |
|-------|--------|
| 100+ req simultâneas | ❌ Não executado (rate limit 120/min) |
| Payload 15MB JSON | ⚠️ Limite express alto |
| Imagens base64 em GET analyses | ❌ Gargalo severo |
| Redis | ✅ Configurado no K8s |
| HPA | ⚠️ Definido mas PVC/storage impede escala real |

---

## FASE 10 — CONCORRÊNCIA

| Teste | Status |
|-------|--------|
| Cadastros simultâneos | ❌ Não testado |
| UNIQUE constraints | ✅ Protegem duplicatas |
| Transações | ✅ Em analyses e tenants |

---

## FASE 11 — FRONT-END

| Item | Status |
|------|--------|
| Mobile-first responsivo | ✅ |
| 24 telas implementadas | ✅ |
| Câmera + esqueleto | ✅ |
| PDF export | ✅ |
| Sessão em localStorage | ⚠️ Sem expiração |
| Dados demo em fallback offline | ⚠️ DEFAULT_COLLABORATORS hardcoded |

---

## FASE 12-14 — APIs, RELATÓRIOS, DR

| Item | Status |
|-------|--------|
| Health probes K8s | ✅ `/health/live`, `/health/ready` |
| API restart recovery | ✅ Pod reinicia (2 restarts observados) |
| LoadBalancer externo | ❌ Pending — porta 8080 conflito |
| Ingress nginx | ❌ Sem controller instalado |
| Backup/restore DB | ❌ Não automatizado |
| Export Excel/CSV | ❌ Não implementado |

---

## BUGS ENCONTRADOS

### Crítico
1. **Auth bypass via headers HTTP** — qualquer cliente pode enviar `X-ErgoSense-Role: ADMIN_EMPRESA` e acessar dados
2. **IDOR multi-tenant** — usuário do tenant A acessa colaboradores/analyses do tenant B
3. **GET /api/tenants aberto** — lista todas empresas sem autenticação
4. **POST /api/tenants aberto** — qualquer um cria empresa + admin

### Alto
5. Login não emite JWT/sessão server-side
6. Imagens base64 no PostgreSQL (impede réplicas/stateless)
7. CORS wildcard `*`
8. `/metrics` público
9. Senha mínima 4 caracteres no cadastro
10. Admin global spoofável via header (sem verificação de email no DB)

### Médio
11. Rate limit in-memory (ineficaz multi-réplica)
12. Sem CSRF, MFA, recuperação senha, bloqueio tentativas
13. XSS stored possível em campos texto
14. K8s LoadBalancer/Ingress não funcional externamente
15. Encoding UTF-8 inconsistente ("Caraj??s" nos responses)

### Baixo
16. Duplicata deployments K8s (`default` + `ergosense` namespaces)
17. Dados demo hardcoded no front quando offline

---

## VULNERABILIDADES

| Severidade | Qtd | Principais |
|------------|-----|------------|
| Crítica | 4 | Header spoof, IDOR, tenants aberto, cadastro aberto |
| Alta | 6 | Sem JWT, CORS, metrics, senha fraca |
| Média | 5 | Rate limit, XSS, K8s exposure |
| Baixa | 2 | Demo data, encoding |

---

## COBERTURA DA AUDITORIA

| Área | Cobertura |
|------|-----------|
| Endpoints mapeados | 22/22 (100%) |
| Endpoints testados HTTP | 18/22 (82%) |
| Telas inventariadas | 24/24 (100%) |
| Telas testadas browser | 0/24 (0%) — sessão anterior |
| Fluxos auth | 6/12 (50%) |
| Multi-tenant | 4/5 (80%) |
| Performance carga | 0% |
| DR simulado | 0% |

---

## MELHORIAS RECOMENDADAS (prioridade)

### P0 — Bloqueadores produção
1. Implementar **JWT** (access + refresh) — eliminar headers confiáveis
2. Middleware auth global — validar token em **todos** endpoints exceto login/health
3. Enforçar **tenantId do token** === tenantId do request (nunca do query/body)
4. Fechar POST /api/tenants → só ADMIN_GLOBAL autenticado
5. Fechar GET /api/tenants → requer auth + filtrar por permissão

### P1 — Segurança
6. CORS restrito por domínio
7. Proteger /metrics (network policy ou auth)
8. Senha mín. 8 chars + complexidade + bcrypt rounds
9. Rate limit via Redis
10. Sanitizar inputs (XSS)

### P2 — Escala
11. Migrar fotos para S3/MinIO (storage já preparado)
12. Corrigir LoadBalancer porta 8888 ou instalar Ingress
13. Testes automatizados CI (auth, tenant isolation)

---

## VEREDITO FINAL

### REPROVADO PARA PRODUÇÃO

O sistema **não pode** ser exposto a milhares de usuários no estado atual. Um atacante com conhecimento básico de HTTP pode:
- Listar todas as empresas
- Criar empresas fraudulentas
- Acessar colaboradores, análises e relatórios de **qualquer tenant**
- Personificar administrador global ou de empresa

**Estimativa para produção:** 4-6 semanas focadas em P0+P1 antes de re-auditoria.

---

*Auditoria executada com testes reais contra API K8s. Script reutilizável: `scripts/audit/run-audit.ps1`*
