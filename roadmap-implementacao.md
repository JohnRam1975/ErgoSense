# ROADMAP DE IMPLEMENTAÇÃO — ErgoSense v3
## Adequação ao Guia MTE 2025 / Portaria MTE nº 1.419/2024
**Data:** 08/06/2026 | **Versão:** 1.0

---

## CRITÉRIOS DE PRIORIZAÇÃO

| Critério | Peso |
|---------|------|
| Obrigatoriedade legal (risco de autuação) | 40% |
| Impacto para o usuário (SMS/SST) | 30% |
| Complexidade de implementação (inversamente proporcional) | 20% |
| Valor percebido pelo cliente final | 10% |

---

## FASE 1 — CONFORMIDADE LEGAL CRÍTICA
**Duração estimada:** 3 semanas  
**Esforço:** 60-80 horas de desenvolvimento  
**Objetivo:** Eliminar os 7 gaps CRÍTICOS que expõem a empresa à autuação fiscal

### Sprint 1.1 — Completar os 13 fatores do Guia MTE (GAP-001, GAP-002)
**Estimativa:** 8h  
**Entregáveis:**
- [ ] Expandir tabela do módulo Psicossocial com 8 fatores ausentes do Guia MTE
- [ ] Adicionar campo "Consequência (lesão/agravo)" vinculado ao Guia MTE 2025
- [ ] Atualizar formulário da AEP com checklist dos 13 fatores
- [ ] Atualizar Inventário de Riscos com os novos perigos psicossociais

**Arquivos impactados:** `ergosense_platform_v2.html` → seções `page-psicossocial`, `page-aep`, `page-inventario`

---

### Sprint 1.2 — Completar campos obrigatórios do Inventário 1.5.7.3.2 (GAP-003)
**Estimativa:** 12h  
**Entregáveis:**
- [ ] Adicionar campo (g) Caracterização da exposição no Inventário (duração, frequência, intensidade)
- [ ] Adicionar campo (h) Link com avaliação NR-17 (referência à AEP correspondente)
- [ ] Adicionar campo (i) Método de avaliação documentado
- [ ] Templates pré-preenchidos por tipo de fator psicossocial (13 templates)

---

### Sprint 1.3 — Módulo de Critérios GRO (GAP-004)
**Estimativa:** 10h  
**Entregáveis:**
- [ ] Criar página `page-criterios` com configuração da Matriz de Risco
- [ ] Formulário para definir escalas de Severidade (1-5) com descrição qualitativa
- [ ] Formulário para definir escalas de Probabilidade (1-5) com critérios ergonômicos/psicossociais
- [ ] Tabela resultante de classificação de riscos
- [ ] Botão de exportação do documento de critérios (evidência para a IT)
- [ ] Adicionar item "Critérios GRO" na sidebar grupo SISTEMA

---

### Sprint 1.4 — Calculadora de Risco Psicossocial (GAP-005)
**Estimativa:** 8h  
**Entregáveis:**
- [ ] Expandir calculadora da AEP com aba "Risco Psicossocial"
- [ ] Formulário: Fator psicossocial (dropdown 13 opções) + Severidade + Probabilidade
- [ ] Cálculo automático: Nível de Risco = Severidade × Probabilidade
- [ ] Classificação qualitativa alinhada ao GRO
- [ ] Botão "Registrar no Inventário" com preenchimento automático dos campos

---

### Sprint 1.5 — Automação de Revisão do Inventário (GAP-006)
**Estimativa:** 6h  
**Entregáveis:**
- [ ] Quando ação marcada como "Concluída" no Plano de Ação → alert banner no Inventário
- [ ] Badge contador de "riscos aguardando revisão" na sidebar
- [ ] Campo "Data da última revisão" no Inventário por risco
- [ ] Checklist de revisão pós-medidas alinhado ao subitem 1.5.4.4.6

---

### Sprint 1.6 — Comunicação Formal com Trabalhadores (GAP-007)
**Estimativa:** 10h  
**Entregáveis:**
- [ ] Criar página `page-comunicacao` (MOD-06)
- [ ] Formulário de criação de comunicado (assunto, público, conteúdo)
- [ ] Tabela de comunicados enviados com status de leitura
- [ ] Campo "Data de comunicação" no checklist de conformidade NR-1
- [ ] Relatório de evidências de comunicação (para Inspeção do Trabalho)

---

**Resultado da Fase 1:** Conformidade com Guia MTE sobe de **43% → ~65%**  
**Riscos legais eliminados:** 7 gaps críticos

---

## FASE 2 — AVALIAÇÃO PSICOSSOCIAL COMPLETA
**Duração estimada:** 4 semanas  
**Esforço:** 80-100 horas de desenvolvimento  
**Objetivo:** Implementar questionários reais e módulos de saúde mental (GAPs 8-20)

### Sprint 2.1 — Questionário COPSOQ-III curto (GAP-027, GAP-028)
**Estimativa:** 20h  
**Entregáveis:**
- [ ] Implementar 23 perguntas do COPSOQ-III versão curta em português
- [ ] Escala Likert de 5 pontos com descrição (Nunca → Sempre)
- [ ] Cálculo automático de scores por dimensão
- [ ] 9 dimensões: Exigências quantitativas, Influência no trabalho, Significado do trabalho, Comprometimento com o trabalho, Qualidade da liderança, Suporte social, Reconhecimento, Conflito trabalho-família, Satisfação no trabalho
- [ ] Geração automática de relatório com scores e alertas

### Sprint 2.2 — Módulo Saúde Mental (MOD-01)
**Estimativa:** 16h  
**Entregáveis:**
- [ ] Criar página `page-saude-mental`
- [ ] KPIs de saúde mental no dashboard
- [ ] Formulário de registro de afastamento com campo CID
- [ ] Discriminação automática de afastamentos por CID F*
- [ ] Mini-escala de burnout (5 perguntas — Copenhagen Burnout Inventory)
- [ ] Alerta automático quando % burnout estimado > threshold configurável
- [ ] Adicionar item "Saúde Mental" na sidebar grupo AVALIAÇÃO

### Sprint 2.3 — Expansão do Módulo Psicossocial (EXT-01)
**Estimativa:** 14h  
**Entregáveis:**
- [ ] Adicionar dimensões ausentes: Burnout/esgotamento, Fadiga, Violência/trauma
- [ ] Expandir factor-grid de 6 para 13 fatores (todos do Guia MTE)
- [ ] Gráfico de tendência histórica (6 meses) por fator
- [ ] Comparativo entre setores para cada fator

### Sprint 2.4 — Expansão da AEP — Organização do Trabalho (EXT-02, GAP-008)
**Estimativa:** 12h  
**Entregáveis:**
- [ ] Adicionar seção "Organização do Trabalho" no formulário AEP
- [ ] Campos: normas de produção, modo operatório, exigências de tempo, jornadas, monotonia, turno noturno, home office
- [ ] Campo de participantes da AEP com nomes/cargos
- [ ] Campos de caracterização da exposição psicossocial (duração, frequência, intensidade)

### Sprint 2.5 — Canal de Denúncia (MOD-05, GAP-013, GAP-014)
**Estimativa:** 18h  
**Entregáveis:**
- [ ] Criar página `page-denuncia`
- [ ] Formulário anônimo de denúncia (tipo, setor, frequência, descrição)
- [ ] Hash para anonimato (sem IP, sem dados identificadores)
- [ ] Painel de gestão para RH/Jurídico
- [ ] Fluxo: Denúncia → Investigação → Conclusão → Plano de Ação
- [ ] Integração automática com Plano de Ação quando denúncia confirmada
- [ ] Relatório de ocorrências para conformidade

---

**Resultado da Fase 2:** Conformidade com Guia MTE sobe de **65% → ~78%**

---

## FASE 3 — CLIMA, LIDERANÇA E PARTICIPAÇÃO
**Duração estimada:** 4 semanas  
**Esforço:** 80-100 horas de desenvolvimento  
**Objetivo:** Módulos de clima organizacional, liderança e processo participativo (GAPs 15-26)

### Sprint 3.1 — Clima Organizacional (MOD-02, GAP-022)
**Estimativa:** 20h  
**Entregáveis:**
- [ ] Criar página `page-clima`
- [ ] Template de pesquisa de clima (12 perguntas padrão)
- [ ] Índice de Satisfação, Engajamento e NPS Interno
- [ ] Ranking de setores por clima
- [ ] Tendência mensal de clima geral
- [ ] Alertas de deterioração de clima por setor
- [ ] Cronograma de aplicação (trimestral/semestral)

### Sprint 3.2 — Avaliação de Liderança (MOD-03, GAP-021, GAP-023)
**Estimativa:** 18h  
**Entregáveis:**
- [ ] Criar página `page-lideranca`
- [ ] Questionário de avaliação de gestores (6 dimensões)
- [ ] Garantia de anonimato (mesmo protocolo da avaliação psicossocial)
- [ ] Painel do gestor com score da equipe e recomendações
- [ ] Ranking de gestores por indicador de suporte

### Sprint 3.3 — Participação dos Trabalhadores e CIPA (GAP-015, GAP-016)
**Estimativa:** 12h  
**Entregáveis:**
- [ ] Adicionar bloco "CIPA e Participação" na página de Conformidade
- [ ] Campos de registro de participação em cada etapa do GRO
- [ ] Formulário de convocação de reunião com CIPA
- [ ] Registro de atas de reunião (upload ou texto)
- [ ] Evidências de participação exportáveis para dossiê

### Sprint 3.4 — Matriz de Risco Visual (MOD-04, GAP-029)
**Estimativa:** 16h  
**Entregáveis:**
- [ ] Criar página `page-matriz` ou expandir `page-inventario`
- [ ] Heatmap 5×5 Probabilidade × Severidade (renderizado em HTML/CSS puro)
- [ ] Riscos plotados como pontos clicáveis nas células
- [ ] Drill-down: clicar na célula exibe lista de riscos naquele quadrante
- [ ] Ranking de setores e fatores mais críticos
- [ ] Exportação do heatmap para o PGR

### Sprint 3.5 — Documentação de Melhoria Contínua (GAP-024, GAP-025, GAP-026)
**Estimativa:** 14h  
**Entregáveis:**
- [ ] Adicionar registro de ciclo PDCA na Conformidade
- [ ] Campos: Plan (objetivo) / Do (ação executada) / Check (resultado) / Act (ajuste)
- [ ] Campo de "Avaliação de eficácia" no Plano de Ação
- [ ] Seção "Equipe GRO" com responsabilidades documentadas
- [ ] Programação de próxima revisão por fator psicossocial

---

**Resultado da Fase 3:** Conformidade com Guia MTE sobe de **78% → ~89%**

---

## FASE 4 — DASHBOARDS EXECUTIVOS E INTELIGÊNCIA ARTIFICIAL
**Duração estimada:** 3 semanas  
**Esforço:** 60-80 horas de desenvolvimento  
**Objetivo:** Visão executiva multi-perfil e expansão do agente IA (GAPs 029-030)

### Sprint 4.1 — Dashboards por Perfil (MOD-07, GAP-030)
**Estimativa:** 24h  
**Entregáveis:**
- [ ] Implementar seletor de perfil (Diretoria / RH / SMS / Gestor)
- [ ] Dashboard Diretoria: score geral, passivo trabalhista, ROI preventivo
- [ ] Dashboard RH: absenteísmo por CID, turnover, burnout, clima
- [ ] Dashboard SMS/SST: conformidade técnica, matriz, próximas revisões
- [ ] Dashboard Gestores: equipe, fadiga, ações pendentes, recomendações IA

### Sprint 4.2 — Expansão do Agente IA (MOD-08)
**Estimativa:** 20h  
**Entregáveis:**
- [ ] Implementar novos prompts pré-configurados (análise burnout, relatório Portaria 1.419, recomendações para gestores)
- [ ] Integrar alertas automáticos baseados em thresholds configuráveis
- [ ] Análise de cluster de saúde mental (agrupamento de CIDs por setor)
- [ ] Sugestões de intervenção baseadas no Guia MTE 2025 (seção 7)

### Sprint 4.3 — Exportação e Dossiê Completo
**Estimativa:** 16h  
**Entregáveis:**
- [ ] Dossiê completo NR-1 com seção psicossocial integrada
- [ ] Relatório de conformidade com Portaria MTE 1.419/2024
- [ ] Relatório de evidências de processo participativo
- [ ] Exportação de matriz de risco psicossocial para PDF

---

**Resultado da Fase 4:** Conformidade com Guia MTE sobe de **89% → ~95%**

---

## RESUMO DO ROADMAP

| Fase | Duração | Esforço | Gaps Fechados | Conformidade Resultante |
|------|---------|---------|--------------|------------------------|
| Baseline (v2 atual) | — | — | — | 43% |
| Fase 1 — Legal Crítica | 3 semanas | ~70h | 7 gaps críticos | ~65% |
| Fase 2 — Avaliação Completa | 4 semanas | ~90h | 9 gaps altos | ~78% |
| Fase 3 — Clima e Participação | 4 semanas | ~90h | 9 gaps médios | ~89% |
| Fase 4 — Dashboards e IA | 3 semanas | ~70h | 5 gaps restantes | ~95% |
| **TOTAL** | **~14 semanas** | **~320h** | **30 gaps** | **~95%** |

---

## DEPENDÊNCIAS ENTRE FASES

```
FASE 1 ──────────────────────────────────────────────────────►
  └── Critérios GRO (1.3) ──► necessário para FASE 2 Sprint 2.1
  └── Campos Inventário (1.2) ──► necessário para FASE 3 Sprint 3.4 (heatmap)

FASE 2 ──────────────────────────────────────────────────────►
  └── COPSOQ (2.1) ──► alimenta dashboards da FASE 4
  └── Saúde Mental (2.2) ──► alimenta Dashboard RH da FASE 4
  └── Canal Denúncia (2.5) ──► complementa Fase 3 Sprint 3.3

FASE 3 ──────────────────────────────────────────────────────►
  └── Clima (3.1) + Liderança (3.2) ──► alimentam Dashboard Diretoria/Gestores da FASE 4
  └── PDCA (3.5) ──► necessário para Dossiê completo da FASE 4
```

---

## ESTIMATIVA DE ESFORÇO POR PERFIL DE DESENVOLVEDOR

| Perfil | Fases | Estimativa |
|--------|-------|-----------|
| Dev Frontend (HTML/CSS/JS) | 1, 2, 3, 4 | ~260h |
| Dev Backend/API (se necessário) | 2, 4 | ~40h |
| UX/UI Designer | 2, 3, 4 | ~20h |
| Especialista SST (revisão) | 1, 2, 3 | ~20h |
| **TOTAL** | | **~320h** |

---

## MARCOS (MILESTONES)

| Marco | Data Estimada | Entregável |
|-------|-------------|-----------|
| M1 — Fase 1 concluída | 29/06/2026 | 7 gaps críticos fechados, conformidade ≥ 65% |
| M2 — Fase 2 concluída | 27/07/2026 | Questionários implementados, Canal de Denúncia ativo |
| M3 — Fase 3 concluída | 24/08/2026 | Clima, liderança e participação operacionais |
| M4 — Fase 4 concluída | 14/09/2026 | Dashboards executivos e IA expandida |
| M5 — Homologação completa | 21/09/2026 | ErgoSense v3 em produção, conformidade ≥ 89% |
