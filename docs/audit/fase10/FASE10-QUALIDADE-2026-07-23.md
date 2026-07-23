# Fase 10 — Qualidade do Código (reexecução)

**Veredito:** PASS (dívida arquitetural residual documentada)  
**Gerado:** 2026-07-23  
**Escopo:** `ergosense-app` (FE TypeScript + BE JavaScript)

---

## Checklist do objetivo

| Item | Status | O que foi feito |
|------|--------|-----------------|
| Código morto | OK | Orphans anteriores já removidos; scan atual: 0 módulos mortos em components/hooks/utils/services |
| Código duplicado | Melhorado | `importMethodsFromAnalysis` unificado; `REF_SHOULDER_WIDTH_CM` único; `riskNivelLabelUpper` compartilhado; `riskLevelLabelPt` deriva de `riskLabel` |
| Imports sem uso | OK | ESLint **0 errors / 0 warnings** |
| Dependências obsoletas | OK | Depcheck: sem deps unused reais; missing `virtual:pwa-register` / `playwright` = falso positivo Vite/dev |
| Arquivos não utilizados | OK | Nada novo a apagar com segurança |
| SOLID | Melhorado | Extração de serviço AET methods (SRP); labels de risco centralizados |
| Clean Code | Melhorado | Hooks onboarding/AppContext corrigidos; nomes e constantes únicos |
| Arquitetura | Dívida | Layering BE ok; FE ainda com god objects (ver hotspots) |

---

## Gates

| Gate | Resultado |
|------|-----------|
| `tsc -b` | **PASS (0)** |
| ESLint | **0 errors, 0 warnings** |
| Vitest (amostra) | ergonomics + PDF integrity **5/5 PASS** |
| Depcheck FE/BE | Sem unused deps críticos |

---

## Refatorações desta rodada

1. **`server/src/services/aetMethodsFromAnalysis.js`** — única fonte para importar métodos da análise (usado por `aetRoutes` + `aetAutoFromAnalysis`)
2. **`src/utils/riskNivelLabel.ts`** — rótulos CRÍTICO/ALTO/MÉDIO/BAIXO compartilhados (inventário, psico, form público)
3. **`riskLevelLabelPt`** — reutiliza `riskLabel` (DRY)
4. **`measureLoadDistance.ts`** — importa `REF_SHOULDER_WIDTH_CM` de `loadDistanceMath`
5. **AppContext** — `pendingSync` com `offlineQueueLen` (sem warning de hooks)
6. **TenantOnboardingScreens** — `reload`/`load` com deps corretas

---

## Hotspots de manutenção (dívida)

| Arquivo | Linhas | Próximo passo recomendado |
|---------|--------|---------------------------|
| `AppContext.tsx` | ~3980 | Partir por domínio (já há `context/hooks/` parcial) |
| `api/client.ts` | ~1701 | Módulos por área (analyses, aet, sst, pgr…) |
| `AnalysisScreens.tsx` | ~1441 | Feature folder |
| `TenantOnboardingScreens.tsx` | ~1323 | Feature folder |
| `MainScreens.tsx` | ~1009 | Extrair dashboard/widgets |

---

## Arquitetura (estado)

```
FE: screens → AppContext / hooks → api/client → Express API
BE: routes → services → db / mappers / validation
```

- **Bom:** rotas por domínio, services (AET, compliance, analysis), validação Zod, RBAC.
- **Ruim para escala:** AppContext monolítico; client.ts monolítico; screens >1k linhas.

---

## Próximas iterações (fora desta rodada)

1. Split `AppContext` por domínio (analyses, nr01, admin)
2. Split `api/client.ts` em `api/analyses.ts`, `api/aet.ts`, etc.
3. ESLint no `server/` (JS)
4. Atualização controlada de patches FE; Express 5 em janela própria

Artefatos: `docs/audit/fase10/` (`eslint-rerun.txt`, `depcheck-*-rerun.json`, este relatório).
