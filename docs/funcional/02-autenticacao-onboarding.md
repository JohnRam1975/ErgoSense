# 02 — Autenticação e onboarding

## Telas

| ScreenId | Função |
|----------|--------|
| `splash` | Marca + CTA; redireciona se já autenticado |
| `login` | E-mail/senha, MFA, esqueci senha, links de cadastro/suporte |
| `reset-password` | Nova senha com token |
| `request-access` | Cadastro comercial de **empresa** |
| `request-access-autonomo` | Cadastro de **profissional autônomo** |
| `activate-account` | Ativação + setup MFA (QR + código) |
| `contact-support` | Contato público com o suporte ErgoSense |

Deep links: `/activate-account`, `/reset-password`, `/request-access`, `/request-access-autonomo`.

## Fluxo de login

1. Usuário informa e-mail e senha → `POST /api/auth/login`.  
2. Se MFA habilitado → resposta com `mfaRequired` / token pendente → usuário digita TOTP → `POST /api/auth/mfa/verify`.  
3. Access token Bearer; refresh em cookie HttpOnly (+ CSRF em mutações).  
4. Destino: `ADMIN_GLOBAL` → `global-admin`; demais → `dashboard`.  
5. Sessão também espelhada em `localStorage` (chave tipo `ergosense-app-v2`).

## MFA (TOTP)

| Ação | Endpoint |
|------|----------|
| Status | `GET /api/auth/mfa/status` |
| Setup (secret+QR) | `POST /api/auth/mfa/setup` |
| Ativar | `POST /api/auth/mfa/enable` |
| Desativar | `POST /api/auth/mfa/disable` |
| Verificar no login | `POST /api/auth/mfa/verify` |

Na ativação de conta, MFA é parte do fluxo obrigatório (QR + confirmação).

## Esqueci / reset de senha

1. Na login: modo “esqueci senha” → e-mail → `POST /api/auth/forgot-password`.  
   - E-mail existente: retorna token (fluxo atual de produto).  
   - Inexistente: 404 · Bloqueado: 403.  
2. Usuário define nova senha (+ confirmação) → `POST /api/auth/reset-password`.  
3. Preview: `GET /api/auth/reset-password/preview`.  
4. Token hashed, TTL ~1h, uso único; refresh/sessões são revogados.

## Onboarding comercial (empresa)

1. Público preenche formulário (`request-access`) → `POST /api/public/tenant-request`.  
2. Admin Global analisa em `admin-tenant-requests` / detalhe.  
3. Ações: aprovar, rejeitar, pedir ajuste, bloquear.  
4. Após aprovação: liberação pós-pagamento (`admin-access-control` / grant-access).  
5. Usuário ativa conta (`activate-account`) com token do e-mail.

## Onboarding autônomo

Fluxo paralelo em `request-access-autonomo` (cadastro PF/profissional), com migrações específicas de senha/cadastro autônomo.

## Ciclo de vida do tenant (Admin Global)

Telas: `admin-tenants-active|blocked|expired`, `admin-tenant-detail`, `admin-access-control`.

Ações típicas via API `/api/admin/tenants/*`: atualizar, block, suspend, deactivate, grant-access, reactivate.

## Perfil e sessão

| Ação | Endpoint |
|------|----------|
| Me | `GET /api/auth/me` |
| Atualizar perfil | `PUT /api/auth/profile` |
| Refresh | `POST /api/auth/refresh` |
| Logout | `POST /api/auth/logout` |

## Contato suporte (público)

`contact-support` → `GET/POST /api/public/support-contact`.
