# 01 — Atores, papéis e planos

## Papéis de login (RBAC)

Definidos em `server/src/auth/rbac.js`.

| Papel | Quem é | Poderes resumidos |
|-------|--------|-------------------|
| **ADMIN_GLOBAL** | Time ErgoSense | `*` — todos os tenants, onboarding, cadastro de empresa, modo suporte |
| **ADMIN_EMPRESA** | Admin do tenant | CRUD amplo dos módulos + **único** que autoriza suporte (`support:*`) |
| **ERGONOMISTA** | Técnico de campo/escritório | Análises e módulos NR-01/AET/SST/psico/denúncia/compliance/AI; sem `support:*` |
| **SUPERVISOR** | Liderança operacional | Leitura ampla; `psico:respond`; denúncia submit/read |
| **OPERADOR** | Usuário de chão | `analyses:create/read`; leitura de módulos; denúncia submit; psico respond |

### Matriz de permissões (recurso:ação)

| Recurso | ADMIN_GLOBAL | ADMIN_EMPRESA | ERGONOMISTA | SUPERVISOR | OPERADOR |
|---------|:---:|:---:|:---:|:---:|:---:|
| tenants | * | read_own | — | — | — |
| collaborators | * | * | CRUD | read | read |
| analyses | * | * | * | read | create+read |
| reports | * | * | read | read | — |
| sectors / org | * | * | read+create+update | read | — |
| support | * | * | — | — | — |
| risk-inventory, gro, pgr, aet, sst, esocial, compliance, risk-criteria | * | * | * | read | read |
| psico | * | * | * | read+respond | read+respond |
| denuncia | * | * | * | submit+read | submit |
| ai | * | * | * | read | — |

Wildcard: `recurso:*` cobre todas as ações do recurso; `*` cobre tudo.

## Entidades sem login

| Entidade | Função |
|----------|--------|
| **Colaborador** | Pessoa avaliada (antropometria, setor, consentimento). Matrícula especial `ESP-SELF` = autoavaliação |
| **Respondente psico** | Responde campanha via `/form/:token` anônimo (LGPD) |
| **Denunciante público** | Pode abrir denúncia sem conta (`POST /api/denuncias/public`) |
| **Solicitante comercial** | Empresa ou autônomo pedindo acesso |

## Planos SaaS

Fonte: `src/plan/planFeatures.ts` · tiers: `free` | `standard` | `professional` | `enterprise`.

| Limite | Free | Standard | Professional | Enterprise |
|--------|------|----------|--------------|------------|
| Histórico visível | 5 | 50 | Ilimitado* | Ilimitado* |
| PDF completo | Não | Sim | Sim | Sim |
| Filtros avançados histórico | Não | Sim | Sim | Sim |
| Análises/mês | 10 | Ilimitado* | Ilimitado* | Ilimitado* |
| Comparar no dashboard | Não | Não | Sim | Sim |

\* Valores altos no código (`9999`) tratados como ilimitado prático.

Planos públicos listados em `GET /api/public/plans` (onboarding).

## Isolamento multi-tenant

- Toda operação autenticada resolve `tenantId` operacional.  
- Status do tenant pode bloquear uso: bloqueado, suspenso, expirado, inativo, pendente ativação.  
- Admin Global pode entrar em tenant via **modo suporte** somente se o Admin da Empresa autorizou (auditoria LGPD).
