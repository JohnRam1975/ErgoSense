# ErgoSense — Onboarding de Empresas (Tenants)

**Data:** 2026-06-12  
**Escopo:** Cadastro, aprovação, ativação e gestão de empresas

---

## 1. Migrations

| Script | Tabelas / alterações |
|--------|----------------------|
| `npm run migrate:tenant-onboarding` | `planos`, `tenant_requests`, `activation_tokens`, colunas em `tenants` e `usuarios` |

**Planos padrão:** STARTER, PROFESSIONAL, ENTERPRISE

---

## 2. Backend — entidades e serviços

| Arquivo | Responsabilidade |
|---------|------------------|
| `services/tenantRequestService.js` | CRUD solicitações, aprovação, rejeição, bloqueio |
| `services/activationService.js` | Token, preview MFA, ativação |
| `services/planService.js` | Limites por plano |
| `services/onboardingAudit.js` | Auditoria SIEM + security_audit_log |
| `services/emailNotificationService.js` | E-mails (log stdout; SMTP futuro) |
| `utils/cnpj.js` | Validação CNPJ |

---

## 3. APIs implementadas

| Método | Rota | Auth |
|--------|------|------|
| POST | `/api/public/tenant-request` | Público |
| GET | `/api/public/plans` | Público |
| GET | `/api/admin/tenant-requests` | ADMIN_GLOBAL |
| GET | `/api/admin/tenant-requests/:id` | ADMIN_GLOBAL |
| POST | `/api/admin/tenant-requests/:id/approve` | ADMIN_GLOBAL |
| POST | `/api/admin/tenant-requests/:id/reject` | ADMIN_GLOBAL |
| POST | `/api/admin/tenant-requests/:id/request-adjustment` | ADMIN_GLOBAL |
| POST | `/api/admin/tenant-requests/:id/block` | ADMIN_GLOBAL |
| GET | `/api/admin/tenants?filter=` | ADMIN_GLOBAL |
| GET | `/api/admin/tenants/:id` | ADMIN_GLOBAL |
| PUT | `/api/admin/tenants/:id` | ADMIN_GLOBAL |
| POST | `/api/admin/tenants/:id/block` | ADMIN_GLOBAL |
| POST | `/api/admin/tenants/:id/suspend` | ADMIN_GLOBAL |
| POST | `/api/admin/tenants/:id/reactivate` | ADMIN_GLOBAL |
| GET | `/api/auth/activate-account/preview` | Público |
| POST | `/api/auth/activate-account` | Público |

---

## 4. Frontend — telas

| Rota / ScreenId | Descrição |
|-----------------|-----------|
| `/request-access` → `request-access` | Portal público cadastro empresa |
| `employee-access-request` | Solicitação colaborador (fluxo anterior) |
| `/activate-account` → `activate-account` | Senha + MFA obrigatório |
| `admin-tenant-requests` | Lista solicitações |
| `admin-tenant-request-detail` | Detalhe + Aprovar/Rejeitar/Ajuste |
| `admin-tenants-active` | Empresas ativas |
| `admin-tenants-blocked` | Empresas bloqueadas |
| `admin-tenants-expired` | Empresas expiradas |

**Admin Global:** menu Empresas → submenus no sidebar

---

## 5. Fluxo completo

```
Empresa → POST /api/public/tenant-request → Protocolo ESP-YYYYMMDD-XXX
    ↓
Admin Global → Aprovar → Tenant + ADMIN_EMPRESA + token ativação + e-mail (log)
    ↓
Responsável → /activate-account?token=… → MFA + senha → status ATIVO
    ↓
Login normal (bloqueio se tenant suspenso/bloqueado)
```

---

## 6. Auditoria

Eventos registrados: `TENANT_REQUEST_CREATED`, `TENANT_REQUEST_APPROVED`, `TENANT_REQUEST_REJECTED`, `TENANT_REQUEST_ADJUSTMENT`, `TENANT_ACCOUNT_ACTIVATED`, `TENANT_BLOCKED`, `TENANT_REACTIVATED`, `TENANT_SUSPENDED`, `LOGIN_TENANT_BLOCKED`

---

## 7. Testes

| Suite | Resultado |
|-------|-----------|
| Unit backend | **100/100 pass** (+5 CNPJ/onboarding) |
| Migration | OK executada |

---

## 8. Comandos

```powershell
cd ergosense-app/server
npm run migrate:tenant-onboarding
npm test
```

---

## 9. Variáveis

| Variável | Uso |
|----------|-----|
| `APP_PUBLIC_URL` | URL base nos links de ativação (default: primeiro CORS origin) |

---

## 10. Integrações existentes

- RBAC: rotas admin restritas a `ADMIN_GLOBAL`
- MFA: obrigatório na ativação (`setupMfa` + `enableMfa`)
- Login: bloqueia `pendente_ativacao`, tenant `BLOQUEADO`/`SUSPENSO`/`EXPIRADO`
- Rate limit: público + ativação com `publicFormRateLimit` / `criticalApiRateLimit`
- Multi-tenant: tenant criado via `tenantService` pattern (setores default)

---

**Status:** Fluxo funcional end-to-end implementado e integrado.
