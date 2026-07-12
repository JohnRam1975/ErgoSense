# Endpoint Matrix — Final 100%

**Data:** 2026-07-01T23:21Z  
**Comando:** `node scripts/endpoint-matrix-batch.js --tag=Denúncias` + merge  
**Base:** http://localhost:3001

---

## Resultado

| Métrica | Valor |
|---------|------:|
| Rotas | **255** |
| Checks acionáveis | **1462** |
| Passou | **1462** |
| Falhou | **0** |
| **Cobertura acionável** | **100%** |
| BUG_REAL | **0** |
| HTTP 0 | **0** |
| Classificações | **{}** |

---

## Correção P7 — 12 checks remanescentes (99% → 100%)

| # | Rota | Check | Causa | Ação |
|---|------|-------|-------|------|
| 1–3 | `PATCH .../tratativas/:tid` | not_found, success, schema | HTTP 0 (API crash FK) | Fix P5 já aplicado; partial obsoleto |
| 4–8 | `GET /api/denuncias/dashboard` | auth + success + schema | HTTP 0 cascata | Re-run tag Denúncias |
| 9–10 | `POST /api/denuncias/public` | success, schema | HTTP 0 cascata | Re-run |
| 11–12 | `GET /api/denuncias/public/status` | success, schema | HTTP 0 cascata | Re-run |

**Classificação:** TESTE_PRECISA_AJUSTE (ambiente) — não BUG_REAL.

**Fix código (P5):** `denunciaRoutes.js` valida denúncia/tratativa antes de `logDenunciaHistory`.

**Fix matriz (P7):** Removido partial `Den_ncias.json` obsoleto; reexecutada tag Denúncias com fix ativo.

---

## Evidência

```
Partial [Denúncias]: 66/66 (100%)
Matriz v2 (batch merge): 1462/1462 (100%)
Classificações: {}
```

Artefatos: `docs/audit/endpoints/endpoint-matrix.json`, `partials/Den_ncias.json`

---

## Comando de validação

```powershell
# Terminal 1
cd ergosense-app\server
node src/index.js

# Terminal 2 — re-run tag específica se partial stale
cd ergosense-app\server
node scripts/endpoint-matrix-batch.js --tag=Denúncias

# Full merge (skip tags com partial OK)
npm run test:matrix
```
