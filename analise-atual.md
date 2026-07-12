# ERGOSENSE — Análise do Estado Atual da Plataforma
**Versão analisada:** ergosense_platform_v2.html  
**Data da análise:** 08/06/2026  
**Analista:** Claude (Engenheiro de Software Sênior + Especialista SST/NR-01/ISO 45003)

---

## 1. VISÃO GERAL DA PLATAFORMA

O ErgoSense é uma plataforma web de gestão de Ergonomia e Riscos Psicossociais voltada ao cumprimento da NR-1 (GRO/PGR), NR-17 e ISO 45003. É uma aplicação single-page (SPA) em HTML/CSS/JS puro, com navegação por módulos via sidebar.

**Perfil declarado do usuário logado:** João Silva — SMS/SST  
**Normas referenciadas no cabeçalho:** NR-1 · NR-17 · ISO 45003

---

## 2. MÓDULOS EXISTENTES

### 2.1 Dashboard (page-dash)
- KPIs principais na topbar:
  - Riscos Ativos: 27 (+3 este mês)
  - Ações Concluídas: 41 (78% no prazo)
  - Afastamentos/Mês: 8 (+2 vs mês anterior)
  - Índice Psicossocial: 64/100 (Moderado)
- Gráfico de riscos por setor (barras horizontais): Produção, Almoxarifado, Administrativo, TI/Suporte, RH
- Painel de Conformidade Normativa (mini-barras):
  - NR-1/GRO/PGR: 92%
  - NR-17 Ergonomia: 74%
  - ISO 45001: 81%
  - ISO 45003 Psicossocial: 68%
  - LGPD (dados de saúde): 100%
- Status do Plano de Ação (Concluídas/Em andamento/Abertas/Atrasadas)
- Mini-gráfico de evolução mensal de ações
- Lista de riscos críticos recentes
- Banner de alertas com ação rápida

### 2.2 AEP — Avaliação Ergonômica Preliminar (page-aep)
- Formulário de nova AEP:
  - Seleção de setor/área
  - Posto de trabalho (texto livre)
  - Descrição da atividade real
  - Checklist de fatores avaliados:
    - Postura e movimentos repetitivos ✓
    - Levantamento e transporte manual de carga ✓
    - Vibração (pendente medição) ⚠
    - Iluminação, temperatura e ruído
    - Layout e ferramentas
    - Fatores psicossociais (organização do trabalho)
- Tabela de AEPs recentes com status
- Calculadora de risco ergonômico (momento de força: Peso × Aceleração × Distância × Frequência)
  - Classificação: Baixo (<50 Nm) / Moderado (<150 Nm) / Alto (≥150 Nm)
- Integração via IA para gerar inventário de riscos automaticamente

### 2.3 Psicossocial (page-psicossocial)
- Seleção de metodologia de avaliação:
  - COPSOQ III (Copenhagen)
  - HSE Management Standards
  - ERI — Esforço-Recompensa
  - JSS — Job Stress Scale
  - Questionário próprio
- Envio para toda empresa, setor específico ou equipe
- Garantias ao respondente: anonimato, dados agregados, LGPD
- Painel de resultados da última avaliação (Mai/2026 · 87 respondentes) com 6 fatores:
  - Sobrecarga de trabalho: 78/100 (CRÍTICO)
  - Autonomia: 52/100 (MODERADO)
  - Reconhecimento: 45/100 (MODERADO)
  - Apoio da liderança: 71/100 (OK)
  - Justiça organizacional: 60/100 (MÉDIO)
  - Equilíbrio vida-trabalho: 38/100 (CRÍTICO)
- Tabela de fatores psicossociais identificados com referência NR-1 e Guia MTE 2025:
  - Excesso de demandas (sobrecarga) — Produção — Crítico
  - Assédio moral — Almoxarifado — Crítico
  - Baixa autonomia — TI — Alto
  - Más relações interpessoais — Adm. — Médio
  - Trabalho remoto isolado — TI/RH — Médio
- Integração com Plano de Ação e Documentos

### 2.4 Inventário de Riscos (page-inventario)
- Tabela completa conforme NR-1 subitem 1.5.7.3.2 com campos:
  - Perigo, Fonte, Grupo exposto, Consequência, Severidade, Probabilidade, Nível, Ação
- Riscos cadastrados: Movimentos repetitivos, Sobrecarga psicossocial, Levantamento de carga, Postura inadequada, Ruído acima do limite, Iluminação deficiente, Assédio moral
- Busca por perigo, setor, cargo
- Integração com IA para geração completa do inventário
- Export para Documentos

### 2.5 Plano de Ação (page-plano)
- Contadores: 9 Abertas / 18 Em andamento / 5 Atrasadas
- Tabela de ações com campos: Ação, Risco relacionado, Responsável, Prazo, Status, Origem
- Status: Aberto / Em andamento / Atrasado
- Ações: Pausas obrigatórias, Treinamento ergonomia, Cadeiras reguláveis, Investigação de assédio, Redistribuição de carga, Retrofit iluminação, Proteção contra ruído
- Botão de nova ação e exportação

### 2.6 Colaboradores (page-colaboradores)
- Tabela com: Nome, Matrícula, Cargo/Função, Setor, Turno, Admissão, Status, Riscos
- Status disponíveis: Ativo, Afastado, Férias
- Busca por nome, matrícula, CPF, setor
- Link para riscos do setor e psicossocial por colaborador

### 2.7 Documentos (page-documentos)
- Cards de documentos automáticos:
  - AEP — Avaliação Ergonômica Preliminar (4 documentos)
  - Relatório Psicossocial (Mai/2026)
  - Inventário de Riscos NR-1 (atualização necessária)
  - Plano de Ação PGR (05/06/2026)
  - Dossiê NR-1
  - Dossiê NR-17 Ergonomia
- Geração de dossiê completo via IA

### 2.8 Conformidade (page-conformidade)
- Checklists detalhados por norma:
  - NR-1/GRO/PGR: 6 itens verificados (92%)
  - NR-17 Ergonomia: 5 itens (74%)
  - ISO 45003: 4 itens (68%)
- Timeline de recomendações geradas por IA
- Indicadores visuais (verde/amarelo/vermelho)

### 2.9 Auditoria (page-auditoria)
- Trilha de auditoria com: Data/hora, Usuário, Ação, Módulo, IP
- Filtro por usuário, ação ou módulo
- Histórico das últimas ações do sistema

---

## 3. FUNCIONALIDADES DE IA EXISTENTES

| Trigger | Prompt enviado | Módulo |
|---------|---------------|--------|
| Botão "IA · Gerar relatório" (topbar) | Relatório completo de conformidade NR-1/NR-17 | Global |
| Botão "IA · Gerar inventário" (AEP) | Analisar fatores ergonômicos e psicossociais e gerar inventário com grau de risco, severidade e recomendações NR-1/NR-17 | AEP |
| Botão "IA · Recomendar" (Psicossocial) | Analisar resultados psicossociais e recomendar intervenções NR-1/NR-17/ISO 45003 | Psicossocial |
| Botão "IA · Gerar completo" (Inventário) | Gerar inventário no formato NR-1 subitem 1.5.7.3.2 | Inventário |
| Botão "IA · Gerar dossiê" (Documentos) | Gerar dossiê NR-1 completo em PDF | Documentos |

---

## 4. INDICADORES EXISTENTES

| Indicador | Onde aparece | Tipo |
|-----------|-------------|------|
| Riscos Ativos (total) | Dashboard KPI | Número |
| Ações Concluídas | Dashboard KPI | Número + % no prazo |
| Afastamentos/Mês | Dashboard KPI | Número + tendência |
| Índice Psicossocial | Dashboard KPI | Escala 0-100 |
| Conformidade NR-1 | Dashboard + Conformidade | % + barra |
| Conformidade NR-17 | Dashboard + Conformidade | % + barra |
| Conformidade ISO 45001 | Dashboard | % + barra |
| Conformidade ISO 45003 | Dashboard | % + barra |
| Conformidade LGPD | Dashboard | % + barra |
| Sobrecarga de trabalho | Psicossocial | Escala 0-100 |
| Autonomia | Psicossocial | Escala 0-100 |
| Reconhecimento | Psicossocial | Escala 0-100 |
| Apoio da liderança | Psicossocial | Escala 0-100 |
| Justiça organizacional | Psicossocial | Escala 0-100 |
| Equilíbrio vida-trabalho | Psicossocial | Escala 0-100 |
| Momento de força | Calculadora AEP | Nm (Newtons-metro) |

---

## 5. FORMULÁRIOS EXISTENTES

| Formulário | Campos | Módulo |
|-----------|--------|--------|
| Nova AEP | Setor, Posto de trabalho, Descrição atividade, Checklist fatores | AEP |
| Calculadora ergonômica | Peso da carga, Distância ao corpo, Frequência | AEP |
| Aplicar avaliação psicossocial | Metodologia, Escopo de aplicação | Psicossocial |
| Busca no inventário | Texto livre (perigo/setor/cargo) | Inventário |
| Busca de colaboradores | Nome, matrícula, CPF, setor | Colaboradores |
| Busca na auditoria | Usuário, ação, módulo | Auditoria |

---

## 6. RELATÓRIOS EXISTENTES

| Relatório | Geração | Módulo |
|-----------|---------|--------|
| AEP — Avaliação Ergonômica Preliminar | Automático + IA | Documentos/AEP |
| Relatório Psicossocial (resultados agregados) | Automático | Documentos/Psicossocial |
| Inventário de Riscos NR-1 | Automático + IA | Documentos/Inventário |
| Plano de Ação PGR | Automático | Documentos/Plano |
| Dossiê NR-1 (unificado) | IA | Documentos |
| Dossiê NR-17 Ergonomia | Automático | Documentos/AEP |
| Relatório de conformidade | IA | Global |

---

## 7. FLUXOS EXISTENTES

### Fluxo 1 — Gestão de Risco Ergonômico
`AEP (identificação) → Inventário de Riscos → Plano de Ação → Conformidade`

### Fluxo 2 — Gestão de Risco Psicossocial
`Psicossocial (avaliação) → Inventário de Riscos → Plano de Ação → Documentos`

### Fluxo 3 — Acompanhamento de Conformidade
`Dashboard → Conformidade → Plano de Ação → Documentos`

### Fluxo 4 — Gestão de Colaboradores
`Colaboradores → Riscos por setor → Plano de Ação`

### Fluxo 5 — Auditoria
`Todas as ações do sistema → Trilha de Auditoria`

---

## 8. ARQUITETURA TÉCNICA

| Aspecto | Detalhe |
|---------|---------|
| Tipo | Single-Page Application (SPA) HTML puro |
| Estilização | CSS custom properties (design tokens) |
| Ícones | Tabler Icons (ti-*) |
| Navegação | JavaScript vanilla (nav/navTo functions) |
| Estado | DOM manipulation (classes active/display) |
| IA | Integração via `sendPrompt()` (função não implementada no HTML — aguarda integração com backend) |
| Dados | Estáticos (mock) — sem backend/API visível no arquivo |
| Autenticação | Não visível no arquivo HTML analisado |
| Persistência | Não visível no arquivo HTML analisado |

---

## 9. PONTOS FORTES DO SISTEMA ATUAL

1. Interface limpa e profissional com design system consistente
2. Cobertura das normas NR-1, NR-17, ISO 45001 e ISO 45003 declaradas
3. Módulo psicossocial com múltiplas metodologias (COPSOQ, HSE, ERI, JSS)
4. Anonimato garantido e conformidade LGPD declarada
5. Integração de IA com prompts pré-configurados
6. Trilha de auditoria implementada
7. Calculadora de risco ergonômico funcional
8. Inventário de riscos com estrutura alinhada ao subitem 1.5.7.3.2 da NR-1
9. Fluxo integrado entre módulos (navegação cruzada)
10. Alertas e banners informativos com links de ação rápida

---

## 10. LACUNAS IDENTIFICADAS (RESUMO PRELIMINAR)

> Detalhamento completo no gap-analysis-psicossocial.md

1. **Sem módulo de Saúde Mental** — rastreamento de burnout, fadiga, estresse
2. **Sem avaliação de liderança** — suporte gerencial, comunicação, gestão de conflitos
3. **Sem clima organizacional** — pesquisas anônimas, índice de satisfação/engajamento
4. **Sem módulo CIPA** — obrigatoriedade citada no Guia MTE (art. 5.3.1 NR-5)
5. **Sem gestão de jornadas** — horas extras, pausas, trabalho noturno
6. **Questionários não implementados** — apenas seleção de metodologia, sem perguntas
7. **Dashboards executivos ausentes** — sem visão por Diretoria, RH, SMS, Gestores
8. **Heatmap de risco ausente** — matriz Probabilidade × Impacto visual
9. **Indicadores de absenteísmo/turnover** — presença parcial apenas
10. **Processo participativo não rastreado** — Guia MTE exige envolvimento dos trabalhadores
11. **Comunicação formal aos trabalhadores** — item pendente na conformidade NR-1 (já sinalizado)
12. **Melhoria contínua documentada** — item pendente na ISO 45003 (já sinalizado)
