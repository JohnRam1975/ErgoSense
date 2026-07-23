# 00 — Visão geral do ErgoSense

## O que é

O **ErgoSense** é uma plataforma SaaS multi-tenant de **ergonomia e SST** para indústrias e prestadores: captura e avalia posturas/carga com visão computacional, gera laudos e relatórios (NR-17), e opera o ciclo **NR-01** (inventário de riscos, GRO, PGR, psicossocial, denúncia, SST, AET, compliance).

## Para quem

| Persona | Uso principal |
|---------|----------------|
| Admin Global (ErgoSense) | Aprovar empresas, planos, bloqueios, suporte |
| Admin da Empresa | Operar o tenant, autorizar suporte, configurar módulos |
| Ergonomista | Análises, AET, inventário, GRO/PGR, psico, SST |
| Supervisor | Consulta e resposta psico / denúncia |
| Operador | Criar análises e leitura operacional |
| Colaborador avaliado | Entidade de domínio (não é login), cadastro na equipe |
| Autônomo / Empresa (público) | Solicitar acesso comercial |
| Respondente público | Formulário psicossocial anônimo |

## Proposta de valor

1. **Análise ergonômica em campo** — câmera + pose + carga + score + PDF NR-17  
2. **Conformidade regulatória** — NR-01 / NR-17 / guias MTE, com trilha de auditoria  
3. **SaaS multi-empresa** — isolamento por tenant, planos, MFA, onboarding  
4. **Operação SST integrada** — inventário ↔ GRO ↔ PGR ↔ AET ↔ SST ↔ denúncia  

## Arquitetura lógica (funcional)

```
[Cliente React/PWA]
    │  go(ScreenId) · API Bearer/JWT
    ▼
[API Express]
    │  RBAC · tenantGuard · cache
    ▼
[PostgreSQL]  [Redis opcional]  [MinIO/S3 opcional]  [Filas AI/eSocial/Compliance]
```

- App autenticado: **sem React Router** — navegação por estado `screen: ScreenId`.  
- Exceções de deep link: `/form/:token` (psico público), `/activate-account`, `/reset-password`, `/request-access*`.  
- Modo análise: `complete` (API) ou `offline` (dispositivo + sync posterior).

## Escopo funcional (módulos)

| Área | Capacidade |
|------|------------|
| Auth & SaaS | Login, MFA TOTP, refresh, reset, ativação, planos, tenants |
| Núcleo | Dashboard, colaboradores, setores, análise, câmera, resultado, histórico, relatórios, sync, settings |
| V2 | Dashboard executivo, métodos multi-padrão, vídeo, ambientais, audit, roadmap |
| Psicossocial | 13 fatores MTE, questionários, matriz, plano, conformidade, campanhas públicas |
| Denúncia | Canal LGPD, protocolo, tratativa, evidências |
| Critérios | Metodologias/matrizes versionadas NR-01 |
| Inventário | CRUD riscos (6 tipos), matriz P×S, vínculos |
| GRO | Ciclo, plano, indicadores, histórico, relatórios |
| PGR | Programa, versões, aprovação, assinatura, PDF |
| AET | Workflow NR-17, cadastros, laudo |
| SST | APR, EPI/EPC, inspeções, auditorias, NC/CAPA, treinamentos, PDF |
| eSocial | Eventos S-2210/2220/2240 (API); UI em “Em breve” |
| Compliance | Fontes, detecções, validação humana, adequação |
| Org | Árvore Unidade→…→Posto |
| Plataforma | PWA, exports, AI Expert (API + UI parcial), suporte técnico |

## O que o ErgoSense **não** é (limites de produto)

- Não substitui parecer médico ocupacional (ASO) — registra/opera fluxos SST e eSocial.  
- Compliance **nunca aplica regras normativas automaticamente** — exige validação humana.  
- eSocial na UI ainda está em placeholder; a API de transmissão existe no backend.
