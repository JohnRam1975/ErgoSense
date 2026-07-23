# Documentação Funcional — ErgoSense

**Versão:** 1.0 · **Data:** 2026-07-23  
**Escopo:** 100% das funcionalidades do produto conforme código atual (`ergosense-app` + API)

Esta pasta é a **fonte de verdade funcional** do ErgoSense: o que o sistema faz, para quem, em quais telas e por quais APIs.

---

## Como ler

| Documento | Conteúdo |
|-----------|----------|
| [00 — Visão geral](./00-visao-geral.md) | O que é o produto, proposta de valor, mapa de módulos |
| [01 — Atores, papéis e planos](./01-atores-papeis-planos.md) | Personas, RBAC, limites por plano |
| [02 — Autenticação e onboarding](./02-autenticacao-onboarding.md) | Login, MFA, reset, cadastro empresa/autônomo, ativação |
| [03 — Núcleo: análise ergonômica](./03-nucleo-analise.md) | Dashboard, equipe, câmera, carga, resultado, histórico, relatórios |
| [04 — Módulos NR-01](./04-modulos-nr01.md) | Psicossocial, denúncia, critérios, inventário, GRO, PGR |
| [05 — AET, SST, eSocial e Compliance](./05-aet-sst-esocial-compliance.md) | Laudos AET, SST operacional, eSocial, motor de normas |
| [06 — Admin, organização e suporte](./06-admin-org-suporte.md) | Admin global, estrutura orgânica, modo suporte |
| [07 — Exportações, PWA, IA e V2](./07-exports-pwa-ia-v2.md) | PDFs, offline, PWA, métodos V2, AI Expert |
| [08 — Catálogo completo de telas](./08-catalogo-telas.md) | Todas as `ScreenId` (~90) |
| [09 — Catálogo completo de APIs](./09-catalogo-apis.md) | Todos os prefixos e endpoints por domínio |
| [10 — Fluxos de negócio](./10-fluxos-negocio.md) | Jornadas ponta a ponta |
| [11 — Status funcional](./11-status-funcional.md) | Implementado × placeholder × roadmap |

Mapa de módulos: ver [00 — Visão geral](./00-visao-geral.md#escopo-funcional-módulos).

---

## Fontes no código

- Telas: `ergosense-app/src/screens/*`, `ScreenId` em `src/types/index.ts`
- Navegação: `go(screenId)` em `AppContext` · `App.tsx`
- API: `ergosense-app/server/src/routes/*` · `app.js`
- RBAC: `server/src/auth/rbac.js`
- Planos: `src/plan/planFeatures.ts`

Documentos relacionados (não substituem esta pasta):  
`docs/ARCHITECTURE.md`, `docs/security/SECURITY.md`, `docs/audit/README.md`, `ergosense-app/docs/modulos-integrados.md`
