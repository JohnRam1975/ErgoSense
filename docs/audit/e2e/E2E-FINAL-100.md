# E2E — Final 100% (estado e gaps)

**Data:** 2026-07-01  
**Comando:** `npm run test:e2e`

---

## Cobertura atual

| Dimensão | Resultado | % real |
|----------|-----------|-------:|
| Telas smoke (ergonomista) | 87 registradas | **100%** telas listadas |
| Jornadas dedicadas | 8 specs | **~40%** fluxos P7 listados |
| Specs totais | 8 arquivos | 16+ test cases |

### Specs existentes

| Spec | Cobertura |
|------|-----------|
| `all-screens.spec.ts` | 87 telas navegação |
| `onboarding-full-flow.spec.ts` | Onboarding completo |
| `session-auth.spec.ts` | Login, sessão |
| `logout.spec.ts` | Logout |
| `cross-tenant.spec.ts` | IDOR |
| `tenant-blocked.spec.ts` | Tenant bloqueado |
| `mobile-navigation.spec.ts` | Mobile |
| `api-offline.spec.ts` | API offline |

---

## Fluxos P7 — checklist

| Fluxo | E2E | Status |
|-------|:---:|:------:|
| Login / MFA | Parcial | ⚠️ MFA inválido sem spec |
| Tenant ativo | ✅ | onboarding + screens |
| Tenant bloqueado | ✅ | tenant-blocked |
| Tenant expirado | ❌ | Pendente |
| Usuário sem permissão (OPERADOR) | ❌ | Pendente |
| Sessão expirada | ⚠️ | session-auth parcial |
| Troca/recuperação senha | ❌ | Feature inexistente |
| MFA inválido/expirado | ❌ | Pendente |
| Cross-tenant | ✅ | |
| Admin tenants | ⚠️ | screens parcial |
| Denúncias / PGR / GRO / SST / Psico / eSocial | ⚠️ | Smoke telas only |
| Compliance / Organização | ⚠️ | Smoke telas only |

---

## Meta 100% E2E (definição real)

| Critério | Meta | P7 |
|----------|------|:--:|
| 0 flaky (3× CI) | Sim | ⚠️ |
| 100% fluxos críticos com spec | Sim | ❌ |
| 100% telas principais | Sim | ✅ |

---

## Próximos specs recomendados

1. `operator-forbidden.spec.ts` — OPERADOR 403 em rotas admin  
2. `tenant-expired.spec.ts` — UI tenant expirado  
3. `mfa-invalid.spec.ts` — código TOTP inválido  
4. `module-journeys/denuncias.spec.ts` — CRUD denúncia mínimo

**100% fluxos críticos:** não atingido — estimativa **24–40h** para specs restantes.
