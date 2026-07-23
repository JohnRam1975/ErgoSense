# Security Advanced — 2026-07-23T13:40:31.922Z

| Severidade | Qtd |
|------------|----:|
| CRÍTICO | 0 |
| ALTO | 0 |
| MÉDIO | 0 |
| BAIXO | 11 |

**Veredicto:** PASS (sem CRÍTICO/ALTO)

- **BAIXO** [IDOR] Cross-tenant bloqueado — HTTP 403
- **BAIXO** [SQLi] Login rejeita payload SQLi — HTTP 400
- **BAIXO** [XSS] Criação colaborador XSS rejeitada — HTTP 403
- **BAIXO** [CSRF] API usa Bearer (não cookie-only) — GET autenticado HTTP 200
- **BAIXO** [CORS] CORS não reflete origem arbitrária — sem header
- **BAIXO** [Rate limit] Login bloqueia após tentativas — undefined
- **BAIXO** [Auth] Admin tenant-requests exige auth — HTTP 401
- **BAIXO** [MFA] MFA verify rejeita token inválido — HTTP 401
- **BAIXO** [Headers] Headers básicos presentes — x-content-type-options, x-frame-options
- **BAIXO** [Auth] Token inválido → 401 — 
- **BAIXO** [Enumeração] Mensagem login uniforme — Limite de requisições excedido. Tente novamente em instantes.
