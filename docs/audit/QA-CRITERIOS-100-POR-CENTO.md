# Critérios de 100% — ErgoSense (P7)

**Data:** 2026-07-01  
**Princípio:** 100% só quando há evidência objetiva e mensurável. Skips, estimativas e médias enganosas não contam.

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Tecnicamente mensurável e atingível com evidência |
| ⚠️ | Parcialmente mensurável (meta + justificativa) |
| ❌ | Não mensurável de forma absoluta |

---

## 1. Endpoints (matriz contratual)

| Critério | Definição de 100% | Mensurável? |
|----------|-------------------|:-----------:|
| Rotas inventariadas | 255/255 com checks acionáveis | ✅ |
| Checks acionáveis | 100% pass (`ok: true`) | ✅ |
| BUG_REAL | 0 | ✅ |
| HTTP 0 | 0 (API estável durante batch) | ✅ |
| Skips | Documentados e justificados (N/A por contrato) | ✅ |

**Evidência P7:** `1462/1462 (100%)` — `npm run test:matrix` após re-run tag Denúncias.

---

## 2. Telas (E2E)

| Critério | Definição de 100% | Mensurável? |
|----------|-------------------|:-----------:|
| Telas registradas | 87/87 smoke sem erro fatal | ✅ |
| Telas principais | Navegação + render sem crash | ⚠️ |
| Todas combinações perfil×tela | Cada perfil RBAC em cada tela | ⚠️ |

**Estado P7:** 87 telas smoke E2E (`all-screens.spec.ts`). Fluxos por perfil incompletos (OPERADOR, tenant expirado).

---

## 3. Fluxos críticos

| Fluxo | 100% = | Mensurável? |
|-------|--------|:-----------:|
| Login / MFA / logout | E2E verde | ✅ |
| Onboarding tenant | E2E verde | ✅ |
| Cross-tenant IDOR | E2E + security | ✅ |
| Denúncias / PGR / GRO / SST / Psico / eSocial | Jornada E2E dedicada | ⚠️ |
| Troca/recuperação senha | Feature + E2E | ❌ (feature ausente) |
| Tenant expirado UI | E2E | ⚠️ (pendente) |

---

## 4. Segurança

| Critério | 100% = | Mensurável? |
|----------|--------|:-----------:|
| CRÍTICO / ALTO | 0 | ✅ |
| MÉDIO não justificado | 0 | ✅ |
| BAIXO documentado | 100% com evidência | ⚠️ |
| OWASP completo manual | Pentest externo | ❌ |

**Estado P7:** 0 CRÍTICO, 0 ALTO, 0 MÉDIO, 11 BAIXO (checks informativos passando).

---

## 5. Banco de dados

| Critério | 100% = | Mensurável? |
|----------|--------|:-----------:|
| Checks `test:db` | 100% pass | ✅ |
| Migrations CI from-zero | pass | ✅ |
| FK / órfãos / índices | 0 violação | ✅ |
| Deadlock simulado | Teste dedicado | ⚠️ (não automatizado) |
| Backup/restore produção | Runbook manual | ❌ |

**Estado P7:** 7/7 checks DB.

---

## 6. Cobertura de código

| Critério | 100% = | Mensurável? |
|----------|--------|:-----------:|
| Linhas FE/BE/combinado | c8 + vitest reports | ✅ |
| Branches | Relatório por arquivo | ✅ |
| 100% linhas absoluto | Todo arquivo executado | ❌* |

\*Impraticável para UI React (3761L AppContext), client HTTP monolítico, rotas Express sem supertest integrado.

**Metas progressivas P7:**

| Meta | Linhas combinadas |
|------|------------------:|
| Baseline P6 | 28,34% |
| Meta 1 | 60% |
| Meta 2 | 75% |
| Meta 3 | 85% |
| Meta 4 | 90%+ |
| 100% absoluto | Só com exclusões documentadas |

---

## 7. E2E Playwright

| Critério | 100% = | Mensurável? |
|----------|--------|:-----------:|
| Specs passando | 0 failed | ✅ |
| Flaky rate | 0% em 3 runs CI | ⚠️ |
| Todos fluxos P7 listados | Spec dedicado | ⚠️ |

**Estado P7:** 16 jornadas + all-screens; não todos os fluxos P7 têm spec.

---

## 8. OpenAPI

| Critério | 100% = | Mensurável? |
|----------|--------|:-----------:|
| Rotas documentadas | 0 undocumented | ✅ |
| Orphan ops | 0 | ✅ |
| Schema request/response | Validado por rota | ⚠️ |
| Exemplos válidos/inválidos | Por operação | ⚠️ |

**Estado P7:** 255 rotas, 0 gaps (`npm run test:openapi`).

---

## 9. Performance (load)

| Critério | 100% = | Mensurável? |
|----------|--------|:-----------:|
| Carga leve (100 req) | 0 erro funcional | ✅ |
| p50/p95/p99 documentados | Relatório JSON | ✅ |
| Burst 5000 local | 0 crash API | ⚠️ (máquina dependente) |
| 0 falha saturação local | Impossível absoluto | ❌ |

---

## 10. Resiliência

| Critério | 100% = | Mensurável? |
|----------|--------|:-----------:|
| DB down → 503 readiness | pass | ✅ |
| Recuperação pós-falha | pass | ✅ |
| Redis/AI/storage off | Degradação graceful | ⚠️ |
| 0 crash não tratado | Unit + resilience script | ⚠️ |

---

## Regra de conclusão P7

| Veredicto | Condição |
|-----------|----------|
| **100% VALIDADO COM EVIDÊNCIA** | Todas as linhas ✅ atingidas simultaneamente |
| **APROVADO COM RESSALVAS** | ✅ em segurança/matriz/DB; ⚠️ em cobertura/E2E |
| **REPROVADO** | BUG_REAL > 0 ou CRÍTICO/ALTO > 0 ou build/lint falha |

**P7 conclui:** **APROVADO COM RESSALVAS** — matriz e OpenAPI em 100%; cobertura de código em 28,34%.
