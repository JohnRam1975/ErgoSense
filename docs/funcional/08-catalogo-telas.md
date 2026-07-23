# 08 — Catálogo completo de telas (`ScreenId`)

Fonte: `ergosense-app/src/types/index.ts`. Navegação: `go(id)`.

## Auth / público / onboarding

| ScreenId | Módulo |
|----------|--------|
| `splash` | Bootstrap |
| `login` | Auth |
| `request-access` | Onboarding empresa |
| `request-access-autonomo` | Onboarding autônomo |
| `activate-account` | Ativação + MFA |
| `reset-password` | Reset senha |
| `contact-support` | Suporte público |

**Fora de ScreenId:** `/form/:token` → formulário psicossocial público.

## Admin Global / SaaS

| ScreenId | Módulo |
|----------|--------|
| `global-admin` | Painel global |
| `register-company` | Criar empresa |
| `admin-tenant-requests` | Solicitações |
| `admin-tenant-request-detail` | Detalhe solicitação |
| `admin-tenants-active` | Tenants ativos |
| `admin-tenants-blocked` | Bloqueados |
| `admin-tenants-expired` | Expirados |
| `admin-access-control` | Controle comercial |
| `admin-tenant-detail` | Detalhe tenant |
| `support-access` | Autorização suporte |

## Núcleo tenant

| ScreenId | Módulo |
|----------|--------|
| `company` | Troca empresa |
| `dashboard` | Início |
| `collabs` | Equipe |
| `new-collab` | CRUD colaborador |
| `sectors` | Setores |
| `org-structure` | Árvore org NR-01 |
| `new-analysis` | Nova análise |
| `camera` | Captura |
| `result` | Resultado |
| `history` | Histórico |
| `reports` | Relatórios |
| `settings` | Configurações |
| `sync` | Sincronização |

## V2

| ScreenId | Módulo |
|----------|--------|
| `v2-dashboard` | Executivo |
| `v2-methods` | Métodos |
| `v2-video` | Vídeo |
| `v2-environmental` | Ambientais |
| `v2-roadmap` | Roadmap |
| `v2-audit` | Auditoria local |

## Psicossocial

| ScreenId |
|----------|
| `psicossocial-dashboard` |
| `psicossocial-fatores` |
| `psicossocial-questionarios` |
| `psicossocial-matriz` |
| `psicossocial-plano` |
| `psicossocial-conformidade` |
| `psicossocial-ia` |

## Denúncia

| ScreenId |
|----------|
| `denuncia-dashboard` |
| `denuncia-lista` |
| `denuncia-nova` |
| `denuncia-detalhe` |

## Critérios

| ScreenId |
|----------|
| `criterios-dashboard` |
| `criterios-config` |
| `criterios-historico` |
| `criterios-documentacao` |

## Inventário

| ScreenId |
|----------|
| `inventario-dashboard` |
| `inventario-lista` |
| `inventario-form` |
| `inventario-matriz` |

## GRO

| ScreenId |
|----------|
| `gro-dashboard` |
| `gro-workflow` |
| `gro-plano` |
| `gro-indicadores` |
| `gro-historico` |
| `gro-relatorios` |

## PGR

| ScreenId |
|----------|
| `pgr-dashboard` |
| `pgr-versoes` |
| `pgr-detalhe` |
| `pgr-historico` |

## AET

| ScreenId |
|----------|
| `aet-dashboard` |
| `aet-workflow` |
| `aet-detalhe` |
| `aet-cadastros` |
| `aet-relatorio` |

## SST

| ScreenId |
|----------|
| `sst-dashboard` |
| `sst-apr` |
| `sst-epi-epc` |
| `sst-inspecoes` |
| `sst-auditorias` |
| `sst-nc-capa` |
| `sst-treinamentos` |
| `sst-relatorios` |

## eSocial

| ScreenId |
|----------|
| `esocial-dashboard` |
| `esocial-s2210` |
| `esocial-s2220` |
| `esocial-s2240` |
| `esocial-historico` |
| `esocial-config` |

## Compliance

| ScreenId |
|----------|
| `compliance-dashboard` |
| `compliance-normas` |
| `compliance-alertas` |
| `compliance-validacao` |
| `compliance-relatorios` |
| `compliance-fontes` |
| `compliance-adequacao` |

## Contagem

**89 ScreenIds** tipados + **1 rota pública** psico = cobertura UI completa do produto.
