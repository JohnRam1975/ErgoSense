# Roadmap de Ajustes Futuros — ErgoSensePro
**Data:** 08/06/2026 | Baseado na análise de gap vs. Guia MTE 2025

---

## Estado atual (v3.0)

- **Conformidade MTE:** ~65% (Fase 1 do plano de adequação)
- **Build:** ✓ sem erros TypeScript
- **Módulos integrados:** 7 telas psicossociais + todos os módulos existentes

---

## Fase 2 — Backend e dados reais (estimativa: 8 semanas)

### 2.1 API de Questionários
- Endpoint `POST /api/psicossocial/resposta` para salvar respostas anonimizadas
- Agregação server-side (mínimo 5 respondentes antes de expor dados)
- Validação LGPD: sem campos identificadores nas respostas psicossociais
- Implementar HSE Management Standards (35 questões, 7 dimensões)

### 2.2 Persistência do Plano de Ação
- Conectar `psicossocial-plano` ao backend existente de planos de ação
- Gatilho automático: ao concluir ação → alerta de revisão do inventário (NR-1 §1.5.4.4.6)
- Campo "histórico de revisões" no inventário psicossocial

### 2.3 Módulo Canal de Denúncia
- Implementar como tela React separada (`denuncia-canal`, `denuncia-lista`, `denuncia-detalhe`)
- Garantir anonimato: sem IP, sem cookie, sem fingerprint
- Fluxo investigatório: Recebida → Em Investigação → Concluída
- Vincular conclusão de denúncia ao plano de ação

### 2.4 Critérios GRO documentados (NR-1 §1.5.4.4.2.2)
- Tela de configuração de critérios de severidade × probabilidade
- Exportação do documento de critérios (PDF/JSON)
- Visibilidade para Inspeção do Trabalho

**Conformidade estimada após Fase 2:** ~78%

---

## Fase 3 — Participação e processo (estimativa: 4 semanas)

### 3.1 Módulo de Participação CIPA/Trabalhadores
- Registro de participantes por etapa do GRO (Guia MTE Passo 2°)
- Campo "Equipe GRO" com SESMT, gestores, trabalhadores, CIPA
- Comunicação formal com trabalhadores antes da avaliação (Guia MTE Passo 4°)

### 3.2 Ciclo PDCA Documentado
- Registro de ciclos PDCA para riscos psicossociais
- Integração com plano de ação: marco "Verificação periódica de eficácia"
- Relatório de melhoria contínua (ISO 45003 §8.5)

### 3.3 Módulo de Clima Organizacional
- NPS interno por setor
- Pesquisa de satisfação com anonimato garantido
- Histórico de tendência temporal

### 3.4 Dashboard por Perfil
- Perfil Diretoria: score único + passivo estimado + ROI preventivo
- Perfil RH: indicadores CID (F32, F41, F43, Z73) + burnout por setor
- Perfil Gestor: indicadores da equipe + recomendações IA
- Perfil SMS: inventário completo + conformidade auditável

**Conformidade estimada após Fase 3:** ~89%

---

## Fase 4 — Excelência operacional (estimativa: 4 semanas)

### 4.1 Relatórios de Conformidade Exportáveis
- PGR psicossocial completo (PDF) com todos os 13 fatores
- Dossiê de conformidade MTE (NR-1 + ISO 45003 + Guia MTE)
- Relatório de liderança com scores de avaliação

### 4.2 Módulo de Liderança
- Avaliação de qualidade de liderança (dimensão COPSOQ-III)
- Feedback estruturado para gestores
- Plano de desenvolvimento de liderança

### 4.3 Integração com Módulo Ergonômico
- Vincular avaliação psicossocial ao inventário ergonômico existente
- Campo (h) do inventário NR-1: dados AEP vinculados a riscos psicossociais
- Probabilidade psicossocial: exigências da atividade × eficácia de medidas (§1.5.4.4.5.3)

### 4.4 AEP expandida (NR-17 §17.1.1.1)
- Seção organização do trabalho na AEP:
  - Normas de produção (metas, cotas)
  - Modo operatório
  - Exigências de tempo
  - Monotonia e repetitividade
  - Jornadas e pausas

**Conformidade estimada após Fase 4:** ~95%

---

## Débitos técnicos identificados

| Item | Prioridade | Esforço |
|------|-----------|---------|
| Code splitting (chunk > 500 kB) | Baixa | 4h — usar `React.lazy()` + `Suspense` para V2Screens e PsicossocialScreens |
| Testes unitários para PsicossocialScreens | Média | 8h — Vitest + React Testing Library |
| Storybook para componentes psicossociais | Baixa | 4h |
| Acessibilidade (ARIA labels nas telas psicossociais) | Média | 4h |
| i18n (PT-BR completo) | Baixa | 6h |

---

## Refatorações futuras recomendadas

1. **Extrair dados demo** de `PsicossocialScreens.tsx` para `src/data/psicossocialData.ts`
2. **Criar tipos compartilhados** `PsicossocialFator`, `MatrizRisco`, `AcaoPsico` em `src/types/psicossocial.ts`
3. **Hook `usePsicossocial()`** para encapsular estado e lógica dos módulos psicossociais
4. **Separar telas** grandes em arquivos individuais quando ultrapassarem 300 linhas cada
