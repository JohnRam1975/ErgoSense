# MATRIZ DE CONFORMIDADE MTE — ErgoSense v2
## Portaria MTE nº 1.419/2024 × Guia de Fatores de Riscos Psicossociais 2025
**Data:** 08/06/2026 | **Nota:** Este arquivo substitui o .xlsx para máxima compatibilidade

> **Canônico** para checklist MTE/NR-01 (substitui `ergosense-app/docs/checklist-conformidade-mte-nr01.md`, removido).  
> Pacote: [`gap-analysis-psicossocial.md`](gap-analysis-psicossocial.md) · [`plano-de-adequacao-nr01.md`](plano-de-adequacao-nr01.md) · [`roadmap-implementacao.md`](roadmap-implementacao.md).

---

## LEGENDA
- ✅ **ATENDIDO** — Requisito plenamente implementado no ErgoSense v2
- ⚠ **PARCIAL** — Implementado parcialmente ou de forma incompleta
- ❌ **NÃO ATENDIDO** — Requisito ausente do sistema

---

## SEÇÃO A — ESTRUTURA DO GRO (NR-1 Capítulo 1.5)

| # | Requisito Legal | Subitem NR-1 | Status | Módulo Impactado | Gap Ref. |
|---|----------------|-------------|--------|-----------------|---------|
| A1 | Incluir fatores psicossociais no GRO | 1.5.3.1.4 | ⚠ PARCIAL | Psicossocial, Inventário | GAP-001 |
| A2 | Integrar psicossociais ao inventário de riscos | 1.5.3.1.4 | ⚠ PARCIAL | Inventário | GAP-001 |
| A3 | Processo GRO: identificar, avaliar, classificar, medir | 1.5.3.2 | ✅ ATENDIDO | Inventário, Plano de Ação | — |
| A4 | Considerar condições de trabalho nos termos da NR-17 | 1.5.3.2.1 | ⚠ PARCIAL | AEP | GAP-008 |
| A5 | Melhoria contínua / PDCA documentado | 1.5.3.4 | ❌ NÃO ATENDIDO | Conformidade | GAP-024 |
| A6 | Critérios de avaliação documentados expressamente | 1.5.4.4.2.2 | ❌ NÃO ATENDIDO | Conformidade | GAP-004 |
| A7 | Ferramenta adequada ao risco/circunstância (cientificamente fundamentada) | 1.5.4.4.2.1 | ⚠ PARCIAL | Psicossocial | GAP-027 |
| A8 | Probabilidade ergonômica/psicossocial: exigências da atividade × eficácia de medidas | 1.5.4.4.5.3 | ❌ NÃO ATENDIDO | AEP, Inventário | GAP-005 |
| A9 | Revisão do inventário após medidas de prevenção | 1.5.4.4.6 | ⚠ PARCIAL | Inventário, Plano de Ação | GAP-006 |
| A10 | Plano de ação com cronograma, responsáveis, acompanhamento e aferição | 1.5.5.2.2 | ✅ ATENDIDO | Plano de Ação | — |
| A11 | Hierarquia de medidas de prevenção | 1.5.5.1.2 | ⚠ PARCIAL | Plano de Ação | — |

**Score Seção A: 2 Atendidos + 5 Parciais + 4 Não Atendidos = 36% pleno**

---

## SEÇÃO B — INVENTÁRIO DE RISCOS (NR-1 Subitem 1.5.7.3.2)

| # | Campo obrigatório | Status para Fatores Físicos | Status para Fatores Psicossociais | Módulo | Gap Ref. |
|---|------------------|-----------------------------|----------------------------------|--------|---------|
| B1 | (a) Caracterização dos processos e ambientes de trabalho | ✅ | ✅ | Inventário | — |
| B2 | (b) Caracterização das atividades | ✅ | ✅ | Inventário | — |
| B3 | (c) Descrição dos perigos com fontes e circunstâncias | ✅ | ⚠ PARCIAL | Inventário | GAP-003 |
| B4 | (d) Indicação de lesões ou agravos à saúde | ✅ | ⚠ PARCIAL | Inventário | GAP-003 |
| B5 | (e) Indicação dos grupos de trabalhadores expostos | ✅ | ✅ | Inventário | — |
| B6 | (f) Descrição das medidas de prevenção implementadas | ✅ | ✅ | Inventário, Plano | — |
| B7 | (g) Caracterização da exposição (duração, frequência, intensidade) | ⚠ PARCIAL | ❌ NÃO ATENDIDO | Inventário | GAP-003 |
| B8 | (h) Dados da avaliação de ergonomia NR-17 | ⚠ PARCIAL | ❌ NÃO ATENDIDO | AEP, Inventário | GAP-003 |
| B9 | (i) Avaliação dos riscos com classificação para o plano de ação | ✅ | ⚠ PARCIAL | Inventário | GAP-003 |

**Score Seção B (psicossociais): 3 Atendidos + 4 Parciais + 2 Não Atendidos = 44% pleno**

---

## SEÇÃO C — FATORES DE RISCO PSICOSSOCIAIS (Guia MTE 2025)

| # | Fator de Risco (Guia MTE) | Consequência (Guia MTE) | Presente no ErgoSense | Avaliado/Quantificado | Módulo | Gap Ref. |
|---|--------------------------|------------------------|----------------------|----------------------|--------|---------|
| C1 | Excesso de demandas (sobrecarga) | Transtorno mental; DORT | ✅ | ✅ | Psicossocial | — |
| C2 | Assédio de qualquer natureza | Transtorno mental | ✅ | ⚠ PARCIAL | Psicossocial | GAP-014 |
| C3 | Baixo controle/falta de autonomia | Transtorno mental; DORT | ✅ | ✅ | Psicossocial | — |
| C4 | Más relações no local de trabalho | Transtorno mental | ✅ | ✅ | Psicossocial | — |
| C5 | Trabalho remoto e isolado | Transtorno mental; Fadiga | ✅ | ✅ | Psicossocial | — |
| C6 | Má gestão de mudanças organizacionais | Transtorno mental; DORT | ❌ | ❌ | — | GAP-011 |
| C7 | Baixa clareza de papel/função | Transtorno mental | ❌ | ❌ | — | GAP-012 |
| C8 | Baixas recompensas e reconhecimento | Transtorno mental | ⚠ PARCIAL | ⚠ PARCIAL | Psicossocial | GAP-002 |
| C9 | Falta de suporte/apoio no trabalho | Transtorno mental | ⚠ PARCIAL | ⚠ PARCIAL | Psicossocial | GAP-023 |
| C10 | Baixa justiça organizacional | Transtorno mental | ⚠ PARCIAL | ⚠ PARCIAL | Psicossocial | GAP-002 |
| C11 | Eventos violentos ou traumáticos | Transtorno mental | ❌ | ❌ | — | GAP-013 |
| C12 | Baixa demanda (subcarga) | Transtorno mental | ❌ | ❌ | — | GAP-009 |
| C13 | Trabalho em condições de difícil comunicação | Transtorno mental | ❌ | ❌ | — | GAP-010 |

**Score Seção C: 5 Atendidos + 3 Parciais + 5 Não Atendidos = 38% de cobertura**

---

## SEÇÃO D — PROCESSO DE GESTÃO (Guia MTE 2025 — Passos 1° a 4°)

| # | Requisito | Fonte | Status | Módulo | Gap Ref. |
|---|-----------|-------|--------|--------|---------|
| D1 | Verificar necessidade de ajuda especializada | Guia MTE — Passo 1° | ❌ | — | — |
| D2 | Envolver SESMT, gestores, trabalhadores, CIPA | Guia MTE — Passo 2° | ❌ | — | GAP-015, GAP-016 |
| D3 | Atribuir responsabilidades formalmente | Guia MTE — Passo 3° | ⚠ PARCIAL | Plano de Ação | GAP-025 |
| D4 | Comunicar trabalhadores antes da avaliação | Guia MTE — Passo 4° | ❌ | — | GAP-007 |
| D5 | Garantir anonimato nas avaliações | Guia MTE — Seção 3 | ✅ | Psicossocial | — |
| D6 | Processo multidisciplinar e multiprofissional | Guia MTE — Seção 3 | ⚠ PARCIAL | Conformidade | GAP-025 |
| D7 | Participação dos trabalhadores em todas as etapas | Guia MTE — Seções 4 e 5 | ❌ | — | GAP-016 |
| D8 | Verificação periódica de eficácia das medidas | Guia MTE — Seção 5 | ❌ | Plano de Ação | GAP-026 |
| D9 | Processo de melhoria contínua com participação dos trabalhadores e CIPA | Guia MTE — Seção 5 | ❌ | — | GAP-024 |

**Score Seção D: 1 Atendido + 2 Parciais + 6 Não Atendidos = 22% pleno**

---

## SEÇÃO E — NR-17 ERGONOMIA (Aspectos Psicossociais)

| # | Requisito | Item NR-17 | Status | Módulo | Gap Ref. |
|---|-----------|-----------|--------|--------|---------|
| E1 | Gestão de ergonomia obrigatória para todas as organizações | 17.1.1 | ✅ | AEP, Conformidade | — |
| E2 | Condições de trabalho adaptadas às características psicofisiológicas | 17.2.1 | ⚠ PARCIAL | AEP | GAP-008 |
| E3 | AEP obrigatória para todas as empresas (inclusive ME/EPP) | 17.3.1 | ✅ | AEP | — |
| E4 | Organização do trabalho: normas de produção, modo operatório, tempo, jornadas | 17.1.1.1 | ❌ | AEP | GAP-008 |
| E5 | AEP: caracterização da atividade real (não prescrita) | 17.3.1 | ⚠ PARCIAL | AEP | GAP-028 |
| E6 | Avaliação qualitativa de risco ergonômico/psicossocial (17.3.1.1) | 17.3.1.1 | ⚠ PARCIAL | AEP | GAP-028 |
| E7 | AET quando necessária (17.3.2) — linha de produção A pendente | 17.3.2 | ⚠ PARCIAL | AEP | — |

**Score Seção E: 2 Atendidos + 4 Parciais + 1 Não Atendido = 43% pleno**

---

## SEÇÃO F — ISO 45003:2021 (Saúde Psicológica no Trabalho)

| # | Requisito ISO 45003 | Status | Módulo | Gap Ref. |
|---|---------------------|--------|--------|---------|
| F1 | Identificação de fatores de risco psicossociais | ⚠ PARCIAL | Psicossocial | GAP-002 |
| F2 | Avaliação de riscos psicossociais | ⚠ PARCIAL | Inventário | GAP-003 |
| F3 | Controle de riscos psicossociais | ✅ | Plano de Ação | — |
| F4 | Ciclo PDCA para riscos psicossociais | ❌ | Conformidade | GAP-024 |
| F5 | Processo multidisciplinar | ⚠ PARCIAL | Conformidade | GAP-025 |
| F6 | Participação e consulta aos trabalhadores | ❌ | — | GAP-016 |
| F7 | Melhoria contínua documentada | ❌ | Conformidade | GAP-024 |
| F8 | Avaliação de saúde mental e bem-estar | ❌ | — | GAP-017 |
| F9 | Apoio à saúde psicológica individual | ❌ | — | GAP-017 |

**Score Seção F: 1 Atendido + 3 Parciais + 5 Não Atendidos = 28% pleno**

---

## CONSOLIDAÇÃO FINAL

| Seção | Total de Requisitos | Atendidos | Parciais | Não Atendidos | Score |
|-------|--------------------|-----------|---------|--------------|-|
| A — Estrutura GRO | 11 | 2 (18%) | 5 (45%) | 4 (36%) | 36% |
| B — Inventário NR-1 | 9 | 3 (33%) | 4 (44%) | 2 (22%) | 44% |
| C — 13 Fatores Guia MTE | 13 | 5 (38%) | 3 (23%) | 5 (38%) | 38% |
| D — Processo Gestão | 9 | 1 (11%) | 2 (22%) | 6 (67%) | 22% |
| E — NR-17 Ergonomia | 7 | 2 (29%) | 4 (57%) | 1 (14%) | 43% |
| F — ISO 45003 | 9 | 1 (11%) | 3 (33%) | 5 (56%) | 28% |
| **TOTAL** | **58** | **14 (24%)** | **21 (36%)** | **23 (40%)** | **~43%** |

> **Metodologia de score:** Atendido = 100%, Parcial = 50%, Não Atendido = 0%  
> **Score ponderado atual:** (14 × 1 + 21 × 0,5 + 23 × 0) / 58 = **24,5/58 = 42,2%**

---

## PROJEÇÃO PÓS-IMPLEMENTAÇÃO v3

| Fase concluída | Conformidade estimada |
|---------------|----------------------|
| Baseline (v2) | 43% |
| Após Fase 1 | 65% |
| Após Fase 2 | 78% |
| Após Fase 3 | 89% |
| Após Fase 4 | 95% |
