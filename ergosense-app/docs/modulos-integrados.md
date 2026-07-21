# Módulos Integrados — ErgoSense v3
**Data:** 08/06/2026

---

## Módulos existentes (mantidos intactos)

| ScreenId | Tela | Arquivo | Status |
|----------|------|---------|--------|
| `dashboard` | Dashboard principal | `MainScreens.tsx` | Mantido |
| `collabs` | Colaboradores | `MainScreens.tsx` | Mantido |
| `new-analysis` | Nova análise | `AnalysisScreens.tsx` | Mantido |
| `camera` | Câmera (captura) | `AnalysisScreens.tsx` | Mantido |
| `result` | Resultado análise | `AnalysisScreens.tsx` | Mantido |
| `history` | Histórico | `UtilityScreens.tsx` | Mantido |
| `reports` | Relatórios NR-17 | `UtilityScreens.tsx` | Mantido |
| `settings` | Configurações | `UtilityScreens.tsx` | Mantido |
| `sync` | Sincronização | `UtilityScreens.tsx` | Mantido |
| `v2-dashboard` | Dashboard V2 executivo | `V2Screens.tsx` | Mantido |
| `v2-methods` | Métodos V2 (RULA/REBA/NIOSH) | `V2Screens.tsx` | Mantido |
| `v2-video` | Análise de vídeo | `V2Screens.tsx` | Mantido |
| `v2-environmental` | Ambientais NR-15 | `V2Screens.tsx` | Mantido |
| `v2-roadmap` | Roadmap futuro | `V2Screens.tsx` | Mantido |
| `v2-audit` | Auditoria/rastreabilidade | `V2Screens.tsx` | Mantido |

---

## Módulos psicossociais integrados (novos)

### 1. `psicossocial-dashboard` — Dashboard Psicossocial
**Arquivo:** `src/screens/PsicossocialScreens.tsx` → `PsicossocialDashboardScreen`

**Conteúdo:**
- KPIs: score global de risco, fatores avaliados/total (9/13), ações abertas/em atraso
- Cards de atalho para os 7 submodules
- Status de conformidade MTE (% atual)
- Alertas de riscos críticos identificados

**Base legal:** NR-1 §1.5.3.1.4 · Guia MTE 2025

---

### 2. `psicossocial-fatores` — 13 Fatores do Guia MTE
**Arquivo:** `src/screens/PsicossocialScreens.tsx` → `PsicossocialFatoresScreen`

**Conteúdo:**
- Lista filtrável dos 13 fatores oficiais do Guia MTE 2025
- Status por fator: avaliado/pendente, score, setor, nível de risco
- Indicação visual de quais dos 8 fatores ausentes no inventário
- Filtros: Todos / Crítico / Alto / Não avaliados

**13 fatores implementados (Guia MTE 2025):**
1. Sobrecarga / excesso de demandas
2. Assédio de qualquer natureza
3. Baixo controle / falta de autonomia
4. Más relações no local de trabalho
5. Trabalho remoto / isolado
6. Má gestão de mudanças organizacionais
7. Baixa clareza de papel/função
8. Baixas recompensas / reconhecimento
9. Falta de suporte / apoio
10. Baixa justiça organizacional
11. Eventos violentos ou traumáticos
12. Baixa demanda (subcarga)
13. Trabalho em condições de difícil comunicação

**Base legal:** Guia MTE 2025 · Portaria 1.419/2024

---

### 3. `psicossocial-questionarios` — Questionários Validados
**Arquivo:** `src/screens/PsicossocialScreens.tsx` → `PsicossocialQuestionariosScreen`

**Instrumentos disponíveis:**
| Instrumento | Questões | Dimensões | Status |
|-------------|----------|-----------|--------|
| COPSOQ-III (curto) | 23 | 9 | Implementado |
| HSE Management Standards | 35 | 7 | Stub (Fase 2) |
| Copenhagen Burnout Inventory (CBI) | 5 | 1 | Implementado |

**COPSOQ-III — 9 dimensões:**
1. Exigências quantitativas (3 itens)
2. Ritmo de trabalho (1 item)
3. Influência no trabalho (2 itens)
4. Qualidade da liderança (2 itens)
5. Previsibilidade (2 itens)
6. Apoio dos colegas (2 itens)
7. Comprometimento com o trabalho (2 itens)
8. Satisfação no trabalho (2 itens)
9. Burnout (5 itens CBI embutidos)

**Proteções LGPD:**
- Anonimato garantido (sem IP ou cookie)
- Mínimo 5 respondentes por grupo antes de exibir resultados
- Dados individuais nunca exibidos

**Base legal:** NR-1 §1.5.4.4.2.1 · ISO 45003:2021

---

### 4. `psicossocial-matriz` — Matriz de Risco 5×5
**Arquivo:** `src/screens/PsicossocialScreens.tsx` → `PsicossocialMatrizScreen`

**Conteúdo:**
- Heatmap interativo Probabilidade (1–5) × Severidade (1–5)
- Plotagem automática de riscos psicossociais no heatmap
- Drilldown por célula: lista de fatores na intersecção
- Legenda de cores: verde (1–4) / amarelo (5–9) / laranja (10–14) / vermelho (15–25)

**Base legal:** NR-1 §1.5.4.4.5.3 · NR-1 §1.5.4.4.2.2

---

### 5. `psicossocial-plano` — Plano de Ação
**Arquivo:** `src/screens/PsicossocialScreens.tsx` → `PsicossocialPlanoScreen`

**Conteúdo:**
- Lista de ações com status (aberto/andamento/concluído/atrasado)
- Campos: descrição, responsável, prazo, prioridade
- Botão "Nova Ação" (stub de formulário)
- Filtros por status

**Base legal:** NR-1 §1.5.5.2.2 · Guia MTE 2025 Passo 3°

---

### 6. `psicossocial-conformidade` — Conformidade Legal
**Arquivo:** `src/screens/PsicossocialScreens.tsx` → `PsicossocialConformidadeScreen`

**Conteúdo:**
- Checklist de requisitos legais com status atendido/parcial/não atendido
- Agrupado por norma: NR-1, NR-17, ISO 45003, Guia MTE
- Score geral de conformidade (%)
- Indicação de requisitos críticos pendentes

**Requisitos rastreados:**
- NR-1 §1.5.3.1.4 — Fatores psicossociais no GRO
- NR-1 §1.5.4.4.2.2 — Critérios GRO documentados
- Guia MTE Passo 4° — Comunicação com trabalhadores
- ISO 45003 — Processo multidisciplinar
- ISO 45003 — Ciclo PDCA documentado
- E outros 13 requisitos

**Base legal:** Portaria MTE 1.419/2024 (vigência 26/05/2025)

---

### 7. `psicossocial-ia` — IA Psicossocial
**Arquivo:** `src/screens/PsicossocialScreens.tsx` → `PsicossocialIaScreen`

**Conteúdo:**
- Prompts rápidos categorizados:
  - Análise de risco: "Analisar fatores críticos", "Priorizar intervenções"
  - Conformidade: "Verificar gaps NR-1", "Gerar relatório MTE"
  - Planejamento: "Sugerir plano de ação", "Estimar ROI preventivo"
- Área de entrada de texto livre
- Resposta demo simulada

---

## Navegação

### Menu drawer — nova seção "Psicossocial"
Adicionada após o separador da seção V2:
```
── separador ──
🧠  Psicossocial          Dashboard MTE · NR-1
📋  13 Fatores MTE        Guia MTE 2025 · Portaria 1.419
📝  Questionários         COPSOQ-III · HSE · CBI
🔲  Matriz de Risco       Heatmap 5×5 probabilidade × severidade
✅  Plano de Ação         Medidas preventivas
⚖️  Conformidade Legal    NR-1 · ISO 45003 · Guia MTE
🤖  IA Psicossocial       Análise e recomendações
```

### Bottom nav
Todos os `psicossocial-*` screens mapeados para `bn-menu` (ícone ☰), mantendo consistência com os screens V2.
