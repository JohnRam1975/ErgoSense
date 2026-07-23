# Fase 6 — Desempenho (2026-07-23)

**Target:** http://127.0.0.1:8090  
**Hold:** 15s por nível · mix health + psico/dashboard

## Limite

| Tipo | Valor |
|------|-------|
| Soft (p95 > 2s) | ~50 VUs |
| Hard (OK < 95%) | ~500 VUs |
| Gargalo dominante | CPU/latência do backend (Node) |
| Banco | Conexões estáveis (11→16) — não é o gargalo |
| Vazamento | Não suspeito (RSS final ≈ baseline; pico +~30 MiB sob carga) |

## Por nível

| VUs | OK% | RPS | p95 | CPU API max | RAM API max | DB conn max |
|-----|-----|-----|-----|-------------|-------------|-------------|
| 10 | 100% | 9 | 903 ms | 30% | 116 MiB | 11 |
| 50 | 100% | 45 | 7187 ms | * | 126 MiB | 11 |
| 100 | 100% | 68 | 5211 ms | * | 128 MiB | 15 |
| 250 | 100% | 55 | 9889 ms | 107% | 145 MiB | 16 |
| 500 | 94.5% | 52 | 11120 ms | 103% | 146 MiB | 16 |

\* amostragem de CPU pode ter perdido o pico nestes níveis.

## Achados

- Latência sobe cedo (p95 > 5s a partir de 50 VUs sustentados)
- Em 250+ VUs a CPU do backend satura (>100%)
- Em 500 VUs aparecem falhas de conexão (status 0) — ~5.5%
- Postgres não satura (≤16 conexões)
- Sem evidência clara de memory leak após cooldown

Artefato: docs/audit/fase6/fase6-performance.json
