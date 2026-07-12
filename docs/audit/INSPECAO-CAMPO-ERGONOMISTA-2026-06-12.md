# Inspeção de Campo — Ergonomista Sênior

**Data:** 12/06/2026  
**Inspetor (simulado):** Lucas Andrade · ERGONOMISTA · Vale S.A. Carajás  
**Tenant:** `vale`  
**Script:** `ergosense-app/server/scripts/field-inspection-ergonomista.js`  
**Comando:** `npm run test:field` (com API em execução)

---

## Cenário de campo

| Item | Valor |
|------|--------|
| Posto | Teleatendimento / call center |
| Colaborador | Ana Paula Silva · Mat. 00098 · Manutenção |
| Tempo de amostragem | 3 min 05 s (185 s) |
| Postura observada | Protrusão cervical 38°, ombros elevados 58°, lombar 28° |
| Distância olhos-tela | 42 cm (abaixo de 50 cm — inconforme NR-17) |
| RULA | **6** — ação imediata |
| REBA | **9** — risco alto |
| NR-17 global | **NÃO CONFORME** |

---

## Roteiro executado (7 fases)

| Fase | Atividade | Resultado |
|------|-----------|-----------|
| 0 | Conectividade + login JWT | ✅ |
| 1 | Reconhecimento (setores, colaboradores, org) | ✅ 5 setores · 5 colaboradores |
| 2 | Registro análise postural + NR-17 | ✅ Análise #3 persistida |
| 3 | Integração GRO / inventário | ✅ Riscos propagados (3→4 itens) |
| 4 | Abertura AET + avanço workflow | ✅ Processo #5 → POSTO_MOBILIARIO |
| 5 | Contexto psicossocial NR-01 | ✅ Dashboard acessível |
| 6 | Parecer IA Expert (Anthropic) | ✅ Gerado em ~70 s |
| 7 | Relatórios NR-17 | ✅ 3 relatórios listados |

**Veredito:** 🟢 **17/17 verificações OK** — fluxo de inspeção completo.

---

## Achados técnicos corrigidos durante a inspeção

| Severidade | Problema | Correção |
|------------|----------|----------|
| 🔴 Crítico | Criar AET vinculada à análise **derrubava o servidor** (`v2_report_json` inexistente) | `aetRoutes.js` — query resiliente + try/catch |
| 🟡 Médio | Integração GRO histórico — FK `gro_historico_inventario_risco_id_fkey` | Log warning; não bloqueia análise |

---

## Parecer do ergonomista (conteúdo técnico)

### Diagnóstico
O posto apresenta **tríade de risco musculoesquelético**: cabeça anteriorizada, elevação crônica de ombros e flexão lombar sustentada, agravada por **distância visual inadequada** (42 cm) e iluminação no limite inferior (180 lux).

### Medidas imediatas (NR-17)
1. Reposicionar monitor para 55–65 cm e altura dos olhos alinhada ao terço superior da tela  
2. Regulagem de apoio lombar e altura do assento  
3. Suporte para documentos / headset para reduzir inclinação cervical  
4. Pausas ativas a cada 50 min (teleatendimento)

### Encaminhamentos no sistema
- ✅ Risco ergonômico integrado ao **GRO / inventário**  
- ✅ **AET** aberta e workflow iniciado  
- ✅ Relatório **NR-17** gerado  
- ✅ Parecer **IA Expert** disponível para complementar laudo  

---

## Como repetir a inspeção

```powershell
# Terminal 1 — API
cd ergosense-app\server
npm run dev

# Terminal 2 — teste de campo
cd ergosense-app\server
npm run test:field
```

Credenciais padrão: `lucas@vale.com.br` / `ergo1234`

---

## Limitações desta rodada

- **Câmera / MediaPipe** não testada neste script (requer browser com webcam)  
- Cenário simula dados posturais realistas; em campo real os ângulos viriam da captura ao vivo  
- UI validada parcialmente (login visível no browser; fluxo câmera manual)

Para teste completo com câmera: Nova Análise → captura → resultado → painel IA → Gerar AET.
