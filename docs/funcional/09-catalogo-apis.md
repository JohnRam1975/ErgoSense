# 09 — Catálogo completo de APIs

Montagem: `server/src/app.js` + `index.js`. Auth JWT nas rotas `/api/*` exceto públicas.

## Saúde e plataforma

| Método | Path | Propósito |
|--------|------|-----------|
| GET | `/` | Info API |
| GET | `/api/health` | Ping DB |
| GET | `/health`, `/health/live`, `/health/ready` | Health estendido |
| GET | `/metrics` | Prometheus |
| GET | `/api/openapi.json` | Spec OpenAPI |
| GET | `/api/docs` | Swagger UI |
| GET | `/api/system/ai-status` | Status IA |

## Auth · `/api/auth`

| Método | Path |
|--------|------|
| POST | `/login` |
| POST | `/refresh` |
| POST | `/logout` |
| PUT | `/profile` |
| GET | `/me` |
| POST | `/forgot-password` |
| GET | `/reset-password/preview` |
| POST | `/reset-password` |
| GET/POST | `/activate-account` (+ preview) |

## MFA · `/api/auth/mfa`

| Método | Path |
|--------|------|
| GET | `/status` |
| POST | `/setup` |
| POST | `/enable` |
| POST | `/disable` |
| POST | `/verify` |

## Público / onboarding

| Método | Path |
|--------|------|
| POST | `/api/public/tenant-request` |
| GET | `/api/public/plans` |
| POST | `/api/access-requests` |
| GET/POST | `/api/public/support-contact` |

## Admin tenants

| Prefixo | Operações |
|---------|-----------|
| `/api/admin/tenant-requests` | list, detail, approve, reject, request-adjustment, block |
| `/api/admin/tenants` | list, metadata, detail, update, block, suspend, deactivate, grant-access, reactivate |
| `/api/tenants` | GET (do usuário), POST (ADMIN_GLOBAL) |

## Core

| Prefixo | Operações |
|---------|-----------|
| `/api/sectors` | GET, POST |
| `/api/collaborators` | GET, POST, PUT/:id, DELETE/:id |
| `/api/analyses` | GET, POST, DELETE/:id, GET/:id/video |
| `/api/reports` | GET |

## Inventário · `/api/risk-inventory`

summary · CRUD · `/:id/compliance` · `/:id/links`

## GRO · `/api/gro`

dashboard · workflow (advance/complete-review/revert) · action plans · indicators · history · reports

## PGR · `/api/pgr`

program · versions · generate · submit-approval · approve · reject · sign · revision · history

## Psicossocial · `/api/psico`

dashboard · fatores · matriz · conformidade · campanhas · form público · respostas · indicadores · tendências · alertas · plano · histórico · LGPD

## AET · `/api/aet`

processos/etapas · vibração · teleatendimento · organização · métodos · relatório · mobiliário/equipamentos · histórico · responsável · versões corporativas

## SST · `/api/sst`

dashboard · relatórios · APR · EPI (+ entrega) · EPC · inspeções · auditorias · NC · CAPA · treinamentos · histórico

## eSocial · `/api/esocial`

dashboard · config · eventos · validar · assinar · preparar-envio · xml · validações · enviar · reenviar · consultar-status · transmissoes · histórico

## Compliance · `/api/compliance`

dashboard · fontes · scan · normas/versões/compare · detecções · validar · alertas · histórico · validações · relatórios · agendamento · varreduras · tarefas

## Org · `/api/org`

tree · empresa · unidades · setores · funcoes · atividades · postos

## Denúncias · `/api/denuncias`

dashboard · CRUD autenticado · público POST/status · status · tratativas · evidências · integrar NR-01 · conclusão

## Critérios · `/api/risk-criteria`

active · documentation · methodologies · evaluate · audit · presets

## AI · `/api/ai`

Expert: history, query, analyze-ergonomics, control-measures, aet, work-instruction, risk-inventory, pgr, reports/*, psicossocial, virtual-audit, recommendations, risk-analysis  
Engine: specialists, run, queue/:jobType

## Suporte

| Método | Path |
|--------|------|
| GET | `/api/admin/support/active` |
| GET | `/api/support/status` |
| POST | `/api/support/authorize` |
| POST | `/api/support/revoke` |
| GET | `/api/support/audit` |

## Inventário de rotas (QA)

A matriz de endpoints da Fase 5 registrou **258 rotas** no ambiente auditado — este documento agrupa por domínio funcional; o inventário máquina fica em `docs/audit/fase5/` e scripts `endpoint-inventory.js`.
