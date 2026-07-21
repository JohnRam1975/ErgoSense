# FinCare — Roteiro de Testes (QA)

Documento operacional após a troca do stack Docker/banco.
Use como checklist manual **e** como prompt para auditoria assistida.

## Contexto atual do ambiente

| Item | Valor |
|------|--------|
| Projeto Docker | `fincare` |
| Container do banco | `fincare-db` |
| Compose | `docker/docker-compose.yml` |
| PostgreSQL | `localhost:5433` |
| Database / user / senha | `finnova` / `finnova` / `finnova` |
| Volume de dados | `finnova_finnova_pg` (externo) |
| API | `http://localhost:8080` |
| Health | `http://localhost:8080/api/v1/health` → service `fincare-backend` |
| Swagger | `http://localhost:8080/swagger-ui.html` |
| Frontend | `http://localhost:3001` |
| Config Spring | prefixo `fincare.*` (JWT/auth) |
| Tokens no browser | `fincare.accessToken` / `fincare.refreshToken` / `fincare.user` |

> O **nome do produto** é FinCare. O **nome interno do database** ainda é `finnova` (credenciais e volume) para não perder dados.

## Pré-requisitos

1. Docker Desktop **Running** (Engine ok)
2. Porta **8080 livre** (não pode haver ErgoSense LB / outro app na 8080)
3. Porta **3001** livre para o Next.js
4. Java 22 + Maven
5. Node.js (frontend)

### Subir o sistema

```powershell
# Na raiz do repo
powershell -File scripts/start-postgres.ps1

# Terminal 2
cd backend
mvn spring-boot:run

# Terminal 3
cd frontend
npm run dev
```

### Credenciais demo

- E-mail: `admin@dejohn.com.br`
- Senha: `@admin!2026/DJ`
- Role esperada: `ADMIN`

---

## 0. Smoke (obrigatório antes de tudo)

- [ ] `docker ps` mostra `fincare-db` healthy na `5433`
- [ ] `GET /api/v1/health` → `status=UP`, `service=fincare-backend`
- [ ] Frontend abre em `http://localhost:3001`
- [ ] Login demo funciona e redireciona para `/dashboard`

---

## 1. Scripts automatizados

Rodar na raiz, com API no ar:

```powershell
# Suite completa (postgres + audit + regressão + mvn test + lint + build + load legado)
powershell -File scripts/run-all-tests.ps1

# Ou isolados:
powershell -File scripts/audit-api.ps1
powershell -File scripts/audit-regression.ps1

# Carga recomendada: k6 em staging/local (não no domínio público)
# Instale: winget install GrafanaLabs.k6
$env:PASSWORD = "sua-senha"
powershell -File scripts/run-k6.ps1 -Suite smoke -BaseUrl http://localhost:8080/api/v1
powershell -File scripts/run-k6.ps1 -Suite load -Profile light -BaseUrl http://localhost:8080/api/v1
# Detalhes: k6/README.md

# Legado PowerShell (só local; evitar contra produção):
powershell -File scripts/load-test.ps1
```

### O que cada script cobre

| Script | Foco |
|--------|------|
| `audit-api.ps1` | ~25 casos: auth, dashboard, contas, categorias, transações, metas, cartões, budgets API, shopping, reports, settings, notifications, assistant, XSS, admin |
| `audit-regression.ps1` | Casos curtos de regressão pós-login |
| `k6/smoke.js` + `k6/load.js` | Carga com ramp-up e thresholds (staging/local) |
| `load-test.ps1` | Carga básica legada na API local |
| `mvn test` | Unit/integration Java |
| `npm run lint` / `npm run build` | Frontend |

Resultados gerados (gitignored):

- `audit-api-results.json`
- `load-test-results.json`
- `k6-results.json` (se usar `--out json=...`)

Critério: **0 FAIL** nos audits; thresholds k6 verdes; `mvn test` e `npm run build` verdes.

> **Não** rode `auditoria-longa` Mode S3 (8h) nem `load-test-1000` no domínio público. Use k6 em staging, começando em `PROFILE=light`.

---

## 2. Auth / sessão

### API

- [ ] Login válido (`admin@dejohn.com.br` / `@admin!2026/DJ`) retorna `accessToken`
- [ ] Senha inválida falha (4xx)
- [ ] Sem token → 401 em rotas protegidas
- [ ] `GET /auth/me` retorna email/role
- [ ] Register cria usuário USER
- [ ] Forgot-password devolve `resetToken` (modo local)
- [ ] Reset-password + login com nova senha

### UI

- [ ] `/login` — demo preenchida, erro claro se falhar
- [ ] `/register` — valida campos; redireciona após sucesso
- [ ] `/forgot-password` e `/reset-password`
- [ ] Logout limpa tokens `fincare.*` no localStorage
- [ ] Após limpeza de tokens antigos `finnova.*`, usuário precisa logar de novo (esperado)

---

## 3. Dashboard / Saúde Financeira

- [ ] `/dashboard` carrega saldo, fluxo e insights
- [ ] Score de Saúde Financeira (0–100) aparece
- [ ] Dimensões / indicadores não quebram com conta vazia de dados extras
- [ ] `GET /dashboard/summary` e `/dashboard/cash-flow` ok

---

## 4. Contas

- [ ] Listar contas seed do demo
- [ ] Criar conta
- [ ] Editar nome
- [ ] Arquivar conta (API `/accounts/{id}/archive`)
- [ ] Saldos coerentes após lançamentos

---

## 5. Transações

- [ ] Listar / criar receita e despesa
- [ ] Categoria obrigatória em despesa
- [ ] Modal anti-impulso em gasto `OPTIONAL` / `SUPERFLUOUS`
- [ ] Excluir lançamento (API) e refletir no saldo
- [ ] Dashboard/relatórios atualizam após create

---

## 6. Metas

- [ ] Listar / criar meta
- [ ] Aporte com conta + data
- [ ] Progresso percentual coerente
- [ ] Excluir meta (API)

---

## 7. Cartões / fatura

- [ ] Listar cartões seed
- [ ] Ver faturas do cartão
- [ ] Pagar fatura parcial/total via conta (ledger interno)
- [ ] Sem gateway externo (esperado)

---

## 8. Lista de compras (rota principal `/shopping`)

- [ ] Nav aponta para `/shopping` (não `/planning`)
- [ ] `/budget` redireciona para `/shopping`
- [ ] Segmentos + catálogo (busca “Arroz”)
- [ ] Adicionar item, preço, loja
- [ ] Histórico de preços / sugestão
- [ ] Preview de impacto na Saúde Financeira
- [ ] Finalizar lista
- [ ] Remover / limpar marcados
- [ ] Payload XSS em nome fica como texto (não executa)

---

## 9. Relatórios

- [ ] `/reports` carrega resumo
- [ ] Export CSV baixa `fincare-relatorio.csv`

---

## 10. Assistente IA

- [ ] Criar conversa
- [ ] Enviar mensagem e receber resposta baseada em dados
- [ ] Sem LLM externo (regras + dados locais)

---

## 11. Configurações / Admin

- [ ] `/settings` — ver/editar perfil
- [ ] `/admin` visível só para ADMIN
- [ ] `GET /admin/stats` ok como admin
- [ ] Usuário comum recebe 403 em `/admin/stats`

---

## 12. Banco / Docker (pós-troca de nomes)

- [ ] Projeto no Docker Desktop chama-se **fincare** (não `infrastructure` / `finnova`)
- [ ] Container do Postgres: **fincare-db**
- [ ] Não existem containers órfãos `infrastructure-postgres-*`
- [ ] Flyway em v18 (ou superior) sem erro
- [ ] Reboot: `start-postgres.ps1` sobe `fincare-db` e a API reconecta em `5433`
- [ ] Credenciais JDBC default ainda usam DB `finnova` (proposital)

Comandos úteis:

```powershell
docker ps --filter name=fincare
docker compose -f docker/docker-compose.yml ps
docker exec fincare-db pg_isready -U finnova -d finnova
```

---

## 13. Conflitos conhecidos (Windows)

- [ ] Se API falhar com “Port 8080 was already in use”, verificar Kubernetes do Docker Desktop (ex.: `ergosense-web-lb` em 8080) e remover/parar o serviço conflitante
- [ ] Não matar `com.docker.backend.exe` para liberar porta — derruba o Docker Desktop
- [ ] Já dentro de `backend\`, rodar só `mvn spring-boot:run` (sem `cd backend` de novo)

---

## 14. Critérios de aceite desta rodada

Passa se:

1. Smoke (seção 0) 100%
2. `audit-api.ps1` e `audit-regression.ps1` sem FAIL
3. Fluxos UI críticos: login, dashboard, transação, shopping, logout
4. Nomes Docker = `fincare` / `fincare-db`
5. App responde em `3001` + API `8080`

---

## Prompt rápido para auditoria assistida

```text
Audite o FinCare no estado atual.
Ambiente: Docker projeto fincare, container fincare-db, Postgres localhost:5433 db=finnova,
API :8080, frontend :3001, login admin@dejohn.com.br / @admin!2026/DJ.
Execute scripts/audit-api.ps1 e scripts/audit-regression.ps1.
Faça smoke manual das rotas /dashboard, /transactions, /shopping, /reports, /admin.
Reporte PASS/FAIL por módulo, bugs encontrados e risco (P0/P1/P2).
Não altere código sem eu pedir — só teste e reporte.
```
