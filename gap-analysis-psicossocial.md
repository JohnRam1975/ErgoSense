# GAP ANALYSIS — Fatores de Riscos Psicossociais
## ErgoSense v2 × Guia MTE 2025 (Portaria MTE nº 1.419/2024)
**Data:** 08/06/2026 | **Referências:** NR-1, NR-17, ISO 45003:2021, Guia MTE 2025

---

## LEGENDA DE CLASSIFICAÇÃO

| Cor | Prioridade | Critério |
|-----|-----------|---------|
| 🔴 CRÍTICO | Exigência legal direta, ausência implica autuação fiscal | Portaria MTE 1.419/2024, NR-1 capítulo 1.5 |
| 🟠 ALTO | Impacta significativamente a conformidade e expõe a empresa a risco legal | ISO 45003, NR-17, Guia MTE |
| 🟡 MÉDIO | Boa prática essencial para eficácia do programa | ISO 45001, melhores práticas internacionais |
| 🟢 BAIXO | Melhoria incremental, diferencial competitivo | Recomendações setoriais |

---

## BLOCO 1 — REQUISITOS LEGAIS DIRETOS (NR-1 / PORTARIA 1.419/2024)

### GAP-001 🔴 CRÍTICO
**Requisito:** Inclusão formal dos fatores de risco psicossociais no GRO/PGR (subitem 1.5.3.1.4 da NR-1)  
**Status no ErgoSense:** PARCIAL — os fatores aparecem no Inventário e no módulo Psicossocial, mas **não há integração formal e documentada entre avaliação psicossocial e o GRO/PGR**  
**Lacuna:** O sistema não gera automaticamente a seção psicossocial dentro do documento PGR. A conexão é feita manualmente pelo usuário.  
**Impacto legal:** Autuação pela Inspeção do Trabalho por ausência de integração formal  
**Módulos impactados:** Psicossocial, Documentos, Conformidade  
**Ação requerida:** Criar fluxo automático que insere resultados da avaliação psicossocial diretamente no PGR/Inventário de riscos

---

### GAP-002 🔴 CRÍTICO
**Requisito:** Listagem exemplificativa completa de fatores psicossociais do Guia MTE 2025  
**Status no ErgoSense:** PARCIAL — o sistema cobre apenas 5 dos 13 fatores da listagem oficial do Guia MTE  
**Fatores do Guia MTE presentes no ErgoSense:**
- ✅ Excesso de demandas (sobrecarga)
- ✅ Assédio de qualquer natureza
- ✅ Baixo controle/Falta de autonomia
- ✅ Más relações no local de trabalho
- ✅ Trabalho remoto e isolado

**Fatores do Guia MTE AUSENTES no ErgoSense:**
- ❌ Má gestão de mudanças organizacionais → Transtorno mental / DORT
- ❌ Baixa clareza de papel/função → Transtorno mental
- ❌ Baixas recompensas e reconhecimento (reconhecimento existe, mas sem vinculação ao Guia MTE)
- ❌ Falta de suporte/apoio no trabalho
- ❌ Baixa justiça organizacional (existe como dado, mas sem mapeamento de consequência legal)
- ❌ Eventos violentos ou traumáticos → Transtorno mental
- ❌ Baixa demanda no trabalho (subcarga) → Transtorno mental
- ❌ Trabalho em condições de difícil comunicação → Transtorno mental

**Impacto legal:** Inventário de riscos incompleto — autuável conforme subitem 1.5.7.3.2  
**Módulos impactados:** Psicossocial, Inventário de Riscos  
**Ação requerida:** Adicionar todos os 13 fatores do Guia MTE na tabela de fatores psicossociais e no formulário de identificação da AEP

---

### GAP-003 🔴 CRÍTICO
**Requisito:** Inventário de riscos com conteúdo mínimo do subitem 1.5.7.3.2 (NR-1) para riscos psicossociais  
**Status no ErgoSense:** PARCIAL — a estrutura da tabela existe, mas os campos obrigatórios (c, d, e, f, g, h, i) não são preenchidos automaticamente para riscos psicossociais  
**Campos ausentes ou incompletos para fatores psicossociais:**
- ❌ (c) Descrição dos perigos com identificação das fontes/circunstâncias → campo existe mas sem template psicossocial
- ❌ (g) Caracterização da exposição dos trabalhadores (duração, frequência, intensidade)
- ❌ (h) Dados da avaliação de ergonomia nos termos da NR-17 vinculados ao psicossocial
- ❌ (i) Avaliação dos riscos com classificação para fins de elaboração do plano de ação (metodologia documentada)

**Impacto legal:** Inventário autuável por incompletude  
**Módulos impactados:** Inventário de Riscos, AEP, Documentos  
**Ação requerida:** Expandir campos do inventário para fatores psicossociais com templates pré-preenchidos

---

### GAP-004 🔴 CRÍTICO
**Requisito:** Critérios de avaliação de risco documentados expressamente (subitem 1.5.4.4.2.2 da NR-1)  
**Status no ErgoSense:** NÃO ATENDIDO — o sistema mostra conformidade 92% na NR-1, mas o checklist marca como "concluído" o item "Critérios de avaliação documentados (1.5.4.4.2.2)" sem haver um documento/tela que realmente apresente e permita configurar esses critérios  
**Lacuna:** Não existe tela de configuração de critérios de Severidade × Probabilidade por tipo de risco  
**Impacto legal:** Impossibilidade de comprovar critérios à Inspeção do Trabalho  
**Módulos impactados:** Conformidade, Inventário de Riscos  
**Ação requerida:** Criar módulo "Critérios GRO" com configuração de matriz de risco e geração de documento

---

### GAP-005 🔴 CRÍTICO
**Requisito:** Probabilidade de riscos ergonômicos/psicossociais deve considerar exigências da atividade de trabalho e eficácia das medidas de prevenção (subitem 1.5.4.4.5.3 da NR-1)  
**Status no ErgoSense:** NÃO ATENDIDO — a calculadora de risco calcula apenas momento de força físico (carga × distância × frequência). Não há cálculo de probabilidade para fatores psicossociais.  
**Lacuna:** Ausência de metodologia de cálculo de probabilidade psicossocial  
**Impacto legal:** Avaliação de risco psicossocial não documentada metodologicamente  
**Módulos impactados:** AEP, Inventário de Riscos  
**Ação requerida:** Implementar calculadora de risco psicossocial (Severidade × Probabilidade com critérios qualitativos)

---

### GAP-006 🔴 CRÍTICO
**Requisito:** Revisão do inventário após implementação de medidas de prevenção (subitem 1.5.4.4.6 da NR-1)  
**Status no ErgoSense:** SINALIZADO MAS NÃO IMPLEMENTADO — o checklist na Conformidade marca como "pendente" a "Revisão do inventário após medidas (1.5.4.4.6)", mas não há workflow automatizado para isso  
**Lacuna:** Ausência de gatilho automático para revisão quando uma ação é concluída no plano  
**Impacto legal:** Manutenção de riscos desatualizados no inventário  
**Módulos impactados:** Plano de Ação, Inventário de Riscos  
**Ação requerida:** Criar automação: quando ação é marcada "Concluída" → alerta para revisar risco correspondente no inventário

---

### GAP-007 🔴 CRÍTICO
**Requisito:** Comunicação formal e transparente aos trabalhadores sobre o processo de identificação e avaliação de riscos psicossociais (Guia MTE 2025, passo 4°)  
**Status no ErgoSense:** SINALIZADO MAS NÃO IMPLEMENTADO — o checklist marca "Comunicação formal aos trabalhadores" como pendente, mas não há módulo de comunicação  
**Lacuna:** Nenhum mecanismo de comunicação com trabalhadores além do envio de questionário  
**Impacto legal:** Não demonstração de participação dos trabalhadores no processo GRO  
**Módulos impactados:** Colaboradores, Conformidade  
**Ação requerida:** Implementar módulo de comunicação com registro de ciência (assinatura eletrônica ou confirmação)

---

## BLOCO 2 — ORGANIZAÇÃO DO TRABALHO E JORNADAS

### GAP-008 🟠 ALTO
**Requisito:** Avaliação de condições de organização do trabalho (NR-17, item 17.1.1.1) incluindo: normas de produção, modo operatório, exigências de tempo, determinação do conteúdo do trabalho, monotonia, ritmo de trabalho, jornadas  
**Status no ErgoSense:** PARCIAL — a AEP menciona "Fatores psicossociais (organização do trabalho)" como item do checklist, mas sem formulário estruturado para capturar esses aspectos  
**Lacuna:** Campos específicos de jornada, ritmo, monotonia, pressão por tempo ausentes  
**Impacto:** NR-17 não plenamente atendida para organização do trabalho  
**Módulos impactados:** AEP, Psicossocial  
**Ação requerida:** Expandir formulário AEP com seção "Organização do trabalho" alinhada ao item 17.1.1.1 da NR-17

---

### GAP-009 🟠 ALTO
**Requisito:** Avaliação de subcarga de trabalho (baixa demanda) — fator de risco psicossocial listado explicitamente no Guia MTE 2025  
**Status no ErgoSense:** NÃO ATENDIDO — o sistema foca exclusivamente em sobrecarga. Não há avaliação de subcarga/monotonia/falta de desafio  
**Lacuna:** Fator de risco oficialmente listado ausente do sistema  
**Impacto:** Inventário de riscos incompleto  
**Módulos impactados:** Psicossocial, Inventário  
**Ação requerida:** Adicionar item "Subcarga de trabalho / monotonia" nos questionários e no inventário

---

### GAP-010 🟠 ALTO
**Requisito:** Avaliação de "trabalho em condições de difícil comunicação" — fator de risco psicossocial listado no Guia MTE 2025  
**Status no ErgoSense:** NÃO ATENDIDO  
**Lacuna:** Sem avaliação de condições de comunicação no trabalho  
**Impacto:** Inventário incompleto  
**Módulos impactados:** Psicossocial  
**Ação requerida:** Incluir dimensão "Comunicação organizacional" nos questionários psicossociais

---

### GAP-011 🟠 ALTO
**Requisito:** Avaliação de "má gestão de mudanças organizacionais" — fator de risco psicossocial listado no Guia MTE 2025  
**Status no ErgoSense:** NÃO ATENDIDO  
**Lacuna:** Ausência completa de avaliação de mudanças organizacionais  
**Impacto:** Inventário incompleto, especialmente relevante em contextos de reestruturação  
**Módulos impactados:** Psicossocial, Inventário  
**Ação requerida:** Adicionar dimensão "Gestão de mudanças" no módulo psicossocial

---

### GAP-012 🟠 ALTO
**Requisito:** Avaliação de "baixa clareza de papel/função" — fator de risco psicossocial listado no Guia MTE 2025  
**Status no ErgoSense:** NÃO ATENDIDO  
**Lacuna:** Sem avaliação de ambiguidade de papel, conflito de função  
**Módulos impactados:** Psicossocial  
**Ação requerida:** Incluir dimensão "Clareza de papel/função" nos questionários

---

## BLOCO 3 — VIOLÊNCIA E ASSÉDIO OCUPACIONAL

### GAP-013 🟠 ALTO
**Requisito:** Avaliação de "eventos violentos ou traumáticos" — fator listado no Guia MTE 2025  
**Status no ErgoSense:** NÃO ATENDIDO — o sistema tem "Assédio moral" mas não cobre violência ocupacional (física, psicológica de terceiros, exposição a eventos traumáticos)  
**Lacuna:** Ausência de avaliação de violência ocupacional de terceiros e eventos traumáticos  
**Impacto:** Especialmente crítico para setores de saúde, atendimento ao público, segurança  
**Módulos impactados:** Psicossocial, Inventário  
**Ação requerida:** Adicionar categoria "Violência ocupacional e eventos traumáticos" nos módulos

---

### GAP-014 🟠 ALTO
**Requisito:** Canal de denúncia formal para assédio (sinalizado no plano de ação, mas não implementado como módulo)  
**Status no ErgoSense:** SINALIZADO — "Investigação de assédio — canal denúncia" aparece como medida no módulo Psicossocial, mas não existe módulo de canal de denúncia  
**Lacuna:** Sem sistema de registro, acompanhamento e investigação de casos de assédio  
**Módulos impactados:** Psicossocial, Plano de Ação  
**Ação requerida:** Implementar módulo "Canal de Denúncia" com fluxo de investigação e acompanhamento

---

## BLOCO 4 — PARTICIPAÇÃO DOS TRABALHADORES E CIPA

### GAP-015 🟠 ALTO
**Requisito:** Envolvimento da CIPA no processo de identificação e avaliação de riscos psicossociais (Guia MTE 2025, passo 2° — art. 5.3.1 da NR-5)  
**Status no ErgoSense:** NÃO ATENDIDO — não há nenhuma referência à CIPA na plataforma  
**Lacuna:** Sem módulo ou registro de participação da CIPA  
**Impacto legal:** NR-5 obriga envolvimento da CIPA no GRO  
**Módulos impactados:** Conformidade, Psicossocial  
**Ação requerida:** Criar campo de "Participação da CIPA" no processo GRO e nos formulários de avaliação

---

### GAP-016 🟠 ALTO
**Requisito:** Participação dos trabalhadores em todas as etapas: identificação, avaliação, adoção de medidas e acompanhamento (Guia MTE 2025 — seções 4 e 5)  
**Status no ErgoSense:** NÃO RASTREADO — o sistema envia questionários (participação na avaliação) mas não registra participação nas etapas de identificação de perigos, definição de medidas e acompanhamento  
**Lacuna:** Sem registro de evidências de participação dos trabalhadores  
**Impacto:** Impossibilidade de demonstrar processo participativo à Inspeção do Trabalho  
**Módulos impactados:** AEP, Plano de Ação, Conformidade  
**Ação requerida:** Adicionar campos de "Participantes" e assinaturas/confirmações nas etapas do GRO

---

## BLOCO 5 — SAÚDE MENTAL E INDICADORES DE ADOECIMENTO

### GAP-017 🟡 MÉDIO
**Requisito:** Acompanhamento de saúde dos trabalhadores incluindo: registro de afastamentos por transtorno mental, CAT (Comunicação de Acidente de Trabalho), indicadores do PCMSO (Guia MTE 2025, seção 3 — preparação)  
**Status no ErgoSense:** PARCIAL — afastamentos/mês aparecem como KPI no dashboard, mas sem discriminação por CID, especialmente transtornos mentais (F32, F41, F43)  
**Lacuna:** Sem discriminação de afastamentos por categoria de CID, sem integração com PCMSO  
**Módulos impactados:** Dashboard, Colaboradores  
**Ação requerida:** Adicionar campo de CID nos afastamentos e criar indicadores específicos para saúde mental

---

### GAP-018 🟡 MÉDIO
**Requisito:** Rastreamento de burnout (esgotamento ocupacional — CID Z73.0/F43.0) como consequência de fatores psicossociais  
**Status no ErgoSense:** IMPLÍCITO — "sobrecarga" e "equilíbrio vida-trabalho" são avaliados, mas sem instrumento específico de rastreamento de burnout  
**Lacuna:** Sem escala de burnout (MBI, Oldenburg, Copenhagen Burnout Inventory)  
**Módulos impactados:** Psicossocial  
**Ação requerida:** Incluir dimensão "Burnout/Esgotamento" com escala validada nos questionários

---

### GAP-019 🟡 MÉDIO
**Requisito:** Rastreamento de fadiga ocupacional (mencionada no Guia MTE como consequência de trabalho remoto isolado)  
**Status no ErgoSense:** NÃO ATENDIDO — fadiga aparece apenas como texto na consequência de "trabalho remoto isolado"  
**Lacuna:** Sem avaliação específica de fadiga (física e mental)  
**Módulos impactados:** Psicossocial, AEP  
**Ação requerida:** Incluir dimensão "Fadiga" nos questionários e na avaliação ergonômica

---

### GAP-020 🟡 MÉDIO
**Requisito:** Indicadores de absenteísmo por saúde mental para uso no processo de preparação do GRO  
**Status no ErgoSense:** PARCIAL — existe o KPI "Afastamentos/Mês" mas sem discriminação por causa  
**Lacuna:** Sem análise de causas de absenteísmo por categoria (saúde mental, musculoesquelético, outros)  
**Módulos impactados:** Dashboard, Colaboradores  
**Ação requerida:** Categorizar afastamentos e criar dashboard de saúde mental com tendências

---

## BLOCO 6 — CLIMA ORGANIZACIONAL E LIDERANÇA

### GAP-021 🟡 MÉDIO
**Requisito:** Avaliação de suporte/apoio no trabalho — incluindo apoio da liderança e dos colegas (Guia MTE 2025, "Falta de suporte/apoio no trabalho")  
**Status no ErgoSense:** PARCIAL — "Apoio da liderança" existe como fator no módulo Psicossocial, mas sem avaliação estruturada de gestores e sem avaliação de apoio de pares  
**Lacuna:** Sem avaliação 360° de liderança, sem avaliação de apoio horizontal entre colegas  
**Módulos impactados:** Psicossocial  
**Ação requerida:** Expandir avaliação de suporte para incluir liderança direta, pares e alta gestão

---

### GAP-022 🟡 MÉDIO
**Requisito:** Pesquisa de clima organizacional como ferramenta de identificação de fatores psicossociais  
**Status no ErgoSense:** NÃO ATENDIDO — o sistema tem avaliações psicossociais pontuais, mas sem módulo de clima organizacional contínuo  
**Lacuna:** Sem índice de satisfação, engajamento e clima por equipe/setor  
**Módulos impactados:** Psicossocial (extensão necessária)  
**Ação requerida:** Criar módulo "Clima Organizacional" com pesquisas periódicas e benchmarking

---

### GAP-023 🟡 MÉDIO
**Requisito:** Avaliação de "falta de suporte/apoio no trabalho" como fator de risco independente (Guia MTE)  
**Status no ErgoSense:** PARCIAL — mesclado com "Apoio da liderança"  
**Lacuna:** Sem avaliação de suporte técnico, de recursos, de suporte social no trabalho  
**Módulos impactados:** Psicossocial  
**Ação requerida:** Separar avaliações de apoio da liderança, apoio técnico/recursos e apoio dos colegas

---

## BLOCO 7 — DOCUMENTAÇÃO E MELHORIA CONTÍNUA

### GAP-024 🟡 MÉDIO
**Requisito:** Melhoria contínua documentada — processo PDCA para riscos psicossociais (subitem 1.5.3.4 da NR-1 e ISO 45003)  
**Status no ErgoSense:** NÃO INICIADO — checklist da Conformidade ISO 45003 marca "Melhoria contínua documentada — não iniciado"  
**Lacuna:** Sem ciclo PDCA documentado para o programa psicossocial  
**Módulos impactados:** Conformidade, Documentos  
**Ação requerida:** Implementar registro de ciclos PDCA para cada fator psicossocial avaliado

---

### GAP-025 🟡 MÉDIO
**Requisito:** Processo multidisciplinar e multiprofissional no GRO para fatores psicossociais (Guia MTE 2025 — seção 3)  
**Status no ErgoSense:** PARCIAL — marcado como "processo multidisciplinar — parcial" na Conformidade  
**Lacuna:** Sem registro formal de equipe multidisciplinar, sem atribuição de responsabilidades documentada  
**Módulos impactados:** Conformidade, Documentos  
**Ação requerida:** Adicionar seção "Equipe GRO" com registro de responsáveis por área

---

### GAP-026 🟡 MÉDIO
**Requisito:** Verificação periódica da eficácia das medidas de prevenção com participação dos trabalhadores (Guia MTE 2025 — seção 5)  
**Status no ErgoSense:** NÃO IMPLEMENTADO — o sistema tem plano de ação, mas sem mecanismo de verificação de eficácia das medidas  
**Lacuna:** Sem indicadores de eficácia pós-implementação  
**Módulos impactados:** Plano de Ação  
**Ação requerida:** Adicionar campo "Avaliação de eficácia" no plano de ação com ciclo de revisão

---

## BLOCO 8 — FERRAMENTAS E METODOLOGIA

### GAP-027 🟢 BAIXO
**Requisito:** Ferramenta de avaliação deve ser "adequada ao risco ou circunstância em avaliação" e "cientificamente fundamentada" (subitem 1.5.4.4.2.1 da NR-1 e Guia MTE)  
**Status no ErgoSense:** PARCIAL — o sistema lista as metodologias (COPSOQ, HSE, ERI, JSS) mas sem implementar as perguntas validadas de nenhuma delas  
**Lacuna:** Questionários não implementados — apenas seleção de nome da metodologia  
**Módulos impactados:** Psicossocial  
**Ação requerida:** Implementar ao menos as perguntas do COPSOQ-III (versão curta) ou HSE Management Standards

---

### GAP-028 🟢 BAIXO
**Requisito:** Avaliação qualitativa do risco com descrição da atividade real (não prescrita) — destaque no Guia MTE 2025  
**Status no ErgoSense:** PARCIAL — campo existe na AEP ("Descrição da atividade real"), mas sem estrutura para capturar todos os aspectos qualitativos (frequência, intensidade, duração de exposição psicossocial)  
**Lacuna:** Caracterização da exposição incompleta para fatores psicossociais  
**Módulos impactados:** AEP  
**Ação requerida:** Expandir formulário AEP para capturar caracterização completa da exposição psicossocial

---

### GAP-029 🟢 BAIXO
**Requisito:** Geração de heatmap de risco (Probabilidade × Impacto) por setor e equipe  
**Status no ErgoSense:** NÃO ATENDIDO — existe ranking de riscos por setor (barras), mas sem matriz visual  
**Lacuna:** Sem heatmap interativo de risco psicossocial  
**Módulos impactados:** Dashboard, Inventário  
**Ação requerida:** Implementar heatmap 5×5 de Probabilidade × Severidade

---

### GAP-030 🟢 BAIXO
**Requisito:** Dashboards executivos segmentados por público (Diretoria, RH, SMS, Gestores)  
**Status no ErgoSense:** NÃO ATENDIDO — existe um único dashboard com visão de SMS/SST  
**Lacuna:** Sem dashboards por perfil de usuário  
**Módulos impactados:** Dashboard  
**Ação requerida:** Criar views executivas para Diretoria, RH, SMS e Gestores

---

## RESUMO QUANTITATIVO DOS GAPS

| Classificação | Quantidade | % do Total |
|--------------|-----------|-----------|
| 🔴 CRÍTICO | 7 | 23% |
| 🟠 ALTO | 9 | 30% |
| 🟡 MÉDIO | 10 | 33% |
| 🟢 BAIXO | 4 | 13% |
| **TOTAL** | **30** | **100%** |

---

## ÍNDICE DE CONFORMIDADE ATUAL vs. PROJETADO

### Conformidade atual estimada com o Guia MTE 2025
| Domínio | Atendido | Parcial | Não Atendido | Score |
|---------|---------|---------|-------------|-------|
| Integração formal no GRO/PGR | 0% | 80% | 20% | 40% |
| Cobertura de fatores psicossociais | 38% | 15% | 47% | 46% |
| Inventário NR-1 (1.5.7.3.2) | 60% | 30% | 10% | 75% |
| Processo participativo | 10% | 30% | 60% | 25% |
| Comunicação com trabalhadores | 20% | 0% | 80% | 20% |
| Melhoria contínua (PDCA) | 0% | 40% | 60% | 20% |
| Documentação | 60% | 30% | 10% | 75% |
| Ferramentas validadas | 20% | 50% | 30% | 45% |

### **CONFORMIDADE GERAL ATUAL: ~43%**
### **CONFORMIDADE PROJETADA APÓS IMPLEMENTAÇÃO: ~89%**

---

## RISCOS LEGAIS IDENTIFICADOS

| Risco | Probabilidade | Impacto | Fundamentação |
|-------|--------------|---------|---------------|
| Autuação por inventário de riscos incompleto | ALTA | ALTO | NR-1, 1.5.7.3.2 + Portaria 1.419/2024 |
| Autuação por ausência de critérios documentados de avaliação | ALTA | ALTO | NR-1, 1.5.4.4.2.2 |
| Ação trabalhista por assédio sem canal de denúncia | MÉDIA | CRÍTICO | CLT + jurisprudência TST |
| Ação civil por dano existencial (burnout não gerenciado) | MÉDIA | ALTO | STJ Súmula 37 (danos extrapatrimoniais) |
| Embargo/interdição por condição de trabalho degradante | BAIXA | CRÍTICO | NR-1 + Lei 6.514/77 |
| Passivo previdenciário por adoecimento mental sem registro | MÉDIA | MÉDIO | Lei 8.213/91 + Decreto 3.048/99 |
