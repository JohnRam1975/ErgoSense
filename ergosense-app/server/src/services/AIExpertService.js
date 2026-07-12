/**
 * ErgoSense AI Expert — Especialista Virtual em SST e Ergonomia.
 * Orquestra contexto operacional, prompts técnicos e AIProviderService.
 */
import {
  generateText,
  analyzeErgonomics,
  generateRecommendations,
  generateRiskAnalysis,
} from './AIProviderService.js';
import { isProviderConfigured } from '../config/aiConfig.js';
import { assembleTenantContext } from './aiExpertContext.js';
import { logAiExpertAudit } from './aiExpertAudit.js';
import { buildPdfResponse } from './aiExpertPdf.js';
import {
  AI_DISCLAIMER,
  ANALYSIS_LIMITATIONS,
  CONTROL_HIERARCHY,
  EXPERT_SYSTEM_PROMPT,
  NORMS_REFERENCED,
} from './aiExpertConstants.js';

const DEFAULT_MODULES = ['all'];
const MAX_CONTEXT_CHARS = 120_000;

function assertAiAvailable() {
  if (!isProviderConfigured()) {
    throw new Error('Serviço de IA não configurado. Configure AI_PROVIDER e a chave correspondente no .env.');
  }
}

function truncateContext(context) {
  const json = JSON.stringify(context);
  if (json.length <= MAX_CONTEXT_CHARS) return json;
  return `${json.slice(0, MAX_CONTEXT_CHARS)}\n…[contexto truncado por limite de tokens]`;
}

function tryParseJson(text) {
  if (!text) return null;
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function buildTransparency({ dataSources, methodology, limitations = ANALYSIS_LIMITATIONS }) {
  return {
    disclaimer: AI_DISCLAIMER,
    dataSourcesUsed: dataSources,
    methodology,
    normsConsidered: NORMS_REFERENCED,
    controlHierarchy: CONTROL_HIERARCHY,
    limitations,
  };
}

function wrapExpertResponse({
  action,
  provider,
  text,
  structured,
  dataSources,
  methodology,
  extra = {},
}) {
  return {
    action,
    provider,
    disclaimer: AI_DISCLAIMER,
    analysis: structured ?? { narrative: text },
    transparency: buildTransparency({ dataSources, methodology }),
    generatedAt: new Date().toISOString(),
    ...extra,
  };
}

async function runExpertTask({
  tenantId,
  user,
  action,
  taskPrompt,
  modules = DEFAULT_MODULES,
  methodology,
  maxTokens = 4096,
  entityRefs = {},
}) {
  assertAiAvailable();

  const { context, dataSources } = await assembleTenantContext(tenantId, { modules, entityRefs });
  const contextBlock = truncateContext(context);

  const fullPrompt =
    `${taskPrompt}\n\n` +
    '--- DADOS OPERACIONAIS DO ERGOSENSEPRO (JSON) ---\n' +
    contextBlock;

  const { provider, text } = await generateText(fullPrompt, {
    systemPrompt: EXPERT_SYSTEM_PROMPT,
    maxTokens,
  });

  const structured = tryParseJson(text);
  const response = wrapExpertResponse({
    action,
    provider,
    text,
    structured,
    dataSources,
    methodology,
  });

  await logAiExpertAudit({
    tenantId,
    action,
    user,
    prompt: taskPrompt,
    dataSources,
    resultSummary: text?.slice(0, 2000),
    metadata: { provider, hasStructured: Boolean(structured) },
  });

  return response;
}

function sectionsFromStructured(structured, text, sectionMap) {
  if (structured && typeof structured === 'object') {
    return sectionMap.map(({ key, title }) => ({
      title,
      content: structured[key] ?? structured[title] ?? '—',
    }));
  }
  return [{ title: 'Conteúdo', content: text }];
}

/** Análise ergonômica completa com justificativas técnicas. */
export async function analyzeErgonomicData(tenantId, user, options = {}) {
  assertAiAvailable();
  const { context, dataSources } = await assembleTenantContext(tenantId, {
    modules: options.modules ?? ['analises', 'aet', 'org', 'historico'],
    entityRefs: options.entityRefs,
  });

  const extraPrompt = options.prompt?.trim() ? `${options.prompt.trim()}\n\n` : '';

  const result = await analyzeErgonomics({
    ...context,
    focusAreas: [
      'posturas',
      'movimentos repetitivos',
      'levantamento de cargas',
      'organização do trabalho',
      'mobiliário',
      'equipamentos',
      'ambiente',
      'teleatendimento',
      'vibração',
      'fatores psicossociais',
    ],
    instructions:
      extraPrompt +
      'Justifique cada conclusão com percentuais, normas (NR-17, RULA, REBA, OWAS, NIOSH, ISO 11226) e dados observados. ' +
      'Proponha medidas na hierarquia de controles com prioridade, impacto e prazo.',
    options: { maxTokens: 4096, systemPrompt: EXPERT_SYSTEM_PROMPT },
  });

  const structured = tryParseJson(result.text);
  const response = wrapExpertResponse({
    action: 'ANALISE_ERGONOMICA',
    provider: result.provider,
    text: result.text,
    structured,
    dataSources,
    methodology: ['RULA', 'REBA', 'OWAS', 'NIOSH', 'NR-17', 'Análise postural ErgoSensePro'],
  });

  await logAiExpertAudit({
    tenantId,
    action: 'ANALISE_ERGONOMICA',
    user,
    prompt: 'Análise ergonômica integrada',
    dataSources,
    resultSummary: result.text?.slice(0, 2000),
    metadata: { provider: result.provider },
  });

  return response;
}

/** Medidas de controle hierárquicas com justificativa. */
export async function proposeControlMeasures(tenantId, user, options = {}) {
  const taskPrompt =
    'Com base nos dados, elabore medidas de controle ocupacional seguindo a hierarquia: ' +
    `${CONTROL_HIERARCHY.join(' → ')}. ` +
    'Para cada medida inclua: tipo, descrição, justificativa técnica, prioridade, impacto esperado, prazo sugerido e risco vinculado. ' +
    'Retorne JSON: { medidas: [{ tipo, descricao, justificativa, prioridade, impacto, prazo, riscoVinculado }] }.';

  return runExpertTask({
    tenantId,
    user,
    action: 'MEDIDAS_CONTROLE',
    taskPrompt,
    modules: options.modules ?? ['inventario', 'gro', 'pgr', 'analises', 'sst'],
    methodology: ['Hierarquia de controles NR-01', 'NR-17', 'Fundacentro'],
    entityRefs: options.entityRefs,
  });
}

/** Gera AET estruturada + PDF. */
export async function generateAET(tenantId, user, options = {}) {
  const taskPrompt =
    'Elabore uma Análise Ergonômica do Trabalho (AET) completa com as seções: ' +
    'introducao, caracterizacaoEmpresa, caracterizacaoAtividade, analiseErgonomica, fatoresBiomecanicos, ' +
    'fatoresCognitivos, fatoresOrganizacionais, diagnostico, recomendacoes, planoAcao, conclusao. ' +
    'Justifique cada diagnóstico. Retorne JSON com essas chaves (texto em cada uma).';

  const response = await runExpertTask({
    tenantId,
    user,
    action: 'GERAR_AET',
    taskPrompt,
    modules: options.modules ?? ['aet', 'analises', 'org', 'inventario', 'historico'],
    methodology: ['AET', 'NR-17', 'Fundacentro', 'RULA', 'REBA'],
    entityRefs: options.entityRefs,
    maxTokens: 6000,
  });

  const sections = sectionsFromStructured(response.analysis, response.analysis?.narrative, [
    { key: 'introducao', title: '1. Introdução' },
    { key: 'caracterizacaoEmpresa', title: '2. Caracterização da Empresa' },
    { key: 'caracterizacaoAtividade', title: '3. Caracterização da Atividade' },
    { key: 'analiseErgonomica', title: '4. Análise Ergonômica' },
    { key: 'fatoresBiomecanicos', title: '5. Fatores Biomecânicos' },
    { key: 'fatoresCognitivos', title: '6. Fatores Cognitivos' },
    { key: 'fatoresOrganizacionais', title: '7. Fatores Organizacionais' },
    { key: 'diagnostico', title: '8. Diagnóstico' },
    { key: 'recomendacoes', title: '9. Recomendações' },
    { key: 'planoAcao', title: '10. Plano de Ação' },
    { key: 'conclusao', title: '11. Conclusão' },
  ]);

  response.pdf = await buildPdfResponse({
    title: 'Análise Ergonômica do Trabalho — ErgoSense AI Expert',
    subtitle: `Tenant ${tenantId} · ${new Date().toLocaleDateString('pt-BR')}`,
    sections,
    disclaimer: AI_DISCLAIMER,
  });

  return response;
}

/** Inventário de riscos NR-01 assistido por IA. */
export async function generateRiskInventory(tenantId, user, options = {}) {
  const taskPrompt =
    'Elabore proposta de Inventário de Riscos conforme NR-01 §1.5.4.4.2.2. ' +
    'Identifique perigos, classifique riscos (probabilidade, severidade, nível), justifique cada classificação ' +
    'e preencha campos NR-01: tipo, fonte geradora, perigo, consequência, exposição, medidas existentes, medidas propostas. ' +
    'Retorne JSON: { itens: [{ tipo, fonteGeradora, perigo, consequencia, probabilidade, severidade, nivel, justificativa, medidasExistentes, medidasPropostas }] }.';

  return runExpertTask({
    tenantId,
    user,
    action: 'GERAR_INVENTARIO',
    taskPrompt,
    modules: options.modules ?? ['inventario', 'gro', 'analises', 'psicossocial', 'sst', 'org'],
    methodology: ['NR-01', 'Matriz de risco', 'Critérios GRO'],
    entityRefs: options.entityRefs,
    maxTokens: 6000,
  });
}

/** PGR integrado: inventário, plano, cronograma, indicadores. */
export async function generatePGR(tenantId, user, options = {}) {
  const taskPrompt =
    'Monte proposta de Programa de Gerenciamento de Riscos (PGR) integrado ao GRO. ' +
    'Inclua: inventarioResumo, planoAcao, cronograma, indicadores, medidasControle. ' +
    'Justifique prioridades e relacione com NR-01. Retorne JSON estruturado.';

  return runExpertTask({
    tenantId,
    user,
    action: 'GERAR_PGR',
    taskPrompt,
    modules: options.modules ?? ['pgr', 'gro', 'inventario', 'sst', 'compliance'],
    methodology: ['PGR', 'GRO', 'NR-01', 'Ciclo PDCA'],
    entityRefs: options.entityRefs,
    maxTokens: 6000,
  });
}

export async function generateExecutiveReport(tenantId, user, options = {}) {
  const taskPrompt =
    'Elabore relatório executivo de SST para diretoria: resumo, principais riscos, conformidade, investimentos prioritários e KPIs. ' +
    'Justifique conclusões. Retorne JSON: { resumoExecutivo, principaisRiscos, conformidade, prioridades, kpis }.';

  return runExpertTask({
    tenantId,
    user,
    action: 'RELATORIO_EXECUTIVO',
    taskPrompt,
    modules: options.modules ?? ['all'],
    methodology: ['Visão integrada SST', 'NR-01', 'NR-17'],
    entityRefs: options.entityRefs,
  });
}

export async function generateTechnicalReport(tenantId, user, options = {}) {
  const taskPrompt =
    'Elabore relatório técnico detalhado com fundamentação normativa, metodologias aplicadas (RULA, REBA, NIOSH, OWAS), ' +
    'evidências dos dados e recomendações técnicas. Retorne JSON estruturado ou texto técnico longo.';

  return runExpertTask({
    tenantId,
    user,
    action: 'RELATORIO_TECNICO',
    taskPrompt,
    modules: options.modules ?? ['all'],
    methodology: ['RULA', 'REBA', 'OWAS', 'NIOSH', 'ISO 11226', 'Fundacentro'],
    entityRefs: options.entityRefs,
    maxTokens: 6000,
  });
}

export async function generateAuditReport(tenantId, user, options = {}) {
  const taskPrompt =
    'Elabore relatório de auditoria SST: escopo, critérios, achados, evidências, não conformidades, oportunidades de melhoria. ' +
    'Retorne JSON estruturado.';

  return runExpertTask({
    tenantId,
    user,
    action: 'RELATORIO_AUDITORIA',
    taskPrompt,
    modules: options.modules ?? ['sst', 'compliance', 'gro', 'pgr', 'historico'],
    methodology: ['Auditoria SST', 'ISO 45001', 'NR-01'],
    entityRefs: options.entityRefs,
  });
}

export async function generateComplianceReport(tenantId, user, options = {}) {
  const taskPrompt =
    'Avalie conformidade legal e normativa: NR-01, NR-17, GRO, PGR, Psicossocial, eSocial. ' +
    'Liste conformidades, não conformidades, riscos legais e prioridades de adequação. ' +
    'Retorne JSON: { conformidades, naoConformidades, riscosLegais, prioridades }.';

  return runExpertTask({
    tenantId,
    user,
    action: 'RELATORIO_COMPLIANCE',
    taskPrompt,
    modules: options.modules ?? ['compliance', 'pgr', 'gro', 'psicossocial', 'inventario'],
    methodology: ['Compliance NR-01/NR-17', 'eSocial', 'Guia MTE Psicossocial'],
    entityRefs: options.entityRefs,
  });
}

/** Análise psicossocial integrada. */
export async function analyzePsicossocial(tenantId, user, options = {}) {
  const basePrompt =
    'Analise dados psicossociais: questionários, tendências, fatores críticos, denúncias e indicadores. ' +
    'Gere recomendações organizacionais justificadas (NR-01, Guia MTE 2025). ' +
    'Retorne JSON: { diagnostico, fatoresCriticos, tendencias, recomendacoesOrganizacionais }.';
  const taskPrompt = options.prompt?.trim() ? `${options.prompt.trim()}\n\n${basePrompt}` : basePrompt;

  return runExpertTask({
    tenantId,
    user,
    action: 'ANALISE_PSICOSSOCIAL',
    taskPrompt,
    modules: options.modules ?? ['psicossocial', 'denuncias', 'inventario', 'historico'],
    methodology: ['Guia MTE 2025', 'NR-01 Psicossocial', 'ISO 45003'],
    entityRefs: options.entityRefs,
  });
}

/** Auditor virtual — nota, gaps, plano de adequação. */
export async function runVirtualAudit(tenantId, user, options = {}) {
  const taskPrompt =
    'Execute auditoria virtual integrada do tenant. Gere: notaConformidade (0-100), evidencias, gaps, planoAdequacao. ' +
    'Fundamente cada gap em norma e dado observado. Retorne JSON estruturado.';

  const response = await runExpertTask({
    tenantId,
    user,
    action: 'AUDITORIA_VIRTUAL',
    taskPrompt,
    modules: options.modules ?? ['all'],
    methodology: ['Auditoria virtual SST', 'NR-01', 'NR-17', 'GRO', 'PGR'],
    entityRefs: options.entityRefs,
    maxTokens: 6000,
  });

  if (response.analysis?.notaConformidade != null) {
    response.complianceScore = Number(response.analysis.notaConformidade);
  }

  return response;
}

/** Consulta livre ao especialista virtual. */
export async function askExpert(tenantId, user, { prompt, modules, entityRefs } = {}) {
  if (!prompt?.trim()) throw new Error('Prompt obrigatório.');
  return runExpertTask({
    tenantId,
    user,
    action: 'CONSULTA',
    taskPrompt: prompt.trim(),
    modules: modules ?? DEFAULT_MODULES,
    methodology: ['Consulta especializada ErgoSense AI Expert'],
    entityRefs,
  });
}

/** Delegação para generateRecommendations com contexto completo. */
export async function expertRecommendations(tenantId, user, options = {}) {
  assertAiAvailable();
  const { context, dataSources } = await assembleTenantContext(tenantId, {
    modules: options.modules ?? ['analises', 'inventario', 'aet'],
  });
  const result = await generateRecommendations({ ...context, options: { maxTokens: 4096, systemPrompt: EXPERT_SYSTEM_PROMPT } });
  const structured = tryParseJson(result.text);
  const response = wrapExpertResponse({
    action: 'RECOMENDACOES',
    provider: result.provider,
    text: result.text,
    structured,
    dataSources,
    methodology: ['Recomendações ergonômicas', 'Hierarquia de controles'],
  });
  await logAiExpertAudit({
    tenantId,
    action: 'RECOMENDACOES',
    user,
    prompt: 'Recomendações ergonômicas',
    dataSources,
    resultSummary: result.text?.slice(0, 2000),
  });
  return response;
}

/** Delegação para generateRiskAnalysis com contexto completo. */
export async function expertRiskAnalysis(tenantId, user, options = {}) {
  assertAiAvailable();
  const { context, dataSources } = await assembleTenantContext(tenantId, {
    modules: options.modules ?? ['inventario', 'gro', 'pgr', 'sst'],
  });
  const result = await generateRiskAnalysis({ ...context, options: { maxTokens: 4096, systemPrompt: EXPERT_SYSTEM_PROMPT } });
  const structured = tryParseJson(result.text);
  const response = wrapExpertResponse({
    action: 'ANALISE_RISCO',
    provider: result.provider,
    text: result.text,
    structured,
    dataSources,
    methodology: ['NR-01', 'Matriz de risco', 'Inventário ocupacional'],
  });
  await logAiExpertAudit({
    tenantId,
    action: 'ANALISE_RISCO',
    user,
    prompt: 'Análise de riscos ocupacionais',
    dataSources,
    resultSummary: result.text?.slice(0, 2000),
  });
  return response;
}

/** Instrução de Trabalho (IT) ergonômica derivada da AET / análise. */
export async function generateWorkInstruction(tenantId, user, options = {}) {
  const aetBlock = options.aetSummary
    ? `\n\n--- CONTEÚDO DA AET ---\n${options.aetSummary}`
    : '';
  const taskPrompt =
    (options.prompt?.trim()
      ? `${options.prompt.trim()}\n\n`
      : '') +
    'Elabore uma Instrução de Trabalho (IT) ergonômica conforme NR-17, derivada da análise/AET. ' +
    'Inclua: objetivo, procedimento passo a passo, posturas corretas, uso de mobiliário/equipamentos, alertas de risco, EPI quando aplicável, frequência de pausas. ' +
    'Retorne JSON: { titulo, objetivo, procedimentos: string[], posturasCorretas, equipamentos, alertas: string[], epi, pausas, revisao }. ' +
    aetBlock;

  const response = await runExpertTask({
    tenantId,
    user,
    action: 'GERAR_IT',
    taskPrompt,
    modules: options.modules ?? ['analises', 'aet', 'org', 'inventario'],
    methodology: ['Instrução de Trabalho', 'NR-17', 'Fundacentro'],
    entityRefs: options.entityRefs,
    maxTokens: 4096,
  });

  const sections = sectionsFromStructured(response.analysis, response.analysis?.narrative, [
    { key: 'objetivo', title: '1. Objetivo' },
    { key: 'procedimentos', title: '2. Procedimento' },
    { key: 'posturasCorretas', title: '3. Posturas corretas' },
    { key: 'equipamentos', title: '4. Equipamentos e mobiliário' },
    { key: 'alertas', title: '5. Alertas de risco' },
    { key: 'epi', title: '6. EPI' },
    { key: 'pausas', title: '7. Pausas e organização' },
    { key: 'revisao', title: '8. Revisão' },
  ]);

  response.pdf = await buildPdfResponse({
    title: 'Instrução de Trabalho (IT) — ErgoSense AI Expert',
    subtitle: `Tenant ${tenantId} · ${new Date().toLocaleDateString('pt-BR')}`,
    sections,
    disclaimer: AI_DISCLAIMER,
  });

  return response;
}

export { assembleTenantContext };
