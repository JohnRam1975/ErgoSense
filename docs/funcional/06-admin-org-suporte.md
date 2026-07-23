# 06 — Admin global, organização e suporte

---

## 6.1 Admin Global

| ScreenId | Função |
|----------|--------|
| `global-admin` | Painel: empresas e atalhos laterais |
| `register-company` | Criar empresa (só ADMIN_GLOBAL) |
| `admin-tenant-requests` | Lista solicitações de onboarding |
| `admin-tenant-request-detail` | Aprovar / rejeitar / ajuste / bloquear |
| `admin-tenants-active` | Tenants ativos |
| `admin-tenants-blocked` | Bloqueados |
| `admin-tenants-expired` | Expirados |
| `admin-access-control` | Liberar pós-pagamento, desativar, bloquear comercial |
| `admin-tenant-detail` | Ver/editar CNPJ, status, metadados |

Layout desktop dedicado (`admin-desktop`) para essas telas.

API: `/api/admin/tenant-requests/*`, `/api/admin/tenants/*`, `POST /api/tenants`.

---

## 6.2 Estrutura organizacional (NR-01)

| ScreenId | Função |
|----------|--------|
| `org-structure` | Árvore: **Unidade → Setor → Função → Atividade → Posto** |
| `sectors` | Visão de setores auditados (atalho análise) |

API `/api/org`: `tree`, `empresa`, `unidades`, `setores`, CRUD de `funcoes`, `atividades`, `postos`.

A estrutura alimenta inventário, AET, análises e vínculos entre módulos.

---

## 6.3 Modo suporte (LGPD)

| ScreenId | Função |
|----------|--------|
| `support-access` | **ADMIN_EMPRESA** autoriza/revoga acesso técnico ErgoSense + histórico |

Componentes: `SupportModeBar` quando Admin Global opera dentro do tenant autorizado.

API (`app.js`):

| Método | Path | Quem |
|--------|------|------|
| GET | `/api/admin/support/active` | Global |
| GET | `/api/support/status` | Tenant |
| POST | `/api/support/authorize` | Admin empresa |
| POST | `/api/support/revoke` | Admin empresa |
| GET | `/api/support/audit` | Auditoria |

Sem autorização explícita, Admin Global **não** opera dados do tenant em modo suporte.
