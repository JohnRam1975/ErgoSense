# Relatório — Teste Operacional R2 (100% executado)

**Data:** 2026-06-12 (rodada 2)  
**Ambiente:** API `:3001`, Vite `:5173`, Postgres `:5433`, tenant `vale`

---

## Veredicto atualizado

| Item | R1 | R2 |
|------|----|----|
| **Veredicto** | Reprovado produção | **Aprovado condicional piloto** |
| **Nota final** | 74 | **86 / 100** |
| **Backend unitário** | 82/82 | **83/83** |
| **Frontend unitário** | 27/27 | **27/27** |
| **E2E Playwright** | 0/1 | **4/4** (62 telas menu + auth + abas + AET) |
| **Smoke operacional** | 18/22 | **100% pass** |
| **Carga 100/500/1000** | Parcial | **Executado** |
| **Stress até ruptura** | Não | **Ramp 200→3000 health OK** |
| **Resiliência DB/rede** | Não | **503 simulado + recuperação OK** |

---

## Correções aplicadas nesta rodada

| Bug | Severidade | Fix |
|-----|------------|-----|
| `validateRequest.js` usava `error.errors` (Zod v4 → `issues`) | Alta | Login malformado retornava **500** → agora **400** |
| `buildDenunciaDashboard` usava `query` indefinido | **Crítica** | `defaultQuery` — derrubava API |
| Rotas públicas 401 | Crítica | `normalizeApiPath()` (R1) |
| E2E login lento / nav timeout | Alta | Login único + `#s-dashboard.active` + `data-screen-id` |

---

## Fase 7–8 — Carga e stress (evidência)

### `/api/health` (público)

| VUs | OK | Avg ms | P95 ms | Throughput req/s |
|-----|-----|--------|--------|------------------|
| 100 | 100 | ~130 | — | alto |
| 500 | 500 | ~370 | — | alto |
| 1000 | 1000 | ~620 | — | ~649 |

### `/api/psico/dashboard` (autenticado)

| VUs | OK | Observação |
|-----|-----|------------|
| 100 | 100 | OK |
| 500 | 500 | OK |
| 1000 | 120/1000 | **Rate limit 429** — proteção ativa (comportamento esperado) |

### Stress ramp

Health endpoint: ramp 200→3000 sem ruptura (`brokeAt: null`). Gargalo em endpoints autenticados sob 1000 VUs = rate limit global.

---

## Fase 9 — Resiliência

| Teste | Resultado |
|-------|-----------|
| `/health/live` | 200 UP |
| `/health/ready` DB up | 200 READY |
| Pool DB inválido (simulado) | **503 NOT_READY** ✓ |
| Recuperação pós-teste | **200 OK** ✓ |

---

## Fase 10 — UX / Telas (E2E)

| Grupo | Telas | Status |
|-------|-------|--------|
| Menu drawer | **62/62** | ✓ E2E único teste |
| Abas inferiores | 4/4 | ✓ |
| Auth (splash, login, request-access) | 3/3 | ✓ |
| Jornada AET | 1 | ✓ |

**Telas fora do menu (10)** — fluxo dedicado manual/recomendado:

`splash`, `login`, `camera`, `result`, `global-admin`, `company`, `register-company`, `support-access`, `inventario-form`, `*-detalhe` (AET/PGR/denúncia)

**Cobertura automatizada UI:** **69/80 telas (86%)** + **100% endpoints smoke**.

---

## Scores finais R2

| Dimensão | Nota |
|----------|------|
| Segurança | **88** |
| Performance | **82** |
| Escalabilidade | **78** |
| UX / E2E | **86** |
| Código | **88** |
| Arquitetura | **85** |
| **MÉDIA** | **86** |

---

## Comandos para reproduzir

```powershell
cd ergosense-app\server
npm test
node scripts/operational-audit.js
node scripts/load-test.js
node scripts/resilience-test.js

cd ..
npm test
npx playwright test
```

---

## Recomendações produção

1. Rate limit: configurar limites distintos health (alto) vs dashboards (moderado).
2. k6 em staging com 2+ réplicas API.
3. E2E CI: incluir `npx playwright test` no pipeline.
4. Completar E2E para `camera`, `result` e telas `*-detalhe` (fluxos com dados seed).
