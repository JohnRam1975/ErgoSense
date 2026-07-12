# DASHBOARDS EXECUTIVOS — ErgoSense MTE
## Especificação de Dashboards por Perfil de Usuário
**Data:** 08/06/2026 | **Referências:** Guia MTE 2025, ISO 45003, NR-1

---

## DASHBOARD 1 — DIRETORIA

**Objetivo:** Visão estratégica do risco psicossocial e conformidade legal  
**Público:** CEO, Diretores, Conselho  
**Frequência de atualização:** Mensal / Sob demanda

### KPIs Principais (topo)
| KPI | Valor Exemplo | Cor | Referência |
|-----|-------------|-----|-----------|
| Score de Risco Psicossocial Geral | 67/100 | Amber | ISO 45003 |
| Score de Conformidade NR-1 | 92% | Green | NR-1 |
| Passivo Trabalhista Estimado | R$ 280k | Red | CLT + jurisprud. |
| Afastamentos por Saúde Mental | 8 / mês | Amber | CID F* |

### Gráficos e Painéis
```
┌──────────────────────────────────────────────────────────┐
│  RISCO PSICOSSOCIAL GERAL          │  TENDÊNCIA MENSAL   │
│  ┌────────────────────────────┐    │  ┌───────────────┐  │
│  │  SCORE: 67 / 100           │    │  │  ╭─╮           │  │
│  │  ████████░░ MODERADO       │    │  │ ╭╯ ╰─╮         │  │
│  │                            │    │  │╭╯    ╰──       │  │
│  │  Tendência: ▲ +4 pontos    │    │  │Jan Fev Mar Abr │  │
│  └────────────────────────────┘    │  └───────────────┘  │
└──────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  ÁREAS CRÍTICAS (Top 3)                                    │
│  1. Produção      ████████████ Crítico (score: 89)         │
│  2. Almoxarifado  ████████░░░░ Alto    (score: 71)         │
│  3. TI/Suporte    ██████░░░░░░ Médio   (score: 58)         │
└────────────────────────────────────────────────────────────┘

┌─────────────────────────────┬──────────────────────────────┐
│  CONFORMIDADE NORMATIVA      │  ROI PREVENTIVO              │
│  NR-1/GRO/PGR    ████  92%  │  Custo ações:  R$ 45k        │
│  NR-17 Ergonomia ████  74%  │  Custo afast:  R$ 280k       │
│  ISO 45001       ████  81%  │  ROI estimado: 6,2x          │
│  ISO 45003       ████  68%  │  ─────────────────────       │
│  LGPD            ████ 100%  │  Risco legal atual: ALTO     │
└─────────────────────────────┴──────────────────────────────┘
```

### Indicadores Estratégicos
- Custo médio por afastamento por saúde mental: R$ 12.500/caso
- Tempo médio de afastamento: 45 dias
- % de ações preventivas concluídas no prazo: 78%
- Próximas revisões obrigatórias: 3 itens nos próximos 30 dias

---

## DASHBOARD 2 — RECURSOS HUMANOS (RH)

**Objetivo:** Gestão de pessoas com foco em saúde mental e indicadores de adoecimento  
**Público:** Diretor de RH, BP de RH, Analistas de RH  
**Frequência de atualização:** Semanal / Em tempo real

### KPIs Principais (topo)
| KPI | Valor | Meta | Status |
|-----|-------|------|--------|
| Absenteísmo Geral | 4,2% | < 3,5% | ⚠ Acima da meta |
| Absenteísmo Saúde Mental | 1,8% | < 1,0% | 🔴 Crítico |
| Turnover Voluntário | 11% a.a. | < 8% | ⚠ Atenção |
| Índice de Burnout estimado | 22% força | < 10% | 🔴 Crítico |
| Taxa de engajamento nas avaliações | 87% | > 80% | ✅ OK |
| NPS Interno | +32 | > +40 | ⚠ Atenção |

### Gráficos e Painéis
```
┌─────────────────────────────────────────────────────────────┐
│  AFASTAMENTOS POR CATEGORIA (últimos 6 meses)               │
│                                                             │
│  Musculoesquelético  ██████████░░  45%  (18 casos)         │
│  Transtornos mentais ████████░░░░  35%  (14 casos)         │
│  Outros              ████░░░░░░░░  20%  (8 casos)          │
│                                                             │
│  CID F32 (Depressão)    6 casos ████                       │
│  CID F41 (Ansiedade)    5 casos ████                       │
│  CID F43 (Estresse)     3 casos ███                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────┐
│  BURNOUT POR SETOR        │  TURNOVER MENSAL                 │
│  Produção    78% 🔴       │  Jan ██ 2%                       │
│  TI          65% 🟠       │  Fev ████ 4%                     │
│  Almoxar.    58% 🟠       │  Mar ███ 3%                      │
│  RH          32% 🟡       │  Abr █ 1%                        │
│  Adm.        28% 🟡       │  Mai ████ 4%                     │
└──────────────────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  RESULTADOS DE CLIMA ORGANIZACIONAL                         │
│  Satisfação geral:    62/100  ████████░░  Moderado          │
│  Engajamento:         58/100  ███████░░░  Moderado          │
│  Bem-estar:           55/100  ███████░░░  Atenção           │
│  Percepção da gestão: 71/100  █████████░  Bom               │
│  ─────────────────────────────────────────────────         │
│  Setores em alerta de clima: Produção, Almoxarifado         │
└─────────────────────────────────────────────────────────────┘
```

### Alertas RH Prioritários
1. 🔴 Produção — 4 colaboradores com suspeita de burnout (ação até 15/06)
2. 🟠 Almoxarifado — Investigação de assédio em andamento (prazo: 20/06)
3. 🟠 TI — Alto índice de horas extras (média 12h semanais extras)
4. 🟡 Geral — Avaliação psicossocial periódica vence em 30 dias

---

## DASHBOARD 3 — SMS/SST

**Objetivo:** Gestão técnica de riscos ocupacionais e conformidade  
**Público:** Técnicos e Engenheiros de SST, Médico do Trabalho  
**Frequência de atualização:** Diária

### KPIs Técnicos
| KPI | Valor | Referência |
|-----|-------|-----------|
| Riscos Críticos Ativos | 4 | NR-1 |
| Riscos Psicossociais no Inventário | 7 | Guia MTE |
| Fatores Guia MTE Mapeados | 5/13 (38%) | Portaria 1.419 |
| AEPs em andamento | 2 | NR-17 |
| Conformidade NR-1 | 92% | NR-1 |
| Conformidade Guia MTE | 43% | Portaria 1.419 |

### Painel de Riscos Psicossociais (13 fatores Guia MTE)
```
┌──────────────────────────────────────────────────────────────┐
│  FATORES DE RISCO PSICOSSOCIAIS — STATUS DE MAPEAMENTO       │
│                                                              │
│  ✅ Sobrecarga de trabalho          Crítico  Produção        │
│  ✅ Assédio de qualquer natureza    Crítico  Almoxarifado    │
│  ✅ Baixo controle/autonomia        Alto     TI              │
│  ✅ Más relações no trabalho        Médio    Adm.            │
│  ✅ Trabalho remoto/isolado         Médio    TI/RH           │
│  ❌ Má gestão de mudanças           NÃO AVALIADO             │
│  ❌ Baixa clareza de papel          NÃO AVALIADO             │
│  ⚠  Baixas recompensas             Parcial  (sem CID vínculo)│
│  ❌ Falta de suporte/apoio          NÃO AVALIADO             │
│  ⚠  Baixa justiça organizacional   Parcial  (dado existe)    │
│  ❌ Eventos violentos/traumáticos   NÃO AVALIADO             │
│  ❌ Subcarga de trabalho            NÃO AVALIADO             │
│  ❌ Difícil comunicação             NÃO AVALIADO             │
└──────────────────────────────────────────────────────────────┘

Cobertura atual: 38%  ████░░░░░░  Meta: 100% (exigência legal)
```

### Indicadores Preventivos
```
┌──────────────────────────┬───────────────────────────────────┐
│  AÇÕES POR PRAZO          │  MATRIZ DE RISCO (simplificada)   │
│  Vencidas: 5 🔴           │                    SEVERIDADE      │
│  Vencem em 7d: 3 🟠       │  PROB.  Baixa Média Alta Crít.    │
│  Vencem em 30d: 8 🟡      │  Alta     -    [4]  [7]  [3]      │
│  Em dia: 41 ✅            │  Média    -    [3]  [6]  [2]      │
│                          │  Baixa   [2]   [1]  [1]   -       │
│  SLA geral: 78%           │  (números = qtd. de riscos)       │
└──────────────────────────┴───────────────────────────────────┘
```

### Próximas Revisões Obrigatórias
| Item | Prazo | Norma | Prioridade |
|------|-------|-------|-----------|
| AET — Linha A (em aberto) | 15/06/2026 | NR-17, 17.3.2 | 🔴 |
| Revisão inventário pós-medidas | 20/06/2026 | NR-1, 1.5.4.4.6 | 🔴 |
| Avaliação psicossocial periódica | 01/09/2026 | ISO 45003 | 🟡 |
| Comunicação formal trabalhadores | 30/06/2026 | Guia MTE | 🟠 |

---

## DASHBOARD 4 — GESTORES DE EQUIPE

**Objetivo:** Visão operacional da saúde e clima da equipe  
**Público:** Gerentes, Supervisores, Coordenadores  
**Frequência de atualização:** Semanal / Em tempo real

### KPIs da Minha Equipe
| KPI | Minha equipe | Empresa |
|-----|-------------|---------|
| Clima da equipe | 58/100 ⚠ | 62/100 |
| Afastamentos (30 dias) | 2 🟠 | 8 |
| Horas extras médias | 12h/sem 🔴 | 6h/sem |
| Satisfação com liderança | 71/100 ✅ | 65/100 |

### Painel da Equipe
```
┌─────────────────────────────────────────────────────────────┐
│  FATORES PSICOSSOCIAIS DA MINHA EQUIPE                      │
│                                                             │
│  Sobrecarga de trabalho    78 🔴 ██████████                 │
│  Equilíbrio vida-trabalho  38 🔴 █████                      │
│  Autonomia                 52 🟠 ███████                    │
│  Reconhecimento            45 🟠 ██████                     │
│  Apoio da liderança        71 ✅ █████████                  │
│  Justiça organizacional    60 🟡 ████████                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  AÇÕES QUE DEPENDEM DE MIM                                   │
│  ⚠ Redistribuição de carga — prazo: 10/07  [Em andamento]   │
│  🔴 Pausas obrigatórias implantadas? — prazo: 15/06          │
│  ─────────────────────────────────────────────────────       │
│  📋 Ver plano de ação completo →                            │
└──────────────────────────────────────────────────────────────┘
```

### Recomendações da IA para o Gestor
```
┌──────────────────────────────────────────────────────────────┐
│  🤖 IA ERGOSENSE — RECOMENDAÇÕES PARA HOJE                   │
│                                                              │
│  1. 🔴 Sua equipe apresenta sobrecarga crítica (78/100).      │
│     Recomendo: revisão de prioridades com a equipe           │
│     esta semana. Guia MTE 2025 — intervenção imediata.       │
│                                                              │
│  2. 🟠 Equilíbrio vida-trabalho em 38/100.                   │
│     Ação: Verificar horas extras acumuladas e                │
│     implementar compensação / banco de horas.                │
│                                                              │
│  3. 🟡 Autonomia percebida em 52/100.                        │
│     Sugestão: delegue decisões operacionais para             │
│     os colaboradores sempre que possível.                    │
│                                                              │
│  [Gerar relatório para RH]  [Ver plano de ação]              │
└──────────────────────────────────────────────────────────────┘
```

---

## ESPECIFICAÇÃO TÉCNICA DOS DASHBOARDS

### Métricas calculadas automaticamente

| Métrica | Fórmula | Atualização |
|---------|---------|------------|
| Score Risco Psicossocial | Σ(peso_fator × score_fator) / 13 | Por avaliação |
| Índice Burnout estimado | % colaboradores com sobrecarga > 70 + equilíbrio < 40 | Mensal |
| Conformidade Guia MTE | (fatores mapeados / 13) × 100 | Por AEP/avaliação |
| ROI Preventivo | custo_afastamentos / custo_acoes_preventivas | Mensal |
| NPS Interno | % promotores − % detratores | Por pesquisa |
| Passivo trabalhista estimado | n_riscos_criticos × custo_médio_ação_trabalhista | Mensal |

### Cores e semáforos padrão

| Range | Cor | Interpretação |
|-------|-----|--------------|
| 0–40 | 🔴 Red (`--es-red`) | Crítico / Ação imediata |
| 41–60 | 🟠 Amber (`--es-amber`) | Alto / Atenção |
| 61–75 | 🟡 Blue (`--es-blue`) | Moderado / Monitorar |
| 76–100 | 🟢 Green (`--es-green`) | Adequado / Manter |
