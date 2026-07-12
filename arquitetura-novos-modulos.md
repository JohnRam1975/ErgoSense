# ARQUITETURA DOS NOVOS MÓDULOS — ErgoSense v3
## Adequação ao Guia MTE 2025 / NR-1 / ISO 45003
**Data:** 08/06/2026 | **Baseado em:** Gap Analysis v1

---

## PRINCÍPIOS DE ARQUITETURA

1. **Reutilização máxima** — Todos os componentes visuais existentes (card, tag, table-wrap, status-pill, form-group, etc.) serão reutilizados
2. **Sem duplicação** — Módulos existentes serão ESTENDIDOS, não substituídos
3. **Fluxo integrado** — Cada novo módulo alimenta o Inventário e/ou o PGR automaticament
**Novos campos nas ações:**
```
├── Avaliação de eficácia (campo pós-conclusão)
│   ├── Risco foi reduzido? (sim/não/parcial)
│   ├── Como foi verificado?
│   └── Participação dos trabalhadores na verificação
├── [AUTOMAÇÃO] Ao marcar ação como "Concluída":
│   └── Gera alerta "Revisar risco X no inventário (1.5.4.4.6)"
└── Participantes no processo (nomes + confirmação)
```

---

### EXT-05 — Extensão da Conformidade
**Objetivo:** Completar checklist ISO 45003 e adicionar CIPA/NR-5

**Novo bloco na Conformidade:**
```
Bloco: CIPA e Participação (NR-5 + Guia MTE)
├── CIPA constituída e ativa?
├── CIPA foi consultada no processo GRO?
├── Trabalhadores comunicados formalmente sobre avaliação?
├── Trabalhadores participaram da identificação de perigos?
├── Trabalhadores participaram da definição de medidas?
└── Acompanhamento realizado com participação dos trabalhadores?

Bloco: PDCA Psicossocial (ISO 45003 + NR-1 1.5.3.4)
├── Ciclo PDCA registrado para cada fator avaliado
├── Data da última revisão
├── Evidências de melhoria contínua
└── Próxima revisão programada
```

---

## NOVOS MÓDULOS (CRIAÇÃO)

### MOD-01 — Saúde Mental e Indicadores de Adoecimento
**Posição na sidebar:** Grupo "AVALIAÇÃO" após "Psicossocial"  
**Ícone:** `ti-heart-plus`  
**Cor:** Purple (`--es-purple`)

**Estrutura:**
```
page-saude-mental
├── KPIs de Saúde Mental
│   ├── Afastamentos por Transtorno Mental (CID F*)
│   ├── Taxa de burnout estimada (% da força de trabalho)
│   ├── Índice de fadiga por setor
│   └── Trend de 6 meses
├── Rastreamento de Burnout
│   ├── Mini escala (5 perguntas — Copenhagen Burnout Inventory)
│   ├── Resultado por setor
│   └── Alertas de equipes em risco
├── Rastreamento de Fadiga
│   ├── Checklist de sinais de fadiga (observacional)
│   ├── Relação com jornada (horas extras)
│   └── Correlação com produtividade
├── Registro de Afastamentos (com CID)
│   ├── CID F32 (Episódios depressivos)
│   ├── CID F41 (Outros transtornos ansiosos)
│   ├── CID F43 (Reações ao estresse)
│   ├── CID Z73 (Burnout/esgotamento)
│   └── Outros
└── Integração automática com Inventário de Riscos
    └── Afastamentos por transtorno mental → trigger de avaliação psicossocial
```

---

### MOD-02 — Clima Organizacional
**Posição na sidebar:** Grupo "AVALIAÇÃO" após "Saúde Mental"  
**Ícone:** `ti-mood-smile`  
**Cor:** Blue (`--es-blue`)

**Estrutura:**
```
page-clima
├── Índice de Clima Geral (0-100)
│   ├── Tendência mensal
│   └── Comparativo por setor
├── Pesquisa de Clima (anônima)
│   ├── Template padrão (10-15 perguntas)
│   ├── Personalização por setor
│   └── Frequência programável (trimestral/semestral)
├── Indicadores
│   ├── Índice de Satisfação Geral
│   ├── Índice de Engajamento
│   ├── NPS Interno (recomendaria a empresa?)
│   └── Índice de Bem-estar no Trabalho
├── Ranking de setores por clima
└── Alertas de deterioração de clima
```

---

### MOD-03 — Avaliação de Liderança
**Posição na sidebar:** Grupo "GESTÃO" após "Colaboradores"  
**Ícone:** `ti-user-star`  
**Cor:** Amber (`--es-amber`)

**Estrutura:**
```
page-lideranca
├── Avaliação de Gestores (anônima)
│   ├── Dimensão: Comunicação
│   ├── Dimensão: Suporte técnico e emocional
│   ├── Dimensão: Reconhecimento e feedback
│   ├── Dimensão: Gestão de conflitos
│   ├── Dimensão: Clareza de expectativas
│   └── Dimensão: Gestão de mudanças
├── Painel do Gestor
│   ├── Score geral da equipe
│   ├── Fatores psicossociais da equipe
│   ├── Clima da equipe (mini)
│   └── Ações recomendadas para o gestor
├── Ranking de gestores por indicador de suporte
└── Plano de desenvolvimento para gestores
```

---

### MOD-04 — Matriz de Risco Psicossocial
**Posição na sidebar:** Grupo "AVALIAÇÃO" (expandindo Inventário)  
**Ícone:** `ti-grid-3x3`  
**Cor:** Red (`--es-red`)

**Estrutura:**
```
page-matriz
├── Configuração de Critérios (1.5.4.4.2.2)
│   ├── Escala de Severidade (1-5 com descrição)
│   ├── Escala de Probabilidade (1-5 com descrição)
│   └── Tabela de classificação resultante
├── Heatmap 5×5 Probabilidade × Severidade
│   ├── Células coloridas: Verde/Amarelo/Laranja/Vermelho
│   ├── Riscos plotados como pontos
│   └── Drill-down por célula (lista de riscos)
├── Ranking de Setores (por nível de risco psicossocial)
├── Ranking de Fatores (quais fatores mais críticos)
└── Exportação automática para o PGR
```

---

### MOD-05 — Canal de Denúncia
**Posição na sidebar:** Grupo "GESTÃO"  
**Ícone:** `ti-shield-exclamation`  
**Cor:** Red (`--es-red`)

**Estrutura:**
```
page-denuncia
├── Formulário anônimo de denúncia
│   ├── Tipo: Assédio moral / Assédio sexual / Violência / Discriminação / Outro
│   ├── Setor envolvido
│   ├── Frequência do ocorrido
│   └── Descrição (texto livre)
├── Painel de gestão (RH/Jurídico)
│   ├── Denúncias recebidas (anonimizadas)
│   ├── Status: Recebida / Em investigação / Encerrada
│   └── Prazos e responsáveis
├── Integração com Plano de Ação
│   └── Denúncia confirmada → gera ação no plano
└── Relatório de ocorrências (para conformidade)
```

---

### MOD-06 — Comunicação com Trabalhadores
**Posição na sidebar:** Grupo "GESTÃO"  
**Ícone:** `ti-message-circle`  
**Cor:** Blue (`--es-blue`)

**Estrutura:**
```
page-comunicacao
├── Criação de comunicado
│   ├── Assunto
│   ├── Público-alvo (todos/setor/equipe)
│   └── Conteúdo (texto/link)
├── Registro de ciência
│   ├── Confirmação de leitura (clique)
│   └── Relatório de confirmações por colaborador
├── Tipos de comunicado
│   ├── Resultado de avaliação psicossocial (agregado)
│   ├── Início de nova avaliação
│   ├── Medida preventiva adotada
│   └── Convocação para participação no GRO
└── Histórico de comunicações (evidência para a Inspeção do Trabalho)
```

---

### MOD-07 — Dashboards Executivos (multi-perfil)
**Posição na sidebar:** Grupo "VISÃO GERAL" após "Dashboard"  
**Ícone:** `ti-presentation-analytics`

**Sub-dashboards por perfil:**

#### Dashboard Diretoria
```
├── Risco psicossocial geral da empresa (score único)
├── Tendência de risco (últimos 6 meses)
├── Áreas críticas (top 3)
├── Passivo trabalhista estimado (baseado em riscos críticos)
├── ROI preventivo (custo das ações vs. custo dos afastamentos)
└── Score de conformidade geral (NR-1 + NR-17 + ISO 45003)
```

#### Dashboard RH
```
├── Absenteísmo (total + por saúde mental)
├── Afastamentos (por CID, por setor, tendência)
├── Turnover (total + voluntário vs. involuntário)
├── Índice de Burnout estimado
├── Resultados de clima organizacional
└── Engajamento com as avaliações (% de respondentes)
```

#### Dashboard SMS/SST
```
├── Riscos ocupacionais totais por categoria
├── Riscos psicossociais (classificados por Guia MTE)
├── Indicadores preventivos (ações concluídas, no prazo)
├── Conformidade NR-1 / NR-17 / ISO 45003
└── Próximas revisões programadas
```

#### Dashboard Gestores
```
├── Clima da minha equipe (hoje)
├── Fatores psicossociais críticos na equipe
├── Afastamentos da equipe (últimos 30 dias)
├── Ações do plano que dependem de mim
├── Fadiga operacional estimada (horas extras da equipe)
└── Recomendações da IA para o gestor
```

---

## AGENTE IA ERGOSENSE (MOD-08)

**Integração com IA existente (função sendPrompt):**

```
Capacidades novas do agente:
├── Identificar fatores psicossociais automaticamente
│   └── Trigger: nova AEP salva → analisar campos e sugerir fatores
├── Calcular score de risco psicossocial
│   └── Fórmula: Σ(severidade_fator × probabilidade_fator) / n_fatores
├── Sugerir ações corretivas por fator
│   └── Base: intervenções do Guia MTE 2025 (seção 7)
├── Emitir alertas preventivos
│   ├── Trigger: score psicossocial > 70 → alerta crítico
│   ├── Trigger: fator "Assédio" identificado → alerta imediato
│   └── Trigger: afastamentos CID-F em alta → alerta de cluster
├── Gerar recomendações para RH
│   └── Foco: absenteísmo, turnover, programas de apoio
├── Gerar recomendações para SMS
│   └── Foco: inventário, PGR, conformidade legal
└── Gerar recomendações para Gestores
    └── Foco: ações imediatas, comunicação com equipe
```

**Prompts pré-configurados novos:**
```javascript
// Análise completa de saúde mental
sendPrompt('Analise os indicadores de saúde mental e identifique clusters de risco por setor conforme CIDs F32, F41, F43 e Z73, gerando alertas preventivos')

// Diagnóstico de burnout
sendPrompt('Calcule o índice de burnout por setor com base nos dados de sobrecarga, equilíbrio vida-trabalho e afastamentos, e recomende intervenções prioritárias')

// Relatório para Inspeção do Trabalho
sendPrompt('Gere relatório completo de conformidade com a Portaria MTE 1.419/2024 demonstrando integração dos fatores psicossociais no GRO/PGR')

// Recomendações para gestor
sendPrompt('Analise os dados psicossociais da equipe e gere recomendações práticas para o gestor reduzir fatores de risco no próximo trimestre')
```

---

## DIAGRAMA DE INTEGRAÇÕES ENTRE MÓDULOS

```
                    ┌─────────────────┐
                    │   GUIA MTE 2025  │
                    │  (13 fatores)    │
                    └────────┬────────┘
                             │ alimenta
              ┌──────────────▼──────────────┐
              │    AVALIAÇÃO PSICOSSOCIAL    │
              │   (EXT-01 + MOD-02 + MOD-03) │
              └──────────────┬──────────────┘
                             │ gera
    ┌───────────┐            │            ┌──────────────┐
    │  AEP      │◄───────────┤            │ SAÚDE MENTAL │
    │ (EXT-02)  │            │            │   (MOD-01)   │
    └─────┬─────┘            │            └──────┬───────┘
          │                  ▼                   │
          │     ┌────────────────────────┐        │
          └────►│  INVENTÁRIO DE RISCOS  │◄───────┘
                │      (EXT-03)          │
                │  + Matriz Risco (MOD-04)│
                └───────────┬────────────┘
                            │ gera
                ┌───────────▼────────────┐
                │    PLANO DE AÇÃO       │
                │       (EXT-04)         │
                └───────────┬────────────┘
                            │ evidencia
                ┌───────────▼────────────┐
                │     DOCUMENTOS / PGR   │
                │    (Dossiê completo)    │
                └───────────┬────────────┘
                            │ alimenta
                ┌───────────▼────────────┐
                │    DASHBOARDS (MOD-07)  │
                │  Diretoria/RH/SMS/Gest  │
                └────────────────────────┘

Módulos de suporte (alimentam tudo):
├── CANAL DE DENÚNCIA (MOD-05) → Plano de Ação + Inventário
├── COMUNICAÇÃO (MOD-06) → Conformidade + Auditoria
└── AGENTE IA (MOD-08) → Todos os módulos
```

---

## COMPONENTES REUTILIZÁVEIS (v2 → v3)

| Componente | Classe CSS | Reutilizado em |
|-----------|-----------|----------------|
| Card | `.card` | Todos os novos módulos |
| KPI Card | `.kpi-card` | MOD-01, MOD-07 |
| Tabela | `table + table-wrap` | MOD-01, MOD-03, MOD-05 |
| Tag de severidade | `.tag.critico/alto/medio/baixo` | MOD-04, EXT-03 |
| Status pill | `.status-pill` | MOD-05 |
| Formulário | `.form-group + form-input` | MOD-02, MOD-05, MOD-06 |
| Checklist | `.checklist + check-item` | EXT-01, EXT-05 |
| Risk bar | `.risk-bar` | MOD-04, MOD-07 |
| Alert banner | `.alert-banner` | MOD-08 (alertas) |
| Factor card | `.factor-card` | EXT-01, MOD-02 |
| Mini chart | `.mini-chart` | MOD-01, MOD-07 |
| Timeline | `.action-timeline + tl-item` | MOD-06 |
| Nav item | `.nav-item` | Todos os novos módulos |
