# OpenAPI — Final 100%

**Data:** 2026-07-01  
**Comando:** `npm run test:openapi`

---

## Resultado

| Métrica | Valor |
|---------|------:|
| Rotas inventariadas | **255** |
| Operações OpenAPI | **211 paths** |
| Undocumented | **0** |
| Orphan (doc sem rota) | **0** |
| **Gap score** | **100%** |

---

## Validações executadas

| Check | Status |
|-------|--------|
| Toda rota HTTP tem operação OpenAPI | ✅ |
| Nenhuma operação órfã | ✅ |
| Geração automática (`generate-openapi.js`) | ✅ |
| Gap test (`openapi-gap-test.js`) | ✅ 0 gaps |

---

## Limitações documentadas (não bloqueiam 100% gap)

| Item | Status |
|------|--------|
| Exemplos request válido/inválido por rota | ⚠️ Parcial (schema presente, exemplos não exhaustivos) |
| Status codes exhaustivos por operação | ⚠️ Documentação base; matriz valida runtime |
| Permissões RBAC por operação | ⚠️ Descrito em tags/descrições; não schema formal |

---

## Evidência

```
OpenAPI gerado: 211 paths
Gap: 0 undocumented
```

Fonte: `docs/audit/openapi/openapi-gap.json`
